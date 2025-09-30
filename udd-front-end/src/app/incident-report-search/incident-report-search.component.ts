import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IncidentReportService } from '../service/incident-report.service';
import { IncidentReport } from '../model/incident-report.model';
import { SafeHtmlPipe } from '../shared/pipes/safe.html.pipe';
import { getKeycloak } from '../auth/keycloak.init';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-incident-report-search',
  imports: [ReactiveFormsModule, SafeHtmlPipe, CommonModule],
  templateUrl: './incident-report-search.component.html',
  styleUrl: './incident-report-search.component.css'
})
export class IncidentReportSearchComponent {
  form!: FormGroup;

  loading = false;
  error: string | null = null;
  results: IncidentReport[] = [];

  constructor(private fb: FormBuilder, private api: IncidentReportService) {
    this.form = this.fb.group({
      query: [],
      searchType: ['simple']
    });
  }

  submit() {
    this.error = null;
    this.results = [];

    const raw = (this.form.value.query ?? '').trim();
    const keywords = this.parseKeywords(raw);

    const kc = getKeycloak();
    const accessToken = kc.token;

    console.log('access token: ', accessToken);

    if (!keywords.length) {
      this.error = 'Please enter at least one keyword.';
      return;
    }

    this.loading = true;
    this.api.searchSimple(keywords).subscribe({
      next: (data) => { this.results = data ?? []; this.loading = false; },
      error: (err) => { this.error = err?.error?.message || 'Search failed. Check the server/CORS.'; this.loading = false; }
    });
  }

  clear() {
    this.form.reset({ query: '', searchType: 'simple' }, { emitEvent: false });
    this.results = [];
    this.error = null;
    this.loading = false;
  }

  /** Parsira: "fraza u navodnicima", 'fraza', ili pojedinačne reči/znake odvojene zarezima/razmacima/novim redom. */
  private parseKeywords(raw: string): string[] {
    const re = /"([^"]+)"|'([^']+)'|[^,\s]+/g;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const token = (m[1] ?? m[2] ?? m[0]).trim();
      if (token) out.push(token);
    }
    return out;
  }

  /** Bezbedno pravi isečke oko svih <em class="highlight">…</em> u datom HTML-u. */
  private dynamicSnippetsSafe(html: string | null | undefined, radius = 60, maxChunks = 2): string[] {
    const src = html ?? '';
    if (!src) return [];

    const OPEN = '[[[HL_OPEN]]]';
    const CLOSE = '[[[HL_CLOSE]]]';

    // 1) Sačuvaj highlight tagove markerima
    let s = src
      .replace(/<em\s+class=["']highlight["']>/g, OPEN)
      .replace(/<\/em>/g, CLOSE);

    // 2) Ukloni ostale HTML tagove
    s = s.replace(/<(?:.|\n)*?>/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();

    // 3) Skupi parove (OPEN→CLOSE)
    const pairs: Array<{ open: number; close: number }> = [];
    let seek = 0;
    while (true) {
      const o = s.indexOf(OPEN, seek);
      if (o === -1) break;
      const c = s.indexOf(CLOSE, o + OPEN.length);
      if (c === -1) break;
      pairs.push({ open: o, close: c });
      seek = c + CLOSE.length;
    }

    if (!pairs.length) {
      const cut = s.length > radius * 2 ? s.slice(0, radius * 2) + '…' : s;
      return [cut];
    }

    // 4) Opsezi koji obuhvataju ceo highlight + kontekst
    type Range = { start: number; end: number };
    const ranges: Range[] = pairs.slice(0, maxChunks).map(({ open, close }) => ({
      start: Math.max(0, open - radius),
      end: Math.min(s.length, close + CLOSE.length + radius)
    }));

    // 5) Spoji preklapanja
    ranges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    for (const r of ranges) {
      if (!merged.length || r.start > merged[merged.length - 1].end + 5) {
        merged.push({ ...r });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
      }
    }

    // 6) Vrati isečke (sa vraćenim <em> tagovima)
    return merged.map(({ start, end }) => {
      let chunk = s.slice(start, end);
      if (start > 0) chunk = '… ' + chunk;
      if (end < s.length) chunk = chunk + ' …';
      return chunk
        .replaceAll(OPEN, '<em class="highlight">')
        .replaceAll(CLOSE, '</em>');
    });
  }

  /**
   * Vraća SVE isečke iz SVIH polja koja imaju highlight.
   * Kratka polja: manji radius; content: veći radius i više isečaka.
   */
  getAllDynamicSummaries(r: IncidentReport): string[] {
    const out: string[] = [];

    const shortFields: Array<{ key: keyof IncidentReport; radius: number; maxChunks: number }> = [
      { key: 'employeeFullName',         radius: 20, maxChunks: 2 },
      { key: 'attackedOrganizationName', radius: 20, maxChunks: 2 },
      { key: 'securityOrganizationName', radius: 20, maxChunks: 2 },
      { key: 'severity',                 radius: 10, maxChunks: 1 },
    ];
    for (const { key, radius, maxChunks } of shortFields) {
      const v = (r as any)[key] as string | undefined;
      if (typeof v === 'string' && v.includes('class="highlight"')) {
        out.push(...this.dynamicSnippetsSafe(v, radius, maxChunks));
      }
    }

    const c = (r as any)['content'] as string | undefined;
    if (typeof c === 'string' && c.includes('class="highlight"')) {
      out.push(...this.dynamicSnippetsSafe(c, 80, 10)); // više pogodaka iz sadržaja
    }

    if (!out.length) {
      out.push(...this.dynamicSnippetsSafe(r.content ?? r.employeeFullName ?? '', 80, 1));
    }

    // (opciono) ukloni duplikate identičnih isečaka:
    return Array.from(new Set(out));
  }
}
// + add import Validators if not already
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IncidentReportService } from '../service/incident-report.service';
import { IncidentReport } from '../model/incident-report.model';
import { SafeHtmlPipe } from '../shared/pipes/safe.html.pipe';
import { getKeycloak } from '../auth/keycloak.init';
import { CommonModule } from '@angular/common';
import { SearchQuery } from '../model/search-query.model';

type ForcedType = 'knn' | 'geoSearch' | null; // null = AUTO

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

  // ➕ zapamti koja je pretraga poslata (da bi UI znao kako da renderuje)
  lastSearchType: 'knn' | 'geoSearch' | 'boolean' | 'simple' | null = null;

  constructor(private fb: FormBuilder, private api: IncidentReportService) {
    this.form = this.fb.group({
      query: ['', Validators.required],
      searchType: [null as ForcedType] // null => AUTO (simple/boolean)
    });
  }

  toggleRadio(which: Exclude<ForcedType, null>, ev: Event) {
    ev.preventDefault();
    const curr = this.form.value.searchType as ForcedType;
    this.form.patchValue({ searchType: curr === which ? null : which });
  }

  submit() {
    this.error = null;
    this.results = [];

    const raw = (this.form.value.query ?? '').trim();
    if (!raw) {
      this.error = 'Please enter a search query.';
      return;
    }

    this.loading = true;

    const forced = this.form.value.searchType as ForcedType;
    const autoType = this.isBooleanQuery(raw) ? 'boolean' : 'simple';
    const finalSearchType: 'knn' | 'geoSearch' | 'boolean' | 'simple' =
      (forced ?? autoType) as any;

    // ➕ zapamti za render
    this.lastSearchType = finalSearchType;

    let searchQuery: SearchQuery;
    if (finalSearchType === 'boolean') {
      searchQuery = { keywords: [], rawQuery: raw };
    } else {
      const keywords = this.parseKeywords(raw);
      if (!keywords.length) {
        this.error = 'Please enter at least one keyword.';
        this.loading = false;
        return;
      }
      searchQuery = { keywords, rawQuery: '' };
    }

    this.api.search(searchQuery, finalSearchType).subscribe({
      next: (data: IncidentReport[]) => {
        this.results = data ?? [];
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Search failed. Check the server/CORS.';
        this.loading = false;
      }
    });
  }

  private isBooleanQuery(raw: string): boolean {
    const booleanKeywords = /\b(AND|OR|NOT)\b/i;
    const hasQuotes = /["']/.test(raw);
    const hasParentheses = /[()]/.test(raw);
    return booleanKeywords.test(raw) || hasQuotes || hasParentheses;
  }

  clear() {
    this.form.reset({ query: '', searchType: null }, { emitEvent: false });
    this.results = [];
    this.error = null;
    this.loading = false;
    this.lastSearchType = null; // ➕
  }

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

  // ===== helperi za render (ostaju za ne-geo pretrage) =====

  private dynamicSnippetsSafe(html: string | null | undefined, radius = 60, maxChunks = 2): string[] {
    const src = html ?? '';
    if (!src) return [];
    const OPEN = '[[[HL_OPEN]]]';
    const CLOSE = '[[[HL_CLOSE]]]';
    let s = src
      .replace(/<em\s+class=["']highlight["']>/g, OPEN)
      .replace(/<\/em>/g, CLOSE);
    s = s.replace(/<(?:.|\n)*?>/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
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
    type Range = { start: number; end: number };
    const ranges: Range[] = pairs.slice(0, maxChunks).map(({ open, close }) => ({
      start: Math.max(0, open - radius),
      end: Math.min(s.length, close + CLOSE.length + radius)
    }));
    ranges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    for (const r of ranges) {
      if (!merged.length || r.start > merged[merged.length - 1].end + 5) {
        merged.push({ ...r });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
      }
    }
    return merged.map(({ start, end }) => {
      let chunk = s.slice(start, end);
      if (start > 0) chunk = '… ' + chunk;
      if (end < s.length) chunk = chunk + ' …';
      return chunk
        .replaceAll(OPEN, '<em class="highlight">')
        .replaceAll(CLOSE, '</em>');
    });
  }

  // default snippeti (za simple/boolean/knn)
  getAllDynamicSummaries(r: IncidentReport): string[] {
    if (this.lastSearchType === 'geoSearch') {
      // za geo prikaz radi se u template-u (adresu renderujemo direktno)
      return [];
    }

    const out: string[] = [];
    const shortFields: Array<{ key: keyof IncidentReport; radius: number; maxChunks: number }> = [
      { key: 'employeeFullName', radius: 20, maxChunks: 2 },
      { key: 'attackedOrganizationName', radius: 20, maxChunks: 2 },
      { key: 'securityOrganizationName', radius: 20, maxChunks: 2 },
      { key: 'severity', radius: 10, maxChunks: 1 },
      // ako želiš adresu i za ne-geo: otkomentariši sledeću liniju
      // { key: 'attackedOrganizationAddress', radius: 30, maxChunks: 2 },
    ];
    for (const { key, radius, maxChunks } of shortFields) {
      const v = (r as any)[key] as string | undefined;
      if (typeof v === 'string' && v.includes('class="highlight"')) {
        out.push(...this.dynamicSnippetsSafe(v, radius, maxChunks));
      }
    }
    const c = (r as any)['content'] as string | undefined;
    if (typeof c === 'string' && c.includes('class="highlight"')) {
      out.push(...this.dynamicSnippetsSafe(c, 80, 10));
    }
    if (!out.length) {
      out.push(...this.dynamicSnippetsSafe(r.content ?? r.employeeFullName ?? '', 80, 1));
    }
    return Array.from(new Set(out));
  }
}

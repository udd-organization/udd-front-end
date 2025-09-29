import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SeverityLevel } from '../model/severity-level.model';
import { IncidentReportService } from '../service/incident-report.service';
import { IncidentReport } from '../model/incident-report.model';
import { getKeycloak } from '../auth/keycloak.init';

export const SEVERITY_OPTIONS: SeverityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

@Component({
  selector: 'app-incident-report-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './incident-report-upload.component.html',
  styleUrls: ['./incident-report-upload.component.css'],
})
export class IncidentReportUploadComponent implements OnInit{
  
  ngOnInit(): void {
    const kc = getKeycloak();
    const idTokenParsed = kc.idTokenParsed;  
    const accessToken = kc.token;
    const username = kc.idTokenParsed?.['preferred_username'] ?? kc.tokenParsed?.['preferred_username'];

    console.log('id token parsed: ', idTokenParsed);
    console.log('access token: ', accessToken);
    console.log('username: ', username);
  }

  private fb = inject(FormBuilder);
  private api = inject(IncidentReportService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  severityOptions = SEVERITY_OPTIONS;

  form = this.fb.group({
    employeeFullName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    securityOrganizationName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    attackedOrganizationName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    severity: this.fb.control<SeverityLevel>('MEDIUM', [Validators.required]),
    attackedOrganizationAddress: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
    content: this.fb.control<string | null>(''),
  });

  selectedFile?: File;
  parsed = false;
  loading = false;
  error?: string;
  success?: string;

  get f() { return this.form.controls; }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.error = this.success = undefined;
    }
  }

  parse() {
    if (!this.selectedFile) {
      this.error = 'Please choose a file to parse.';
      return;
    }
    this.loading = true;
    this.error = this.success = undefined;

    this.api.parse(this.selectedFile).subscribe({
      next: (dto) => {
        this.form.patchValue({
          employeeFullName: dto.employeeFullName ?? '',
          securityOrganizationName: dto.securityOrganizationName ?? '',
          attackedOrganizationName: dto.attackedOrganizationName ?? '',
          severity: dto.severity ?? 'MEDIUM',
          attackedOrganizationAddress: dto.attackedOrganizationAddress ?? '',
          content: dto.content ?? '',
        });
        this.parsed = true;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.error = typeof e === 'string' ? e : (e?.message ?? 'Request failed');
      },
    });
  }

  confirm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedFile) {
      this.error = 'Please attach the PDF file before confirming.';
      return;
    }

    this.loading = true;
    this.error = this.success = undefined;

    const payload = this.form.getRawValue() as IncidentReport;

    this.api.confirm(this.selectedFile, payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Incident report uploaded and saved successfully.';

        this.resetAll();
      },
      error: (e) => {
        this.loading = false;
        this.error = typeof e === 'string' ? e : (e?.message ?? 'Request failed');
      },
    });
  }

  resetAll() {
    this.form.reset({
      employeeFullName: '',
      securityOrganizationName: '',
      attackedOrganizationName: '',
      severity: 'MEDIUM' as SeverityLevel,
      attackedOrganizationAddress: '',
      content: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.selectedFile = undefined;
    this.fileInput?.nativeElement && (this.fileInput.nativeElement.value = '');

    this.parsed = false;
    this.error = this.success = undefined;
  }
}
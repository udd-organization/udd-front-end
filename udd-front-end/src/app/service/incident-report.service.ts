import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../env/environment';
import { IncidentReport } from '../model/incident-report.model';
import { SearchQuery } from '../model/search-query.model';

@Injectable({
  providedIn: 'root',
})
export class IncidentReportService {
  private readonly api = environment.apiHost;

  constructor(private http: HttpClient) { }

  parse(file: File): Observable<IncidentReport> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<IncidentReport>(`${this.api}incident-reports/upload/parse`, form);
  }

  /* confirm(file: File, incidentReport: IncidentReport): Observable<IncidentReport> {
     const form = new FormData();
     form.append('file', file);
     form.append('metadata', new Blob([JSON.stringify(incidentReport)], { type: 'application/json' }));
     return this.http.post<IncidentReport>(`${this.api}incident-reports/upload/confirm`, form);
   }*/

  confirm(file: File, incidentReport: IncidentReport): Observable<IncidentReport> {
    const form = new FormData();
    form.append('file', file, file.name);

    const dto = {
      employeeFullName: incidentReport.employeeFullName?.trim() ?? '',
      securityOrganizationName: incidentReport.securityOrganizationName?.trim() ?? '',
      attackedOrganizationName: incidentReport.attackedOrganizationName?.trim() ?? '',
      severity: (incidentReport.severity as string)?.trim().toUpperCase(),
      attackedOrganizationAddress: incidentReport.attackedOrganizationAddress?.trim() ?? '',
      content: incidentReport.content ?? ''
    };

    form.append(
      'metadata',
      new Blob([JSON.stringify(dto)], { type: 'application/json; charset=UTF-8' })
    );

    return this.http.post<IncidentReport>(`${this.api}incident-reports/upload/confirm`, form);
  }

  search(searchQuery: SearchQuery, searchType: string): Observable<IncidentReport[]> {
    return this.http.post<IncidentReport[]>(`${this.api}incident-reports/search/${searchType}`, searchQuery)
  }
}
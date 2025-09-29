import { Routes } from '@angular/router';
import { HomepageComponent } from './homepage/homepage.component';
import { IncidentReportUploadComponent } from './incident-report-upload/incident-report-upload.component';

export const routes: Routes = [
    { path: '', component: HomepageComponent },
    { path: 'incident-reports-upload', component: IncidentReportUploadComponent}
];
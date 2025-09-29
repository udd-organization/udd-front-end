import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentReportUploadComponent } from './incident-report-upload.component';

describe('IncidentReportUploadComponent', () => {
  let component: IncidentReportUploadComponent;
  let fixture: ComponentFixture<IncidentReportUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentReportUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentReportUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentReportSearchComponent } from './incident-report-search.component';

describe('IncidentReportSearchComponent', () => {
  let component: IncidentReportSearchComponent;
  let fixture: ComponentFixture<IncidentReportSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentReportSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentReportSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

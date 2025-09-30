import { SeverityLevel } from "./severity-level.model";

export interface IncidentReport  {
  employeeFullName: string;
  securityOrganizationName: string;
  attackedOrganizationName: string;
  severity: SeverityLevel;
  attackedOrganizationAddress: string;
  content: string | null;
  filename: string | null;
}
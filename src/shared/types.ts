export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ClockifySession {
  apiKeyPresent: boolean;
  userEmail?: string;
  userTimeZone?: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface ExportRequest {
  workspaceId: string;
  workspaceName: string;
  fromDate: string;
  toDate: string;
  format: ExportFormat;
}

export interface UserPreferences {
  lastWorkspaceId?: string;
  lastExportFormat?: ExportFormat;
}

export interface DetailedEntryRow {
  id: string;
  userName: string;
  clientName: string;
  projectName: string;
  taskName: string;
  description: string;
  tagNames: string;
  billable: boolean;
  start: string;
  end: string;
  durationSeconds: number;
}

export interface ClockifyTag {
  name: string;
}

export interface ClockifyTimeInterval {
  start: string;
  end: string;
  duration: string | number;
  timeZone?: string;
  zonedStart?: string;
  zonedEnd?: string;
}

export interface ClockifyDetailedTimeEntry {
  id: string;
  userName: string | null;
  clientName: string | null;
  projectName: string | null;
  taskName: string | null;
  description: string | null;
  tags: ClockifyTag[];
  billable: boolean;
  timeInterval: ClockifyTimeInterval;
}

export interface ClockifyReportTotal {
  totalTime?: number;
}

export interface ClockifyDetailedReportResponse {
  totals: ClockifyReportTotal[];
  timeentries: ClockifyDetailedTimeEntry[];
}

export interface DetailedReportQuery {
  apiKey: string;
  workspaceId: string;
  fromDate: string;
  toDate: string;
  userTimeZone: string;
}

import type {
  ClockifySession,
  ExportRequest,
  UserPreferences,
  WorkspaceOption
} from '@shared/types';

export interface WorkspacePayload {
  session: ClockifySession;
  workspaces: WorkspaceOption[];
  preferences: UserPreferences;
}

export interface ExportSuccessResult {
  kind: 'success';
  path: string;
  recordCount: number;
}

export interface OverlapRecordSummary {
  id: string;
  projectName: string;
  description: string;
  start: string;
  end: string;
}

export interface ExportOverlap {
  date: string;
  userName: string;
  overlapSeconds: number;
  first: OverlapRecordSummary;
  second: OverlapRecordSummary;
}

export interface ExportValidationResult {
  kind: 'validation-error';
  message: string;
  fixUrl: string;
  overlaps: ExportOverlap[];
}

export type ExportResult = ExportSuccessResult | ExportValidationResult;

export interface ClockifyDesktopApi {
  getSession(): Promise<ClockifySession>;
  validateAndStoreApiKey(apiKey: string): Promise<ClockifySession>;
  clearApiKey(): Promise<ClockifySession>;
  getWorkspaces(): Promise<WorkspacePayload>;
  exportDetailedReport(request: ExportRequest): Promise<ExportResult | null>;
  openFile(path: string): Promise<void>;
  openFolder(path: string): Promise<void>;
  copyText(text: string): Promise<void>;
  fitWindowToContent(): Promise<void>;
}

export const IPC_CHANNELS = {
  authGetSession: 'auth:get-session',
  authValidateAndStoreApiKey: 'auth:validate-and-store-api-key',
  authClearApiKey: 'auth:clear-api-key',
  clockifyGetWorkspaces: 'clockify:get-workspaces',
  clockifyExportDetailedReport: 'clockify:export-detailed-report',
  desktopOpenFile: 'desktop:open-file',
  desktopOpenFolder: 'desktop:open-folder',
  desktopCopyText: 'desktop:copy-text',
  windowFitContent: 'window:fit-content'
} as const;

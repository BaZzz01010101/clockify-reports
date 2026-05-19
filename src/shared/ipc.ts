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

export interface ExportResult {
  path: string;
  recordCount: number;
}

export interface ClockifyDesktopApi {
  getSession(): Promise<ClockifySession>;
  validateAndStoreApiKey(apiKey: string): Promise<ClockifySession>;
  clearApiKey(): Promise<ClockifySession>;
  getWorkspaces(): Promise<WorkspacePayload>;
  exportDetailedReport(request: ExportRequest): Promise<ExportResult | null>;
}

export const IPC_CHANNELS = {
  authGetSession: 'auth:get-session',
  authValidateAndStoreApiKey: 'auth:validate-and-store-api-key',
  authClearApiKey: 'auth:clear-api-key',
  clockifyGetWorkspaces: 'clockify:get-workspaces',
  clockifyExportDetailedReport: 'clockify:export-detailed-report'
} as const;

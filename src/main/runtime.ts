import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dialog } from 'electron';
import { ElectronFileGateway } from './fileGateway';
import { ClockifyApiError, ClockifyClient } from './services/clockifyClient';
import { ClockifyExporterService, type FileGateway } from './services/clockifyExporterService';
import { KeytarCredentialStore, type CredentialStore } from './services/credentialStore';
import { JsonPreferencesStore, type PreferencesStore } from './services/preferencesStore';
import type {
  ClockifyDetailedReportResponse,
  ClockifySession,
  DetailedReportQuery,
  UserPreferences,
  WorkspaceOption,
} from '../shared/types';

export const CLOCKIFY_EXPORTER_SMOKE_MODE_ENV = 'CLOCKIFY_EXPORTER_SMOKE_MODE';
export const CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR_ENV = 'CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR';

interface RuntimeOptions {
  userDataPath: string;
  dialog: Pick<Dialog, 'showSaveDialog'>;
  env?: NodeJS.ProcessEnv;
}

export const createClockifyExporterService = ({
  userDataPath,
  dialog,
  env = process.env,
}: RuntimeOptions): ClockifyExporterService => {
  if (env[CLOCKIFY_EXPORTER_SMOKE_MODE_ENV] === '1') {
    return new ClockifyExporterService({
      client: new SmokeClockifyClient(),
      credentialStore: new InMemoryCredentialStore(),
      preferencesStore: new InMemoryPreferencesStore(),
      fileGateway: new AutomaticFileGateway(
        env[CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR_ENV] ?? path.join(userDataPath, 'smoke-exports'),
      ),
    });
  }

  return new ClockifyExporterService({
    client: new ClockifyClient(),
    credentialStore: new KeytarCredentialStore(),
    preferencesStore: new JsonPreferencesStore(path.join(userDataPath, 'preferences.json')),
    fileGateway: new ElectronFileGateway(dialog),
  });
};

class InMemoryCredentialStore implements CredentialStore {
  private apiKey: string | null = null;

  public async getApiKey(): Promise<string | null> {
    return this.apiKey;
  }

  public async saveApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
  }

  public async clearApiKey(): Promise<void> {
    this.apiKey = null;
  }
}

class InMemoryPreferencesStore implements PreferencesStore {
  private preferences: UserPreferences = {};

  public async read(): Promise<UserPreferences> {
    return this.preferences;
  }

  public async write(next: UserPreferences): Promise<void> {
    this.preferences = {
      ...this.preferences,
      ...next,
    };
  }
}

class AutomaticFileGateway implements FileGateway {
  public constructor(private readonly outputDirectory: string) {}

  public async saveExport(payload: { suggestedFileName: string; format: string; buffer: Buffer }): Promise<string> {
    const exportPath = path.join(this.outputDirectory, payload.suggestedFileName);

    await fs.mkdir(this.outputDirectory, { recursive: true });
    await fs.writeFile(exportPath, payload.buffer);

    return exportPath;
  }
}

class SmokeClockifyClient {
  public async validateApiKey(apiKey: string): Promise<ClockifySession> {
    assertApiKey(apiKey);

    return {
      apiKeyPresent: true,
      userEmail: 'smoke.user@example.com',
      userTimeZone: 'Europe/Madrid',
    };
  }

  public async getWorkspaces(apiKey: string): Promise<WorkspaceOption[]> {
    assertApiKey(apiKey);

    return [{ id: 'smoke-workspace', name: 'Smoke Workspace' }];
  }

  public async getDetailedReport(query: DetailedReportQuery): Promise<ClockifyDetailedReportResponse> {
    assertApiKey(query.apiKey);

    return {
      totals: [{ totalTime: 1800 }],
      timeentries: [
        {
          id: 'entry-1',
          userName: 'Smoke Tester',
          clientName: 'Clockify Clone',
          projectName: 'Desktop Exporter',
          taskName: 'Smoke Run',
          description: `Exported ${query.fromDate} to ${query.toDate}`,
          tags: [{ name: 'Smoke' }],
          billable: false,
          timeInterval: {
            start: '2026-05-04T08:00:00.000Z',
            end: '2026-05-04T08:30:00.000Z',
            duration: 'PT30M',
          },
        },
      ],
    };
  }
}

const assertApiKey = (apiKey: string): void => {
  if (apiKey.trim()) {
    return;
  }

  throw new ClockifyApiError('Invalid Clockify API key', 'INVALID_API_KEY', false, 401);
};

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CLOCKIFY_EXPORTER_SMOKE_MODE_ENV,
  CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR_ENV,
  createClockifyExporterService,
} from '../../src/main/runtime';

describe('createClockifyExporterService', () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(cleanupPaths.splice(0).map((targetPath) => fs.rm(targetPath, { recursive: true, force: true })));
  });

  it('provides an in-memory smoke-mode service that exports files without OS dialogs', async () => {
    const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'clockify-reports-userdata-'));
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clockify-reports-output-'));

    cleanupPaths.push(userDataPath, outputDir);

    const service = createClockifyExporterService({
      userDataPath,
      dialog: {
        showSaveDialog: async () => {
          throw new Error('showSaveDialog should not be called in smoke mode');
        },
      },
      env: {
        [CLOCKIFY_EXPORTER_SMOKE_MODE_ENV]: '1',
        [CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR_ENV]: outputDir,
      },
    });

    await expect(service.getSession()).resolves.toEqual({
      apiKeyPresent: false,
    });

    await expect(service.validateAndStoreApiKey('smoke-key')).resolves.toEqual({
      apiKeyPresent: true,
      userEmail: 'smoke.user@example.com',
      userTimeZone: 'Europe/Madrid',
    });

    await expect(service.getWorkspaces()).resolves.toEqual({
      session: {
        apiKeyPresent: true,
        userEmail: 'smoke.user@example.com',
        userTimeZone: 'Europe/Madrid',
      },
      workspaces: [{ id: 'smoke-workspace', name: 'Smoke Workspace' }],
      preferences: {},
    });

    const exportResult = await service.exportDetailedReport({
      workspaceId: 'smoke-workspace',
      workspaceName: 'Smoke Workspace',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      format: 'csv',
    });

    expect(exportResult).toEqual({
      kind: 'success',
      path: path.join(outputDir, 'clockify-detailed-smoke-workspace-2026-05-04-2026-05-10.csv'),
      recordCount: 1,
    });

    const exportedCsv = await fs.readFile(
      exportResult && exportResult.kind === 'success' ? exportResult.path : '',
      'utf8',
    );
    expect(exportedCsv).toContain('entry-1');

    await expect(service.getWorkspaces()).resolves.toEqual({
      session: {
        apiKeyPresent: true,
        userEmail: 'smoke.user@example.com',
        userTimeZone: 'Europe/Madrid',
      },
      workspaces: [{ id: 'smoke-workspace', name: 'Smoke Workspace' }],
      preferences: {
        lastWorkspaceId: 'smoke-workspace',
        lastExportFormat: 'csv',
      },
    });
  });
});

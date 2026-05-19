import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

test('connects in smoke mode and exports a CSV report', async () => {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'clockify-reports-smoke-'));
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
    CLOCKIFY_EXPORTER_SMOKE_MODE: '1',
    CLOCKIFY_EXPORTER_SMOKE_OUTPUT_DIR: outputDirectory,
  };

  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    args: ['.'],
    cwd: path.resolve(__dirname, '../..'),
    env,
  });

  try {
    const window = await app.firstWindow();

    await expect(window.getByText(/clockify reports/i)).toBeVisible();

    await window.getByLabel('API key').fill('smoke-key');
    await window.getByRole('button', { name: 'Connect' }).click();

    await expect(window.getByText('smoke.user@example.com')).toBeVisible();

    await window.getByRole('combobox', { name: 'Format' }).click();
    await window.getByRole('option', { name: 'CSV' }).click();
    await window.getByText('Last week').click();
    await window.getByRole('button', { name: 'Export report' }).click();

    await expect(window.getByText(/last export/i)).toBeVisible();
    await expect(window.getByText(/^clockify-detailed-smoke-workspace-2026-05-11-2026-05-17\.csv$/i)).toBeVisible();

    const exportedFiles = await fs.readdir(outputDirectory);

    expect(exportedFiles).toEqual(['clockify-detailed-smoke-workspace-2026-05-11-2026-05-17.csv']);

    const exportedCsv = await fs.readFile(path.join(outputDirectory, exportedFiles[0]), 'utf8');

    expect(exportedCsv).toContain('entry-1');
    expect(exportedCsv).toContain('Smoke Tester');
  } finally {
    await app.close();
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonPreferencesStore } from '@main/services/preferencesStore';

describe('JsonPreferencesStore', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirectories.map((directory) => fs.rm(directory, { recursive: true, force: true })));
    tempDirectories.length = 0;
  });

  it('returns empty preferences when the file does not exist', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'clockify-reports-'));
    tempDirectories.push(directory);

    const store = new JsonPreferencesStore(path.join(directory, 'preferences.json'));

    await expect(store.read()).resolves.toEqual({});
  });

  it('merges and persists updates', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'clockify-reports-'));
    tempDirectories.push(directory);

    const store = new JsonPreferencesStore(path.join(directory, 'preferences.json'));

    await store.write({
      lastWorkspaceId: 'ws-1'
    });
    await store.write({
      lastExportFormat: 'xlsx'
    });

    await expect(store.read()).resolves.toEqual({
      lastWorkspaceId: 'ws-1',
      lastExportFormat: 'xlsx'
    });
  });
});

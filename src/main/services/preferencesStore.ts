import fs from 'node:fs/promises';
import path from 'node:path';
import type { UserPreferences } from '@shared/types';

export interface PreferencesStore {
  read(): Promise<UserPreferences>;
  write(next: UserPreferences): Promise<void>;
}

export class JsonPreferencesStore implements PreferencesStore {
  public constructor(private readonly filePath: string) {}

  public async read(): Promise<UserPreferences> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');

      return JSON.parse(content) as UserPreferences;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }

      throw error;
    }
  }

  public async write(next: UserPreferences): Promise<void> {
    const current = await this.read();
    const merged = {
      ...current,
      ...next
    };

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(merged, null, 2), 'utf8');
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dialog } from 'electron';
import type { ExportFormat } from '@shared/types';
import type { FileGateway } from '@main/services/clockifyExporterService';

export class ElectronFileGateway implements FileGateway {
  public constructor(private readonly dialog: Pick<Dialog, 'showSaveDialog'>) {}

  public async saveExport(payload: {
    suggestedFileName: string;
    format: string;
    buffer: Buffer;
  }): Promise<string | null> {
    const result = await this.dialog.showSaveDialog({
      defaultPath: payload.suggestedFileName,
      filters: [buildFilter(payload.format as ExportFormat)]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.mkdir(path.dirname(result.filePath), { recursive: true });
    await fs.writeFile(result.filePath, payload.buffer);

    return result.filePath;
  }
}

const buildFilter = (format: ExportFormat): { name: string; extensions: string[] } => {
  switch (format) {
    case 'json':
      return { name: 'JSON', extensions: ['json'] };
    case 'csv':
      return { name: 'CSV', extensions: ['csv'] };
    case 'xlsx':
      return { name: 'Excel', extensions: ['xlsx'] };
  }
};

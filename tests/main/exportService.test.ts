import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildDefaultExportFileName,
  createCsvBuffer,
  createJsonBuffer,
  createXlsxBuffer,
  flattenDetailedEntries,
} from '@main/services/exportService';
import type { ClockifyDetailedReportResponse } from '@shared/types';

const sampleReport: ClockifyDetailedReportResponse = {
  totals: [{ totalTime: 15300 }],
  timeentries: [
    {
      id: 'entry-1',
      userName: 'Ada Lovelace',
      clientName: 'CAKE.com',
      projectName: 'Alpha',
      taskName: 'Research',
      description: 'Fix export',
      tags: [{ name: 'Export' }, { name: 'JSON' }],
      billable: true,
      timeInterval: {
        start: '2026-05-11T08:00:00.000Z',
        end: '2026-05-11T10:00:00.000Z',
        zonedStart: '2026-05-11T10:00:00+02:00',
        zonedEnd: '2026-05-11T12:00:00+02:00',
        duration: 7200,
      },
    },
    {
      id: 'entry-2',
      userName: 'Ada Lovelace',
      clientName: null,
      projectName: 'Alpha',
      taskName: null,
      description: 'Fix export',
      tags: [],
      billable: false,
      timeInterval: {
        start: '2026-05-12T07:15:00.000Z',
        end: '2026-05-12T08:00:00.000Z',
        zonedStart: '2026-05-12T09:15:00+02:00',
        zonedEnd: '2026-05-12T10:00:00+02:00',
        duration: 2700,
      },
    },
    {
      id: 'entry-3',
      userName: 'Ada Lovelace',
      clientName: '',
      projectName: 'Alpha',
      taskName: 'Deploy',
      description: 'Deploy',
      tags: [],
      billable: true,
      timeInterval: {
        start: '2026-05-12T08:00:00.000Z',
        end: '2026-05-12T08:30:00.000Z',
        zonedStart: '2026-05-12T10:00:00+02:00',
        zonedEnd: '2026-05-12T10:30:00+02:00',
        duration: 1800,
      },
    },
    {
      id: 'entry-4',
      userName: 'Ada Lovelace',
      clientName: '',
      projectName: 'Ops',
      taskName: '',
      description: 'Meeting',
      tags: [],
      billable: true,
      timeInterval: {
        start: '2026-05-13T06:00:00.000Z',
        end: '2026-05-13T07:00:00.000Z',
        zonedStart: '2026-05-13T08:00:00+02:00',
        zonedEnd: '2026-05-13T09:00:00+02:00',
        duration: 3600,
      },
    },
  ],
};

describe('flattenDetailedEntries', () => {
  it('flattens report time entries into export rows with stable columns', () => {
    expect(flattenDetailedEntries(sampleReport)).toEqual([
      {
        id: 'entry-1',
        userName: 'Ada Lovelace',
        clientName: 'CAKE.com',
        projectName: 'Alpha',
        taskName: 'Research',
        description: 'Fix export',
        tagNames: 'Export, JSON',
        billable: true,
        start: '2026-05-11T08:00:00.000Z',
        end: '2026-05-11T10:00:00.000Z',
        durationSeconds: 7200,
      },
      {
        id: 'entry-2',
        userName: 'Ada Lovelace',
        clientName: '',
        projectName: 'Alpha',
        taskName: '',
        description: 'Fix export',
        tagNames: '',
        billable: false,
        start: '2026-05-12T07:15:00.000Z',
        end: '2026-05-12T08:00:00.000Z',
        durationSeconds: 2700,
      },
      {
        id: 'entry-3',
        userName: 'Ada Lovelace',
        clientName: '',
        projectName: 'Alpha',
        taskName: 'Deploy',
        description: 'Deploy',
        tagNames: '',
        billable: true,
        start: '2026-05-12T08:00:00.000Z',
        end: '2026-05-12T08:30:00.000Z',
        durationSeconds: 1800,
      },
      {
        id: 'entry-4',
        userName: 'Ada Lovelace',
        clientName: '',
        projectName: 'Ops',
        taskName: '',
        description: 'Meeting',
        tagNames: '',
        billable: true,
        start: '2026-05-13T06:00:00.000Z',
        end: '2026-05-13T07:00:00.000Z',
        durationSeconds: 3600,
      },
    ]);
  });

  it('uses numeric Clockify durations directly when the API returns seconds', () => {
    const reportWithNumericDuration: ClockifyDetailedReportResponse = {
      totals: [],
      timeentries: [
        {
          id: 'entry-numeric-duration',
          userName: 'Ada Lovelace',
          clientName: '',
          projectName: 'Clockify',
          taskName: '',
          description: '',
          tags: [],
          billable: true,
          timeInterval: {
            start: '2026-05-18T12:40:41+02:00',
            end: '2026-05-18T15:00:36+02:00',
            duration: 8395 as unknown as string,
          },
        },
      ],
    };

    expect(flattenDetailedEntries(reportWithNumericDuration)).toEqual([
      expect.objectContaining({
        id: 'entry-numeric-duration',
        durationSeconds: 8395,
      }),
    ]);
  });

  it('treats missing tags as an empty list', () => {
    const reportWithMissingTags: ClockifyDetailedReportResponse = {
      totals: [],
      timeentries: [
        {
          id: 'entry-missing-tags',
          userName: 'Ada Lovelace',
          clientName: null,
          projectName: 'Clockify',
          taskName: null,
          description: null,
          tags: undefined as unknown as [],
          billable: false,
          timeInterval: {
            start: '2026-05-04T10:00:00.000Z',
            end: '2026-05-04T10:15:00.000Z',
            duration: 'PT15M',
          },
        },
      ],
    };

    expect(flattenDetailedEntries(reportWithMissingTags)).toEqual([
      {
        id: 'entry-missing-tags',
        userName: 'Ada Lovelace',
        clientName: '',
        projectName: 'Clockify',
        taskName: '',
        description: '',
        tagNames: '',
        billable: false,
        start: '2026-05-04T10:00:00.000Z',
        end: '2026-05-04T10:15:00.000Z',
        durationSeconds: 900,
      },
    ]);
  });

  it('normalizes invalid or missing durations to zero seconds', () => {
    const reportWithInvalidDuration: ClockifyDetailedReportResponse = {
      totals: [],
      timeentries: [
        {
          id: 'entry-invalid-duration',
          userName: 'Ada Lovelace',
          clientName: null,
          projectName: 'Clockify',
          taskName: null,
          description: null,
          tags: [],
          billable: false,
          timeInterval: {
            start: '2026-05-04T10:00:00.000Z',
            end: '2026-05-04T10:15:00.000Z',
            duration: '' as unknown as string,
          },
        },
      ],
    };

    expect(flattenDetailedEntries(reportWithInvalidDuration)).toEqual([
      expect.objectContaining({
        id: 'entry-invalid-duration',
        durationSeconds: 0,
      }),
    ]);
  });
});

describe('export buffers', () => {
  it('writes raw JSON payload unchanged', () => {
    const jsonText = createJsonBuffer(sampleReport).toString('utf8');

    expect(JSON.parse(jsonText)).toEqual(sampleReport);
  });

  it('writes CSV with headers and flattened values', () => {
    const csvText = createCsvBuffer(sampleReport).toString('utf8');
    const lines = csvText.trim().split('\n');

    expect(lines[0]).toBe(
      'id,userName,clientName,projectName,taskName,description,tagNames,billable,start,end,durationSeconds',
    );
    expect(lines[1]).toContain('entry-1');
    expect(lines[1]).toContain('"Export, JSON"');
    expect(lines[4]).toContain('entry-4');
  });

  it('writes XLSX as a details sheet plus a virtual pivot summary sheet', () => {
    const workbook = XLSX.read(createXlsxBuffer(sampleReport), {
      type: 'buffer',
      cellNF: true,
      cellStyles: true,
    });
    const summarySheet = workbook.Sheets.Summary;
    const detailsSheet = workbook.Sheets.Details;

    expect(workbook.SheetNames).toEqual(['Summary', 'Details']);
    expect(summarySheet['!cols']?.[1]?.width).toBe(11);
    expect(summarySheet['!cols']?.[2]?.width).toBe(11);
    expect(summarySheet['!rows']?.[0]?.hpx).toBe(40);
    expect(summarySheet.A1?.v).toBe('Tasks');
    expect(detailsSheet.A1?.v).toBe('Project');
    expect(detailsSheet.B1?.v).toBe('Description');
    expect(detailsSheet.C1?.v).toBe('Date');
    expect(detailsSheet.D1?.v).toBe('From');
    expect(detailsSheet.E1?.v).toBe('To');
    expect(detailsSheet.F1?.v).toBe('Time');
    expect(detailsSheet.C2?.z).toBe('dd-mm-yyyy');
    expect(detailsSheet.C2?.w).toBe('11-05-2026');
    expect(detailsSheet.D2?.t).toBe('n');
    expect(detailsSheet.D2?.w).toBe('10:00');
    expect(detailsSheet.E2?.w).toBe('12:00');
    expect(detailsSheet.F2?.t).toBe('n');
    expect(detailsSheet.F2?.w).toBe('2:00');
    expect(detailsSheet.A5?.v).toBe('Ops');
    expect(detailsSheet.F5?.w).toBe('1:00');

    expect(summarySheet.B1?.w).toBe('11-05-2026');
    expect(summarySheet.C1?.w).toBe('12-05-2026');
    expect(summarySheet.D1?.w).toBe('13-05-2026');
    expect(summarySheet.E1?.v).toBe('Grand Total');
    expect(summarySheet.A2?.v).toBe('Alpha');
    expect(summarySheet.B2?.t).toBe('n');
    expect(summarySheet.B2?.w).toBe('2:00');
    expect(summarySheet.C2?.w).toBe('1:15');
    expect(summarySheet.E2?.w).toBe('3:15');
    expect(summarySheet.A3?.v).toBe('Fix export');
    expect(summarySheet.B3?.w).toBe('2:00');
    expect(summarySheet.C3?.w).toBe('0:45');
    expect(summarySheet.E3?.w).toBe('2:45');
    expect(summarySheet.A4?.v).toBe('Deploy');
    expect(summarySheet.C4?.w).toBe('0:30');
    expect(summarySheet.E4?.w).toBe('0:30');
    expect(summarySheet.A5?.v).toBe('Ops');
    expect(summarySheet.D5?.w).toBe('1:00');
    expect(summarySheet.E5?.w).toBe('1:00');
    expect(summarySheet.A6?.v).toBe('Meeting');
    expect(summarySheet.D6?.w).toBe('1:00');
    expect(summarySheet.A7?.v).toBe('Grand Total');
    expect(summarySheet.B7?.w).toBe('2:00');
    expect(summarySheet.C7?.w).toBe('1:15');
    expect(summarySheet.D7?.w).toBe('1:00');
    expect(summarySheet.E7?.w).toBe('4:15');
  });

  it('creates header-only CSV and XLSX for empty reports', () => {
    const emptyReport: ClockifyDetailedReportResponse = {
      totals: [],
      timeentries: [],
    };

    const csvText = createCsvBuffer(emptyReport).toString('utf8').trim();
    const workbook = XLSX.read(createXlsxBuffer(emptyReport), {
      type: 'buffer',
      cellNF: true,
    });
    const summarySheet = workbook.Sheets.Summary;
    const detailsSheet = workbook.Sheets.Details;

    expect(csvText).toBe(
      'id,userName,clientName,projectName,taskName,description,tagNames,billable,start,end,durationSeconds',
    );
    expect(workbook.SheetNames).toEqual(['Summary', 'Details']);
    expect(detailsSheet.A1?.v).toBe('Project');
    expect(detailsSheet.A2).toBeUndefined();
    expect(summarySheet.A1?.v).toBe('Tasks');
    expect(summarySheet.B1?.v).toBe('Grand Total');
    expect(summarySheet.A2?.v).toBe('Grand Total');
    expect(summarySheet.B2?.w).toBe('0:00');
  });
});

describe('buildDefaultExportFileName', () => {
  it('sanitizes the workspace name for safe filenames', () => {
    expect(buildDefaultExportFileName('Clockify / Research: Team', '2026-05-04', '2026-05-10', 'xlsx')).toBe(
      'clockify-detailed-clockify-research-team-2026-05-04-2026-05-10.xlsx',
    );
  });
});

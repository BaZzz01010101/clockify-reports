// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, getDefaultPresetKey } from '@renderer/App';
import { appTheme } from '@renderer/theme';
import type { ClockifyDesktopApi } from '@shared/ipc';

declare global {
  interface Window {
    clockifyExporter: ClockifyDesktopApi;
  }
}

describe('App', () => {
  const api: ClockifyDesktopApi = {
    getSession: vi.fn(),
    validateAndStoreApiKey: vi.fn(),
    clearApiKey: vi.fn(),
    getWorkspaces: vi.fn(),
    exportDetailedReport: vi.fn(),
    openFile: vi.fn(),
    openFolder: vi.fn(),
    openExternalUrl: vi.fn(),
    copyText: vi.fn(),
    fitWindowToContent: vi.fn()
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-19T10:00:00.000Z'));
    window.clockifyExporter = api;
    vi.mocked(api.getSession).mockReset();
    vi.mocked(api.validateAndStoreApiKey).mockReset();
    vi.mocked(api.clearApiKey).mockReset();
    vi.mocked(api.getWorkspaces).mockReset();
    vi.mocked(api.exportDetailedReport).mockReset();
    vi.mocked(api.openFile).mockReset();
    vi.mocked(api.openFolder).mockReset();
    vi.mocked(api.openExternalUrl).mockReset();
    vi.mocked(api.copyText).mockReset();
    vi.mocked(api.fitWindowToContent).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the API key form when no credentials are stored', async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      apiKeyPresent: false
    });

    renderApp();

    expect(await screen.findByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('renders the app directly in the window client area', async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      apiKeyPresent: false
    });

    const { container } = renderApp();

    expect(await screen.findByLabelText(/api key/i)).toBeInTheDocument();
    expect(container.querySelector('.app-client-area')).toBeInTheDocument();
    expect(container.querySelector('.app-shell')).not.toBeInTheDocument();
    expect(container.querySelector('.tool-panel')).not.toBeInTheDocument();
  });

  it('derives the default preset from workday boundaries', () => {
    expect(getDefaultPresetKey(DateTime.fromISO('2026-05-29'))).toBe('thisWeek');
    expect(getDefaultPresetKey(DateTime.fromISO('2026-06-01'))).toBe('lastWeek');
    expect(getDefaultPresetKey(DateTime.fromISO('2026-06-30'))).toBe('thisMonth');
    expect(getDefaultPresetKey(DateTime.fromISO('2026-10-01'))).toBe('lastMonth');
    expect(getDefaultPresetKey(DateTime.fromISO('2026-05-19'))).toBe('thisWeek');
  });

  it('connects, loads workspaces, applies a preset, and exports a report', async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      apiKeyPresent: false
    });
    vi.mocked(api.validateAndStoreApiKey).mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid'
    });
    vi.mocked(api.getWorkspaces).mockResolvedValue({
      session: {
        apiKeyPresent: true,
        userEmail: 'user@example.com',
        userTimeZone: 'Europe/Madrid'
      },
      workspaces: [{ id: 'ws-1', name: 'Alpha' }],
      preferences: {
        lastWorkspaceId: 'ws-1',
        lastExportFormat: 'xlsx'
      }
    });
    vi.mocked(api.exportDetailedReport).mockResolvedValue({
      kind: 'success',
      path: 'D:/Exports/report.xlsx',
      recordCount: 1
    });

    renderApp();

    fireEvent.change(await screen.findByLabelText(/api key/i), {
      target: { value: 'secret-key' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));

    expect(await screen.findByText(/user@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace/i)).toHaveValue('Alpha');
    expect(screen.getByLabelText(/format/i)).toHaveValue('Excel (.xlsx)');
    expect(screen.getByLabelText(/^selected:$/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /this week/i })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: /last week/i }));
    fireEvent.click(screen.getByRole('radio', { name: /custom/i }));
    expect(screen.getByRole('radio', { name: /custom/i })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /last week/i }));
    fireEvent.click(screen.getByRole('button', { name: /export report/i }));

    await waitFor(() =>
      expect(api.exportDetailedReport).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        workspaceName: 'Alpha',
        fromDate: '2026-05-11',
        toDate: '2026-05-17',
        format: 'xlsx'
      })
    );

    expect(await screen.findByText(/last export/i)).toBeInTheDocument();
    expect(screen.getByText(/^report\.xlsx$/i)).toBeInTheDocument();
    expect(screen.getByText(/^1 entry$/i)).toBeInTheDocument();
    expect(screen.getByText(/D:\/Exports\/report\.xlsx/i)).toBeInTheDocument();
  });

  it('shows a validation dialog when overlapping time entries block export', async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      apiKeyPresent: false
    });
    vi.mocked(api.validateAndStoreApiKey).mockResolvedValue({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid'
    });
    vi.mocked(api.getWorkspaces).mockResolvedValue({
      session: {
        apiKeyPresent: true,
        userEmail: 'user@example.com',
        userTimeZone: 'Europe/Madrid'
      },
      workspaces: [{ id: 'ws-1', name: 'Alpha' }],
      preferences: {
        lastWorkspaceId: 'ws-1',
        lastExportFormat: 'csv'
      }
    });
    vi.mocked(api.exportDetailedReport).mockResolvedValue({
      kind: 'validation-error',
      message: 'Overlapping time entries were found.',
      fixUrl: 'https://app.clockify.me/calendar',
      overlaps: [
        {
          date: '2026-05-04',
          userName: 'Ada Lovelace',
          overlapSeconds: 1800,
          first: {
            id: undefined as unknown as string,
            projectName: 'Clockify',
            description: 'Morning analysis',
            start: '2026-05-04T08:00:00.000Z',
            end: '2026-05-04T10:00:00.000Z'
          },
          second: {
            id: undefined as unknown as string,
            projectName: 'Clockify',
            description: 'Overlapping review',
            start: '2026-05-04T09:30:00.000Z',
            end: '2026-05-04T10:30:00.000Z'
          }
        }
      ]
    } as never);

    renderApp();

    fireEvent.change(await screen.findByLabelText(/api key/i), {
      target: { value: 'secret-key' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));
    expect(await screen.findByText(/user@example.com/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /export report/i }));

    expect(await screen.findByText(/overlapping time entries were found/i)).toBeInTheDocument();
    expect(screen.getByText(/04 May 2026/)).toBeInTheDocument();
    expect(screen.getByText(/08:00-10:00/)).toBeInTheDocument();
    expect(screen.getByText(/09:30-10:30/)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open clockify calendar/i })).toHaveAttribute(
      'href',
      'https://app.clockify.me/calendar'
    );
    fireEvent.click(screen.getByRole('link', { name: /open clockify calendar/i }));
    await waitFor(() => {
      expect(api.openExternalUrl).toHaveBeenCalledWith('https://app.clockify.me/calendar');
    });
    expect(screen.getByRole('button', { name: /^ok$/i })).toBeInTheDocument();
  });
});

const renderApp = () =>
  render(
    <MantineProvider theme={appTheme}>
      <App />
    </MantineProvider>
  );

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@renderer/App';
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
    exportDetailedReport: vi.fn()
  };

  beforeEach(() => {
    window.clockifyExporter = api;
    vi.mocked(api.getSession).mockReset();
    vi.mocked(api.validateAndStoreApiKey).mockReset();
    vi.mocked(api.clearApiKey).mockReset();
    vi.mocked(api.getWorkspaces).mockReset();
    vi.mocked(api.exportDetailedReport).mockReset();
  });

  it('shows the API key form when no credentials are stored', async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      apiKeyPresent: false
    });

    render(<App />);

    expect(await screen.findByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('connects, loads workspaces, and exports a report', async () => {
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
      path: 'D:/Exports/report.xlsx',
      recordCount: 1
    });

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/api key/i), {
      target: { value: 'secret-key' }
    });
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText(/user@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace/i)).toHaveValue('ws-1');
    expect(screen.getByLabelText(/format/i)).toHaveValue('xlsx');

    fireEvent.change(screen.getByLabelText(/from date/i), {
      target: { value: '2026-05-04' }
    });
    fireEvent.change(screen.getByLabelText(/to date/i), {
      target: { value: '2026-05-10' }
    });
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() =>
      expect(api.exportDetailedReport).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        workspaceName: 'Alpha',
        fromDate: '2026-05-04',
        toDate: '2026-05-10',
        format: 'xlsx'
      })
    );
    expect(await screen.findByText(/exported 1 entries/i)).toBeInTheDocument();
    expect(screen.getByText(/D:\/Exports\/report\.xlsx/i)).toBeInTheDocument();
  });
});

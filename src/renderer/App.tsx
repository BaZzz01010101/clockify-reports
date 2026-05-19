import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ClockifySession, ExportFormat, WorkspaceOption } from '@shared/types';
import type { ExportResult } from '@shared/ipc';

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' }
];

type StatusMessage =
  | { type: 'success'; text: string; path?: string }
  | { type: 'error'; text: string };

const todayDate = (): string => new Date().toISOString().slice(0, 10);

export const App = () => {
  const [apiKey, setApiKey] = useState('');
  const [session, setSession] = useState<ClockifySession>({ apiKeyPresent: false });
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [fromDate, setFromDate] = useState(todayDate());
  const [toDate, setToDate] = useState(todayDate());
  const [format, setFormat] = useState<ExportFormat>('json');
  const [busy, setBusy] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );

  const canExport = Boolean(selectedWorkspace && fromDate && toDate && !exporting);

  const bootstrap = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);

    try {
      const nextSession = await window.clockifyExporter.getSession();
      setSession(nextSession);

      if (nextSession.apiKeyPresent) {
        await loadWorkspaces();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error)
      });
    } finally {
      setBusy(false);
    }
  };

  const loadWorkspaces = async (): Promise<void> => {
    const payload = await window.clockifyExporter.getWorkspaces();
    const defaultWorkspace = payload.preferences.lastWorkspaceId ?? payload.workspaces[0]?.id ?? '';

    setSession(payload.session);
    setWorkspaces(payload.workspaces);
    setSelectedWorkspaceId(defaultWorkspace);
    setFormat(payload.preferences.lastExportFormat ?? 'json');
  };

  const onConnect = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setConnecting(true);
    setMessage(null);

    try {
      const nextSession = await window.clockifyExporter.validateAndStoreApiKey(apiKey.trim());
      setSession(nextSession);
      await loadWorkspaces();
      setApiKey('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error)
      });
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnect = async (): Promise<void> => {
    await window.clockifyExporter.clearApiKey();
    setSession({ apiKeyPresent: false });
    setWorkspaces([]);
    setSelectedWorkspaceId('');
    setMessage(null);
  };

  const onExport = async (): Promise<void> => {
    if (!selectedWorkspace) {
      return;
    }

    setExporting(true);
    setMessage(null);

    try {
      const result = await window.clockifyExporter.exportDetailedReport({
        workspaceId: selectedWorkspace.id,
        workspaceName: selectedWorkspace.name,
        fromDate,
        toDate,
        format
      });

      if (!result) {
        setMessage({
          type: 'success',
          text: 'Export canceled.'
        });
        return;
      }

      setMessage(formatExportSuccess(result));
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error)
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Clockify cloud</p>
            <h1>Clockify reports</h1>
          </div>
          {session.apiKeyPresent ? (
            <button className="ghost-button" onClick={onDisconnect} type="button">
              Disconnect
            </button>
          ) : null}
        </header>

        {message ? (
          <div className={`banner banner-${message.type}`}>
            <p>{message.text}</p>
            {'path' in message && message.path ? <code>{message.path}</code> : null}
          </div>
        ) : null}

        {busy ? <p className="muted">Loading exporter state...</p> : null}

        {!busy && !session.apiKeyPresent ? (
          <form className="stack" onSubmit={onConnect}>
            <label className="field">
              <span>API key</span>
              <input
                autoComplete="off"
                name="apiKey"
                onChange={(event) => setApiKey(event.currentTarget.value)}
                placeholder="Paste your Clockify API key"
                type="password"
                value={apiKey}
              />
            </label>
            <button disabled={!apiKey.trim() || connecting} type="submit">
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        ) : null}

        {!busy && session.apiKeyPresent ? (
          <div className="stack">
            <div className="summary-card">
              <p>
                <strong>{session.userEmail ?? 'Clockify user'}</strong>
              </p>
              <p className="muted">Timezone: {session.userTimeZone ?? 'UTC'}</p>
            </div>

            <label className="field">
              <span>Workspace</span>
              <select
                aria-label="Workspace"
                onChange={(event) => setSelectedWorkspaceId(event.currentTarget.value)}
                value={selectedWorkspaceId}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid">
              <label className="field">
                <span>From date</span>
                <input
                  aria-label="From date"
                  onChange={(event) => setFromDate(event.currentTarget.value)}
                  type="date"
                  value={fromDate}
                />
              </label>

              <label className="field">
                <span>To date</span>
                <input
                  aria-label="To date"
                  onChange={(event) => setToDate(event.currentTarget.value)}
                  type="date"
                  value={toDate}
                />
              </label>
            </div>

            <label className="field">
              <span>Format</span>
              <select
                aria-label="Format"
                onChange={(event) => setFormat(event.currentTarget.value as ExportFormat)}
                value={format}
              >
                {EXPORT_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button disabled={!canExport} onClick={onExport} type="button">
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
};

const formatExportSuccess = (result: ExportResult): StatusMessage => ({
  type: 'success',
  text: `Exported ${result.recordCount} entries.`,
  path: result.path
});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while processing the request.';
};

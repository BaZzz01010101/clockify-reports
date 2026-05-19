import { type FormEvent, type MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip
} from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { DateTime } from 'luxon';
import type {
  ExportOverlap,
  ExportResult,
  ExportSuccessResult,
  ExportValidationResult,
  OverlapRecordSummary
} from '@shared/ipc';
import type { ClockifySession, ExportFormat, WorkspaceOption } from '@shared/types';

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' }
];

type StatusMessage = { type: 'error'; text: string };
type AppDateRange = DatesRangeValue<string>;
type PresetKey = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type RangePreset = {
  key: Exclude<PresetKey, 'custom'>;
  label: string;
  range: AppDateRange;
};

const buildRangePresets = (): RangePreset[] => {
  const today = DateTime.local();
  const previousWeek = today.minus({ weeks: 1 });
  const previousMonth = today.minus({ months: 1 });

  return [
    { key: 'thisWeek', label: 'This week', range: toRange(today.startOf('week'), today.endOf('week')) },
    { key: 'lastWeek', label: 'Last week', range: toRange(previousWeek.startOf('week'), previousWeek.endOf('week')) },
    { key: 'thisMonth', label: 'This month', range: toRange(today.startOf('month'), today.endOf('month')) },
    {
      key: 'lastMonth',
      label: 'Last month',
      range: toRange(previousMonth.startOf('month'), previousMonth.endOf('month'))
    }
  ];
};

export const App = () => {
  const presets = useMemo(() => buildRangePresets(), []);
  const defaultPreset = useMemo(() => getDefaultPreset(presets, DateTime.local()), [presets]);
  const [apiKey, setApiKey] = useState('');
  const [session, setSession] = useState<ClockifySession>({ apiKeyPresent: false });
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [dateRange, setDateRange] = useState<AppDateRange>(defaultPreset.range);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(defaultPreset.key);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [busy, setBusy] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [lastExport, setLastExport] = useState<ExportSuccessResult | null>(null);
  const [validationResult, setValidationResult] = useState<ExportValidationResult | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy path');

  const [fromDate, toDate] = dateRange;
  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );
  const canExport = Boolean(selectedWorkspace && fromDate && toDate && !exporting);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void window.clockifyExporter.fitWindowToContent();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [busy, session.apiKeyPresent, workspaces.length, lastExport, validationResult, message]);

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
      setMessage({ type: 'error', text: getErrorMessage(error) });
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
      setLastExport(null);
      setValidationResult(null);
      await loadWorkspaces();
      setApiKey('');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnect = async (): Promise<void> => {
    await window.clockifyExporter.clearApiKey();
    setSession({ apiKeyPresent: false });
    setWorkspaces([]);
    setSelectedWorkspaceId('');
    setLastExport(null);
    setValidationResult(null);
    setMessage(null);
  };

  const onExport = async (): Promise<void> => {
    if (!selectedWorkspace || !fromDate || !toDate) {
      return;
    }

    setExporting(true);
    setMessage(null);
    setValidationResult(null);

    try {
      const result = await window.clockifyExporter.exportDetailedReport({
        workspaceId: selectedWorkspace.id,
        workspaceName: selectedWorkspace.name,
        fromDate,
        toDate,
        format
      });

      if (!result) {
        return;
      }

      if (result.kind === 'validation-error') {
        setValidationResult(result);
        return;
      }

      setLastExport(result);
      setCopyLabel('Copy path');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setExporting(false);
    }
  };

  const onOpenFile = async (): Promise<void> => {
    if (!lastExport) {
      return;
    }

    try {
      await window.clockifyExporter.openFile(lastExport.path);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const onOpenFolder = async (): Promise<void> => {
    if (!lastExport) {
      return;
    }

    try {
      await window.clockifyExporter.openFolder(lastExport.path);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const onCopyPath = async (): Promise<void> => {
    if (!lastExport) {
      return;
    }

    try {
      await window.clockifyExporter.copyText(lastExport.path);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy path'), 1600);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const onOpenFixUrl = async (event: MouseEvent<HTMLAnchorElement>): Promise<void> => {
    event.preventDefault();

    try {
      await window.clockifyExporter.openExternalUrl(validationResult?.fixUrl ?? 'https://app.clockify.me/calendar');
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const onPresetChange = (value: string): void => {
    const nextPreset = value as PresetKey;
    setSelectedPreset(nextPreset);

    if (nextPreset === 'custom') {
      return;
    }

    const preset = presets.find((entry) => entry.key === nextPreset);
    if (!preset) {
      return;
    }

    setDateRange(preset.range);
  };

  const onRangeChange = (nextValue: AppDateRange): void => {
    setDateRange(nextValue);
    setSelectedPreset(getActivePreset(nextValue, presets));
  };

  return (
    <Box className="app-shell">
      <Container size={560} py={8}>
        <Paper className="tool-panel" radius="md" p="sm" shadow="xs" withBorder>
          <Stack gap="xs">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Title order={1} size="h5">
                Clockify reports
              </Title>

              <Group gap="xs" wrap="nowrap">
                <Badge color={session.apiKeyPresent ? 'teal' : 'gray'} variant="light" size="sm">
                  {session.apiKeyPresent ? 'CONNECTED' : 'DISCONNECTED'}
                </Badge>
                {session.apiKeyPresent ? (
                  <Button variant="default" size="compact-sm" onClick={onDisconnect}>
                    Disconnect
                  </Button>
                ) : null}
              </Group>
            </Group>

            {message ? (
              <Alert color="red" radius="md" variant="light" p="sm">
                <Text size="xs">{message.text}</Text>
              </Alert>
            ) : null}

            {busy ? (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="xs" c="dimmed">
                  Loading state...
                </Text>
              </Group>
            ) : null}

            {!busy && !session.apiKeyPresent ? (
              <form onSubmit={(event) => void onConnect(event)}>
                <Stack gap="xs">
                  <PasswordInput
                    autoComplete="off"
                    label="API key"
                    name="apiKey"
                    onChange={(event) => setApiKey(event.currentTarget.value)}
                    placeholder="Paste Clockify API key"
                    radius="md"
                    size="sm"
                    value={apiKey}
                  />
                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed">
                      Stored in local keychain
                    </Text>
                    <Button type="submit" loading={connecting} disabled={!apiKey.trim()} size="sm">
                      Connect
                    </Button>
                  </Group>
                </Stack>
              </form>
            ) : null}

            {!busy && session.apiKeyPresent ? (
              <>
                <Text size="sm" c="dimmed">
                  Signed in as{' '}
                  <Text span c="dark" fw={600}>
                    {session.userEmail ?? 'Clockify user'}
                  </Text>{' '}
                  - {session.userTimeZone ?? 'UTC'}
                </Text>

                <Select
                  aria-label="Workspace"
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: false }}
                  data={workspaces.map((workspace) => ({
                    value: workspace.id,
                    label: workspace.name
                  }))}
                  label="Workspace"
                  onChange={(value) => setSelectedWorkspaceId(value ?? '')}
                  radius="md"
                  searchable={false}
                  size="sm"
                  value={selectedWorkspaceId}
                />

                <Stack gap={6}>
                  <Text size="sm" fw={600}>
                    Range
                  </Text>
                  <SegmentedControl
                    aria-label="Range preset"
                    data={[
                      ...presets.map((preset) => ({ label: preset.label, value: preset.key })),
                      { label: 'Custom', value: 'custom' }
                    ]}
                    fullWidth
                    onChange={onPresetChange}
                    radius="md"
                    size="xs"
                    value={selectedPreset}
                  />
                  <DatePickerInput
                    allowSingleDateInRange
                    aria-label="Date range"
                    clearable={false}
                    dropdownType="modal"
                    label="Selected:"
                    onChange={onRangeChange}
                    placeholder="Pick start and end date"
                    popoverProps={{ withinPortal: false }}
                    radius="md"
                    size="sm"
                    type="range"
                    value={dateRange}
                    valueFormat="DD MMM YYYY"
                  />
                </Stack>

                <Group align="flex-end" wrap="nowrap">
                  <Box style={{ flex: 1 }}>
                    <Select
                      aria-label="Format"
                      allowDeselect={false}
                      comboboxProps={{ withinPortal: false }}
                      data={EXPORT_FORMAT_OPTIONS}
                      label="Format"
                      onChange={(value) => setFormat((value as ExportFormat) ?? 'json')}
                      radius="md"
                      searchable={false}
                      size="sm"
                      value={format}
                    />
                  </Box>
                  <Button size="sm" loading={exporting} disabled={!canExport} onClick={() => void onExport()}>
                    Export report
                  </Button>
                </Group>

                {lastExport ? (
                  <>
                    <Divider />
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" fw={600}>
                        Last export
                      </Text>
                      <Text size="sm" fw={600}>
                        {getFileName(lastExport.path)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatRecordCount(lastExport.recordCount)}
                      </Text>
                      <Tooltip label={lastExport.path} multiline withArrow>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {shortenPath(lastExport.path)}
                        </Text>
                      </Tooltip>
                      <Group gap="xs">
                        <Button variant="default" size="compact-sm" onClick={() => void onOpenFile()}>
                          Open file
                        </Button>
                        <Button variant="default" size="compact-sm" onClick={() => void onOpenFolder()}>
                          Open folder
                        </Button>
                        <Button variant="default" size="compact-sm" onClick={() => void onCopyPath()}>
                          {copyLabel}
                        </Button>
                      </Group>
                    </Stack>
                  </>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Paper>
      </Container>

      <Modal
        opened={validationResult !== null}
        onClose={() => setValidationResult(null)}
        title="Export blocked"
        centered
        size="lg"
      >
        <Stack gap="xs">
          <Text size="sm">
            {validationResult?.message} Review the dated rows below to clean them up faster.
          </Text>
          <Stack gap={4} className="overlap-list">
            {validationResult?.overlaps.map((overlap, index) => (
              <Box className="overlap-item" key={getOverlapKey(overlap, index)}>
                <Box className="overlap-heading">
                  <Text component="span" size="sm" fw={700}>
                    {formatOverlapDate(overlap.date)}
                  </Text>
                  <Text component="span" size="xs" c="dimmed">
                    {overlap.userName} - {formatOverlapDuration(overlap.overlapSeconds)}
                  </Text>
                </Box>
                {[overlap.first, overlap.second].map((record, recordIndex) => (
                  <Box className="overlap-record" key={`${formatRecordTimeRange(record)}-${recordIndex}`}>
                    <Text component="span" size="xs" className="overlap-record-time">
                      {formatRecordTimeRange(record)}
                    </Text>
                    <Text component="span" size="xs" className="overlap-record-details">
                      <span className="overlap-record-project">{getRecordProjectName(record)}</span>
                      <span> - {getRecordDescription(record)}</span>
                    </Text>
                  </Box>
                ))}
              </Box>
            ))}
          </Stack>
          <Anchor
            className="overlap-calendar-link"
            href={validationResult?.fixUrl ?? 'https://app.clockify.me/calendar'}
            onClick={(event) => void onOpenFixUrl(event)}
          >
            Open Clockify calendar
          </Anchor>
          <Group justify="flex-end">
            <Button onClick={() => setValidationResult(null)}>OK</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

const toRange = (start: DateTime, end: DateTime): AppDateRange => [
  start.toISODate() ?? '',
  end.toISODate() ?? ''
];

const isWorkday = (date: DateTime): boolean => date.weekday <= 5;

const findBoundaryWorkday = (start: DateTime, end: DateTime, step: 1 | -1): string => {
  let cursor = step === 1 ? start.startOf('day') : end.startOf('day');
  const limit = step === 1 ? end.startOf('day') : start.startOf('day');

  while ((step === 1 && cursor <= limit) || (step === -1 && cursor >= limit)) {
    if (isWorkday(cursor)) {
      return cursor.toISODate() ?? '';
    }

    cursor = cursor.plus({ days: step });
  }

  return start.toISODate() ?? '';
};

export const getDefaultPresetKey = (today: DateTime): Exclude<PresetKey, 'custom'> => {
  const isoDate = today.toISODate() ?? '';
  const weekStart = today.startOf('week');
  const weekEnd = today.endOf('week');
  const monthStart = today.startOf('month');
  const monthEnd = today.endOf('month');
  const firstWeekWorkday = findBoundaryWorkday(weekStart, weekEnd, 1);
  const lastWeekWorkday = findBoundaryWorkday(weekStart, weekEnd, -1);
  const firstMonthWorkday = findBoundaryWorkday(monthStart, monthEnd, 1);
  const lastMonthWorkday = findBoundaryWorkday(monthStart, monthEnd, -1);

  if (isoDate === lastWeekWorkday) {
    return 'thisWeek';
  }

  if (isoDate === lastMonthWorkday) {
    return 'thisMonth';
  }

  if (isoDate === firstWeekWorkday) {
    return 'lastWeek';
  }

  if (isoDate === firstMonthWorkday) {
    return 'lastMonth';
  }

  return 'thisWeek';
};

const isSameRange = (left: AppDateRange, right: AppDateRange): boolean =>
  left[0] === right[0] && left[1] === right[1];

const getActivePreset = (range: AppDateRange, presets: RangePreset[]): PresetKey => {
  const matchedPreset = presets.find((preset) => isSameRange(range, preset.range));

  return matchedPreset?.key ?? 'custom';
};

const getDefaultPreset = (
  presets: RangePreset[],
  today: DateTime
): { key: Exclude<PresetKey, 'custom'>; range: AppDateRange } => {
  const key = getDefaultPresetKey(today);
  const matchedPreset = presets.find((preset) => preset.key === key);

  return {
    key,
    range: matchedPreset?.range ?? toRange(today, today)
  };
};

const formatRecordCount = (count: number): string => `${count} ${count === 1 ? 'entry' : 'entries'}`;

const formatOverlapDate = (isoDate: string): string => {
  const parsed = DateTime.fromISO(isoDate);

  return parsed.isValid ? parsed.toFormat('dd LLL yyyy') : isoDate;
};

const formatOverlapDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);

  return `${minutes} min overlap`;
};

const getOverlapKey = (overlap: ExportOverlap, index: number): string =>
  [
    overlap.date,
    overlap.userName,
    overlap.first.start,
    overlap.first.end,
    overlap.second.start,
    overlap.second.end,
    index
  ].join('|');

const formatRecordTimeRange = (record: Pick<OverlapRecordSummary, 'start' | 'end'>): string =>
  `${formatTime(record.start)}-${formatTime(record.end)}`;

const getRecordProjectName = (record: Pick<OverlapRecordSummary, 'projectName'>): string =>
  cleanRecordText(record.projectName) || 'No project';

const getRecordDescription = (record: Pick<OverlapRecordSummary, 'description'>): string =>
  cleanRecordText(record.description) || 'No description';

const cleanRecordText = (value: string | null | undefined): string => value?.trim() ?? '';

const formatTime = (iso: string): string => {
  const parsed = DateTime.fromISO(iso, { setZone: true });

  return parsed.isValid ? parsed.toFormat('HH:mm') : iso;
};

const getFileName = (targetPath: string): string => {
  const normalized = targetPath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  return segments[segments.length - 1] ?? targetPath;
};

const shortenPath = (targetPath: string): string => {
  if (targetPath.length <= 56) {
    return targetPath;
  }

  const normalized = targetPath.replace(/\//g, '\\');
  const segments = normalized.split('\\').filter(Boolean);

  if (segments.length < 3) {
    return normalized;
  }

  return `...\\${segments.slice(-2).join('\\')}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed.';
};

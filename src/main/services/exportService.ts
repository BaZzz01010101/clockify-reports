import { DateTime, Duration } from "luxon";
import * as XLSX from "xlsx-js-style";
import type {
  ClockifyDetailedReportResponse,
  ClockifyDetailedTimeEntry,
  DetailedEntryRow,
  ExportFormat,
} from "@shared/types";

const EXPORT_COLUMNS: Array<keyof DetailedEntryRow> = [
  "id",
  "userName",
  "clientName",
  "projectName",
  "taskName",
  "description",
  "tagNames",
  "billable",
  "start",
  "end",
  "durationSeconds",
];

const DETAILS_HEADERS = [
  "Project",
  "Description",
  "Date",
  "From",
  "To",
  "Time",
];
const DATE_FORMAT = "dd-mm-yyyy";
const TIME_FORMAT = "hh:mm";
const DURATION_FORMAT = "[h]:mm";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

interface NormalizedDetailedEntry {
  projectName: string;
  description: string;
  displayDate: DateTime;
  fromTime: DateTime;
  toTime: DateTime;
  durationSeconds: number;
}

interface SummaryRow {
  label: string;
  kind: "project" | "description" | "grand-total";
  totalsByDate: Map<string, number>;
  totalSeconds: number;
}

interface SummaryStructure {
  dayKeys: string[];
  dayDates: Map<string, DateTime>;
  rows: SummaryRow[];
}

type Worksheet = XLSX.WorkSheet & {
  "!cols"?: Array<{ wch?: number; wpx?: number }>;
  "!merges"?: Array<{
    s: { c: number; r: number };
    e: { c: number; r: number };
  }>;
  "!rows"?: Array<{ hpx?: number }>;
};

const headerFill = "B8CCE4";
const totalFill = "B8CCE4";
const groupFill = "DCE6F1";
const whiteFill = "FFFFFF";
const borderColor = "9AB6CE";
const normalRowHeightPx = 20;
const summaryHeaderRowHeightPx = 40;
const summaryDayColumnWidth = 11;

const baseBorder = {
  top: { style: "thin", color: { rgb: borderColor } },
  right: { style: "thin", color: { rgb: borderColor } },
  bottom: { style: "thin", color: { rgb: borderColor } },
  left: { style: "thin", color: { rgb: borderColor } },
};

const verticalBorder = {
  right: { style: "thin", color: { rgb: borderColor } },
  left: { style: "thin", color: { rgb: borderColor } },
};

const headerDividerBorder = {
  top: { style: "thin", color: { rgb: borderColor } },
  right: { style: "thin", color: { rgb: borderColor } },
  left: { style: "thin", color: { rgb: borderColor } },
};

const baseFont = {
  name: "Calibri",
  sz: 11,
};

const baseAlignment = {
  vertical: "center",
};

const summaryHeaderFirstColumnStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: headerFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "center" },
};

const summaryHeaderCenteredStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: headerFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "center" },
};

const detailHeaderStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: headerFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "left" },
};

const totalRowStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: totalFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "left" },
};

const projectRowStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: groupFill } },
  border: verticalBorder,
  alignment: { ...baseAlignment, horizontal: "left" },
};

const descriptionLabelStyle = {
  font: baseFont,
  fill: { patternType: "solid", fgColor: { rgb: whiteFill } },
  border: verticalBorder,
  alignment: { ...baseAlignment, horizontal: "left", indent: 1 },
};

const detailTextStyle = {
  font: baseFont,
  fill: { patternType: "solid", fgColor: { rgb: whiteFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "left" },
};

const detailNumberCellStyle = {
  font: baseFont,
  fill: { patternType: "solid", fgColor: { rgb: whiteFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "right" },
};

const summaryValueCellStyle = {
  font: baseFont,
  fill: { patternType: "solid", fgColor: { rgb: whiteFill } },
  border: verticalBorder,
  alignment: { ...baseAlignment, horizontal: "right" },
};

const groupValueCellStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: groupFill } },
  border: verticalBorder,
  alignment: { ...baseAlignment, horizontal: "right" },
};

const totalValueCellStyle = {
  font: { ...baseFont, bold: true },
  fill: { patternType: "solid", fgColor: { rgb: totalFill } },
  border: baseBorder,
  alignment: { ...baseAlignment, horizontal: "right" },
};

const toDurationSeconds = (duration: string | number | undefined): number => {
  if (typeof duration === "number") {
    return Number.isFinite(duration) ? Math.round(duration) : 0;
  }

  const seconds = Duration.fromISO(duration ?? "PT0S").as("seconds");

  return Number.isFinite(seconds) ? Math.round(seconds) : 0;
};

export const flattenDetailedEntries = (
  report: ClockifyDetailedReportResponse,
): DetailedEntryRow[] =>
  report.timeentries.map((entry) => {
    return {
      id: entry.id,
      userName: entry.userName ?? "",
      clientName: entry.clientName ?? "",
      projectName: entry.projectName ?? "",
      taskName: entry.taskName ?? "",
      description: entry.description ?? "",
      tagNames: (entry.tags ?? []).map((tag) => tag.name).join(", "),
      billable: entry.billable,
      start: entry.timeInterval?.start ?? "",
      end: entry.timeInterval?.end ?? "",
      durationSeconds: toDurationSeconds(entry.timeInterval?.duration),
    };
  });

export const createJsonBuffer = (
  report: ClockifyDetailedReportResponse,
): Buffer => Buffer.from(JSON.stringify(report, null, 2), "utf8");

export const createCsvBuffer = (
  report: ClockifyDetailedReportResponse,
): Buffer => {
  const rows = flattenDetailedEntries(report);
  const header = EXPORT_COLUMNS.join(",");
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((column) => escapeCsvValue(row[column])).join(","),
  );

  return Buffer.from([header, ...lines].join("\n"), "utf8");
};

export const createXlsxBuffer = (
  report: ClockifyDetailedReportResponse,
): Buffer => {
  const normalizedEntries = normalizeDetailedEntries(report);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    createSummarySheet(normalizedEntries),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    createDetailsSheet(normalizedEntries),
    "Details",
  );
  workbook.Workbook = {
    ...(workbook.Workbook ?? {}),
    Views: [{ activeTab: 0 }] as unknown as NonNullable<
      XLSX.WorkBook["Workbook"]
    >["Views"],
  } as XLSX.WorkBook["Workbook"];

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
};

export const buildDefaultExportFileName = (
  workspaceName: string,
  fromDate: string,
  toDate: string,
  format: ExportFormat,
): string => {
  const safeWorkspaceName = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return `clockify-detailed-${safeWorkspaceName || "workspace"}-${fromDate}-${toDate}.${format}`;
};

const normalizeDetailedEntries = (
  report: ClockifyDetailedReportResponse,
): NormalizedDetailedEntry[] =>
  report.timeentries.map((entry) => {
    const fromTime = parseDisplayDateTime(entry, "start");
    const toTime = parseDisplayDateTime(entry, "end", fromTime);

    return {
      projectName: entry.projectName ?? "",
      description: entry.description ?? "",
      displayDate: fromTime.startOf("day"),
      fromTime,
      toTime,
      durationSeconds: toDurationSeconds(entry.timeInterval?.duration),
    };
  });

const createDetailsSheet = (entries: NormalizedDetailedEntry[]): Worksheet => {
  const values = [
    DETAILS_HEADERS,
    ...entries.map((entry) => [
      entry.projectName,
      entry.description,
      toExcelDateSerial(entry.displayDate),
      toExcelTimeSerial(entry.fromTime),
      toExcelTimeSerial(entry.toTime),
      toExcelDurationSerial(entry.durationSeconds),
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(values) as Worksheet;

  sheet["!cols"] = [
    { wch: 28 },
    { wch: 64 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];

  for (
    let columnIndex = 0;
    columnIndex < DETAILS_HEADERS.length;
    columnIndex += 1
  ) {
    const headerAddress = XLSX.utils.encode_cell({ c: columnIndex, r: 0 });
    applyCellStyle(sheet, headerAddress, detailHeaderStyle);
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    applyCellStyle(
      sheet,
      XLSX.utils.encode_cell({ c: 0, r: rowIndex }),
      detailTextStyle,
    );
    applyCellStyle(
      sheet,
      XLSX.utils.encode_cell({ c: 1, r: rowIndex }),
      detailTextStyle,
    );
    applyNumberCellFormatting(
      sheet,
      XLSX.utils.encode_cell({ c: 2, r: rowIndex }),
      DATE_FORMAT,
      detailNumberCellStyle,
    );
    applyNumberCellFormatting(
      sheet,
      XLSX.utils.encode_cell({ c: 3, r: rowIndex }),
      TIME_FORMAT,
      detailNumberCellStyle,
    );
    applyNumberCellFormatting(
      sheet,
      XLSX.utils.encode_cell({ c: 4, r: rowIndex }),
      TIME_FORMAT,
      detailNumberCellStyle,
    );
    applyNumberCellFormatting(
      sheet,
      XLSX.utils.encode_cell({ c: 5, r: rowIndex }),
      DURATION_FORMAT,
      detailNumberCellStyle,
    );
  }

  return sheet;
};

const createSummarySheet = (entries: NormalizedDetailedEntry[]): Worksheet => {
  const summary = buildSummaryStructure(entries);
  const lastColumnIndex = summary.dayKeys.length + 1;
  const headerRow = [
    "Tasks",
    ...summary.dayKeys.map((dayKey) =>
      toExcelDateSerial(summary.dayDates.get(dayKey)!),
    ),
    "Grand Total",
  ];
  const dataRows = summary.rows.map((row) => {
    return [
      row.label,
      ...summary.dayKeys.map((dayKey) => {
        const totalSeconds = row.totalsByDate.get(dayKey) ?? 0;

        return totalSeconds > 0 ? toExcelDurationSerial(totalSeconds) : "";
      }),
      toExcelDurationSerial(row.totalSeconds),
    ];
  });
  const values = [headerRow, ...dataRows];
  const sheet = XLSX.utils.aoa_to_sheet(values) as Worksheet;

  sheet["!cols"] = [
    { wch: 64 },
    ...new Array(Math.max(lastColumnIndex, 1))
      .fill(null)
      .map(() => ({ width: summaryDayColumnWidth })),
  ];
  sheet["!rows"] = [
    { hpx: summaryHeaderRowHeightPx },
    ...new Array(summary.rows.length)
      .fill(null)
      .map(() => ({ hpx: normalRowHeightPx })),
  ];

  for (let columnIndex = 0; columnIndex <= lastColumnIndex; columnIndex += 1) {
    applyCellStyle(
      sheet,
      XLSX.utils.encode_cell({ c: columnIndex, r: 0 }),
      columnIndex === 0
        ? summaryHeaderFirstColumnStyle
        : summaryHeaderCenteredStyle,
    );
  }

  for (let dayOffset = 0; dayOffset < summary.dayKeys.length; dayOffset += 1) {
    const headerAddress = XLSX.utils.encode_cell({ c: dayOffset + 1, r: 0 });

    applyNumberCellFormatting(
      sheet,
      headerAddress,
      DATE_FORMAT,
      summaryHeaderCenteredStyle,
    );
  }

  summary.rows.forEach((row, rowOffset) => {
    const rowIndex = rowOffset + 1;
    const isProjectRow = row.kind === "project";
    const isGrandTotalRow = row.kind === "grand-total";
    const isFirstBodyRow = rowOffset === 0;
    const labelStyle = isGrandTotalRow
      ? totalRowStyle
      : isProjectRow
        ? projectRowStyle
        : descriptionLabelStyle;
    const numberStyle = isGrandTotalRow
      ? totalValueCellStyle
      : isProjectRow
        ? groupValueCellStyle
        : summaryValueCellStyle;

    applyCellStyle(
      sheet,
      XLSX.utils.encode_cell({ c: 0, r: rowIndex }),
      isFirstBodyRow
        ? withBorderOverride(labelStyle, headerDividerBorder)
        : labelStyle,
    );

    for (
      let columnIndex = 1;
      columnIndex <= lastColumnIndex;
      columnIndex += 1
    ) {
      const address = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex });
      const cell = sheet[address];
      const styledNumberCell = isFirstBodyRow
        ? withBorderOverride(numberStyle, headerDividerBorder)
        : numberStyle;
      const styledBlankCell = isGrandTotalRow
        ? totalValueCellStyle
        : isFirstBodyRow
          ? withBorderOverride(numberStyle, headerDividerBorder)
          : numberStyle;

      if (typeof cell?.v === "number") {
        applyNumberCellFormatting(
          sheet,
          address,
          DURATION_FORMAT,
          styledNumberCell,
        );
      } else {
        setBlankStyledCell(sheet, address, styledBlankCell);
      }
    }
  });

  return sheet;
};

const buildSummaryStructure = (
  entries: NormalizedDetailedEntry[],
): SummaryStructure => {
  const dayDates = new Map<string, DateTime>();
  const projectMap = new Map<
    string,
    {
      totalsByDate: Map<string, number>;
      descriptions: Map<string, Map<string, number>>;
    }
  >();
  const grandTotalsByDate = new Map<string, number>();

  entries.forEach((entry) => {
    const dayKey = entry.displayDate.toFormat("yyyy-MM-dd");

    if (!dayDates.has(dayKey)) {
      dayDates.set(dayKey, entry.displayDate);
    }

    const projectKey = entry.projectName;
    const projectGroup = projectMap.get(projectKey) ?? {
      totalsByDate: new Map<string, number>(),
      descriptions: new Map<string, Map<string, number>>(),
    };
    const descriptionTotals =
      projectGroup.descriptions.get(entry.description) ??
      new Map<string, number>();

    incrementMap(projectGroup.totalsByDate, dayKey, entry.durationSeconds);
    incrementMap(descriptionTotals, dayKey, entry.durationSeconds);
    incrementMap(grandTotalsByDate, dayKey, entry.durationSeconds);

    projectGroup.descriptions.set(entry.description, descriptionTotals);
    projectMap.set(projectKey, projectGroup);
  });

  const dayKeys = [...dayDates.keys()].sort();
  const rows: SummaryRow[] = [];

  for (const [projectLabel, projectGroup] of projectMap.entries()) {
    rows.push({
      label: projectLabel,
      kind: "project",
      totalsByDate: projectGroup.totalsByDate,
      totalSeconds: sumMapValues(projectGroup.totalsByDate),
    });

    for (const [
      descriptionLabel,
      descriptionTotals,
    ] of projectGroup.descriptions.entries()) {
      rows.push({
        label: descriptionLabel,
        kind: "description",
        totalsByDate: descriptionTotals,
        totalSeconds: sumMapValues(descriptionTotals),
      });
    }
  }

  rows.push({
    label: "Grand Total",
    kind: "grand-total",
    totalsByDate: grandTotalsByDate,
    totalSeconds: sumMapValues(grandTotalsByDate),
  });

  return {
    dayKeys,
    dayDates,
    rows,
  };
};

const parseDisplayDateTime = (
  entry: ClockifyDetailedTimeEntry,
  boundary: "start" | "end",
  fallback?: DateTime,
): DateTime => {
  const zonedValue =
    boundary === "start"
      ? entry.timeInterval?.zonedStart
      : entry.timeInterval?.zonedEnd;
  const rawValue =
    boundary === "start" ? entry.timeInterval?.start : entry.timeInterval?.end;

  for (const candidate of [zonedValue, rawValue]) {
    if (!candidate) {
      continue;
    }

    const parsed = DateTime.fromISO(candidate, { setZone: true });

    if (parsed.isValid) {
      return parsed;
    }
  }

  return fallback ?? DateTime.fromMillis(0, { zone: "UTC" });
};

const toExcelDateSerial = (dateTime: DateTime): number =>
  (Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day) - EXCEL_EPOCH_MS) /
  MS_PER_DAY;

const toExcelTimeSerial = (dateTime: DateTime): number =>
  (dateTime.hour * 60 * 60 +
    dateTime.minute * 60 +
    dateTime.second +
    dateTime.millisecond / 1000) /
  (24 * 60 * 60);

const toExcelDurationSerial = (durationSeconds: number): number =>
  durationSeconds / (24 * 60 * 60);

const incrementMap = (
  totals: Map<string, number>,
  key: string,
  value: number,
): void => {
  totals.set(key, (totals.get(key) ?? 0) + value);
};

const sumMapValues = (totals: Map<string, number>): number =>
  [...totals.values()].reduce((sum, value) => sum + value, 0);

const applyCellStyle = (
  sheet: Worksheet,
  address: string,
  style: unknown,
): void => {
  const cell = sheet[address];

  if (!cell) {
    return;
  }

  (cell as XLSX.CellObject & { s?: unknown }).s = style;
};

const applyNumberCellFormatting = (
  sheet: Worksheet,
  address: string,
  numberFormat: string,
  style: unknown,
): void => {
  const cell = sheet[address];

  if (!cell) {
    return;
  }

  cell.t = "n";
  cell.z = numberFormat;
  (cell as XLSX.CellObject & { s?: unknown }).s = style;
};

const withBorderOverride = <T extends { border?: unknown }>(
  style: T,
  border: unknown,
): T => ({
  ...style,
  border,
});

const setBlankStyledCell = (
  sheet: Worksheet,
  address: string,
  style: unknown,
): void => {
  sheet[address] = {
    t: "s",
    v: "",
    s: style,
  } as XLSX.CellObject & { s?: unknown };
};

const escapeCsvValue = (
  value: DetailedEntryRow[keyof DetailedEntryRow],
): string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  const stringValue = value ?? "";
  const escapedValue = String(stringValue).replace(/"/g, '""');

  return /[",\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
};

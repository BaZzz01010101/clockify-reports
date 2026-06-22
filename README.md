# Clockify Reports

Desktop Electron app for exporting Clockify detailed reports without using the Clockify web UI for the export step.

The app is intentionally narrow in scope:

- Clockify Cloud only
- API key authentication only
- detailed report export only
- JSON, CSV, and XLSX output

It uses documented Clockify APIs for authentication, workspace discovery, and detailed report retrieval. CSV and XLSX are generated locally from the JSON report payload.

## Features

- Validate and store a Clockify API key in the local OS keychain
- Load available workspaces from the authenticated Clockify account
- Select a date range with presets:
  - This week
  - Last week
  - This month
  - Last month
  - Custom
- Export detailed reports as:
  - `JSON`
  - `CSV`
  - `XLSX`
- Generate an Excel workbook with:
  - `Summary` sheet
  - `Details` sheet
- Block export when time records overlap by more than 1 minute
- Show overlapping records with dates and a direct link to `https://app.clockify.me/calendar`
- Open the exported file, open its folder, or copy its path after export
- Package the app for desktop distribution with Electron Forge

## How It Works

The app currently uses these Clockify endpoints:

- `GET https://api.clockify.me/api/v1/user`
- `GET https://api.clockify.me/api/v1/workspaces`
- `POST https://reports.api.clockify.me/v1/workspaces/{workspaceId}/reports/detailed`

Detailed reports are fetched with:

- `X-Api-Key` authentication
- Clockify user timezone-aware date boundaries
- internal pagination with page size `500`
- `exportType: JSON`

The JSON response is the canonical source. CSV and XLSX are built locally from that payload.

## Requirements

- Node.js LTS
- npm
- A Clockify account with a valid API key

## Install

```bash
npm install
```

## Run In Development

```bash
npm start
```

VS Code launch configurations are included in [.vscode/launch.json](.vscode/launch.json) for debugging the Electron app.

## Build

Build the Vite bundles:

```bash
npm run build
```

Create an unpackaged desktop build:

```bash
npm run package
```

Create installable/distributable artifacts:

```bash
npm run make
```

Expected outputs are written under `out/` and `out/make/`.

Configured makers:

- Windows: Squirrel installer
- macOS/Linux: ZIP
- Linux: DEB
- Linux: RPM

## Verify

```bash
npm run verify
```

This runs:

- TypeScript checks
- unit/integration tests with Vitest
- desktop smoke test with Playwright

## Usage

1. Launch the app.
2. Paste a Clockify API key and connect.
3. Select a workspace.
4. Select a preset or custom date range.
5. Choose an output format.
6. Export the report.

Notes:

- The API key is only saved after successful validation.
- The last selected workspace and export format are stored locally as preferences.
- Date boundaries are resolved using the authenticated Clockify user's timezone, not the local machine timezone.

## Export Formats

### JSON

Writes the raw combined detailed report payload returned from Clockify.

### CSV

Writes a flat table with one row per time entry.

Columns:

- `id`
- `userName`
- `clientName`
- `projectName`
- `taskName`
- `description`
- `tagNames`
- `billable`
- `start`
- `end`
- `durationSeconds`

### XLSX

Writes a workbook with two sheets:

- `Summary`
  - grouped, pivot-like summary generated programmatically
- `Details`
  - one row per entry with formatted date/time/duration columns

Default file names use this pattern:

```text
clockify-detailed-{workspaceName}-{fromDate}-{toDate}.{ext}
```

## Validation

Before saving an export, the app checks the retrieved time entries for overlaps.

- tolerance: `60` seconds
- scope: per user
- behavior: export is blocked when overlaps exceed the tolerance

When validation fails, the app shows:

- the overlap date
- the conflicting record pairs
- overlap duration
- a link to Clockify Calendar for cleanup

## Project Layout

```text
src/
  main/      Electron main process, IPC handlers, Clockify client, export logic
  preload/   Typed renderer bridge
  renderer/  React + Mantine UI
  shared/    Shared types and IPC contracts
tests/       Vitest and Playwright coverage
docs/        Research/spec notes
```

## Scope Limits

Out of scope for this project:

- Clockify username/password login flow
- browser session reuse
- web scraping of Clockify pages
- summary/weekly report API support outside the detailed report workflow
- background sync or scheduling
- export history beyond the current UI session

import { DateTime } from 'luxon';
import type {
  ClockifyDetailedReportResponse,
  ClockifySession,
  DetailedReportQuery,
  WorkspaceOption,
} from '@shared/types';

const CLOCKIFY_API_BASE_URL = 'https://api.clockify.me/api';
const CLOCKIFY_REPORTS_BASE_URL = 'https://reports.api.clockify.me';
const DETAILED_REPORT_PAGE_SIZE = 500;

export interface ClockifyDateRangeInput {
  fromDate: string;
  toDate: string;
  userTimeZone: string;
}

export interface ClockifyClientOptions {
  fetchFn?: typeof fetch;
}

export type ClockifyErrorCode = 'INVALID_API_KEY' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'API_ERROR';

export class ClockifyApiError extends Error {
  public readonly code: ClockifyErrorCode;
  public readonly retryable: boolean;
  public readonly status?: number;

  public constructor(message: string, code: ClockifyErrorCode, retryable: boolean, status?: number) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export const buildClockifyDateRange = ({
  fromDate,
  toDate,
  userTimeZone,
}: ClockifyDateRangeInput): { dateRangeStart: string; dateRangeEnd: string } => {
  const start = DateTime.fromISO(fromDate, { zone: userTimeZone }).startOf('day').toUTC();
  const end = DateTime.fromISO(toDate, { zone: userTimeZone }).endOf('day').toUTC();

  return {
    dateRangeStart: start.toISO({ suppressMilliseconds: false }) ?? '',
    dateRangeEnd: end.toISO({ suppressMilliseconds: false }) ?? '',
  };
};

export class ClockifyClient {
  private readonly fetchFn: typeof fetch;

  public constructor({ fetchFn = fetch }: ClockifyClientOptions = {}) {
    this.fetchFn = fetchFn;
  }

  public async validateApiKey(apiKey: string): Promise<ClockifySession> {
    const user = await this.requestJson<{ email?: string; settings?: { timeZone?: string } }>(
      `${CLOCKIFY_API_BASE_URL}/v1/user`,
      {
        method: 'GET',
        headers: this.buildHeaders(apiKey),
      },
    );

    return {
      apiKeyPresent: true,
      userEmail: user.email,
      userTimeZone: user.settings?.timeZone ?? 'UTC',
    };
  }

  public async getWorkspaces(apiKey: string): Promise<WorkspaceOption[]> {
    const workspaces = await this.requestJson<Array<{ id: string; name: string }>>(
      `${CLOCKIFY_API_BASE_URL}/v1/workspaces`,
      {
        method: 'GET',
        headers: this.buildHeaders(apiKey),
      },
    );

    return workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
    }));
  }

  public async getDetailedReport({
    apiKey,
    workspaceId,
    fromDate,
    toDate,
    userTimeZone,
  }: DetailedReportQuery): Promise<ClockifyDetailedReportResponse> {
    const range = buildClockifyDateRange({ fromDate, toDate, userTimeZone });
    const timeentries: ClockifyDetailedReportResponse['timeentries'] = [];
    let totals: ClockifyDetailedReportResponse['totals'] = [];
    let page = 1;

    while (true) {
      const pageResponse = await this.requestJson<ClockifyDetailedReportResponse>(
        `${CLOCKIFY_REPORTS_BASE_URL}/v1/workspaces/${workspaceId}/reports/detailed`,
        {
          method: 'POST',
          headers: this.buildHeaders(apiKey),
          body: JSON.stringify({
            ...range,
            exportType: 'JSON',
            detailedFilter: {
              page,
              pageSize: DETAILED_REPORT_PAGE_SIZE,
            },
          }),
        },
      );

      totals = totals.length > 0 ? totals : (pageResponse.totals ?? []);
      timeentries.push(...(pageResponse.timeentries ?? []));

      if ((pageResponse.timeentries ?? []).length < DETAILED_REPORT_PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    return {
      totals,
      timeentries,
    };
  }

  private buildHeaders(apiKey: string): HeadersInit {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    };
  }

  private async requestJson<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await this.fetchFn(input, init);
    } catch (error) {
      throw new ClockifyApiError(
        error instanceof Error ? error.message : 'Network request failed',
        'NETWORK_ERROR',
        true,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ClockifyApiError('Invalid Clockify API key', 'INVALID_API_KEY', false, response.status);
    }

    if (response.status === 429) {
      throw new ClockifyApiError('Clockify API rate limit exceeded', 'RATE_LIMIT', true, response.status);
    }

    if (!response.ok) {
      throw new ClockifyApiError(
        `Clockify API request failed with status ${response.status}`,
        'API_ERROR',
        false,
        response.status,
      );
    }

    return (await response.json()) as T;
  }
}

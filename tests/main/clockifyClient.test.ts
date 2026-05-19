import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockifyApiError, ClockifyClient, buildClockifyDateRange } from '@main/services/clockifyClient';

const createJsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('buildClockifyDateRange', () => {
  it('converts inclusive local dates using the authenticated user timezone', () => {
    const range = buildClockifyDateRange({
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      userTimeZone: 'Europe/Madrid',
    });

    expect(range).toEqual({
      dateRangeStart: '2026-05-03T22:00:00.000Z',
      dateRangeEnd: '2026-05-10T21:59:59.999Z',
    });
  });
});

describe('ClockifyClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('validates an API key through the user endpoint and returns session data', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(200, {
        email: 'user@example.com',
        settings: {
          timeZone: 'Europe/Madrid',
        },
      }),
    );

    const client = new ClockifyClient({ fetchFn: fetchMock });

    await expect(client.validateApiKey('test-api-key')).resolves.toEqual({
      apiKeyPresent: true,
      userEmail: 'user@example.com',
      userTimeZone: 'Europe/Madrid',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.clockify.me/api/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Api-Key': 'test-api-key',
        }),
      }),
    );
  });

  it('loads workspaces from the cloud workspace endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(200, [
        { id: 'ws-1', name: 'Alpha' },
        { id: 'ws-2', name: 'Beta' },
      ]),
    );

    const client = new ClockifyClient({ fetchFn: fetchMock });

    await expect(client.getWorkspaces('test-api-key')).resolves.toEqual([
      { id: 'ws-1', name: 'Alpha' },
      { id: 'ws-2', name: 'Beta' },
    ]);
  });

  it('paginates the detailed report until the response page is smaller than page size', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          totals: [{ totalTime: 7200 }],
          timeentries: Array.from({ length: 500 }, (_, index) => ({
            id: `entry-${index + 1}`,
            userName: 'Ada Lovelace',
            clientName: 'CAKE',
            projectName: 'Clockify',
            taskName: 'Research',
            description: 'Investigate data',
            tags: [{ name: 'Export' }],
            billable: true,
            timeInterval: {
              start: '2026-05-04T08:00:00.000Z',
              end: '2026-05-04T08:30:00.000Z',
              duration: 'PT30M',
            },
          })),
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          totals: [{ totalTime: 1800 }],
          timeentries: [
            {
              id: 'entry-501',
              userName: 'Ada Lovelace',
              clientName: 'CAKE',
              projectName: 'Clockify',
              taskName: 'Review',
              description: 'Verify export',
              tags: [],
              billable: false,
              timeInterval: {
                start: '2026-05-05T08:00:00.000Z',
                end: '2026-05-05T08:30:00.000Z',
                duration: 'PT30M',
              },
            },
          ],
        }),
      );

    const client = new ClockifyClient({ fetchFn: fetchMock });

    const result = await client.getDetailedReport({
      apiKey: 'test-api-key',
      workspaceId: 'ws-1',
      fromDate: '2026-05-04',
      toDate: '2026-05-10',
      userTimeZone: 'Europe/Madrid',
    });

    expect(result.timeentries).toHaveLength(501);
    expect(result.timeentries.at(-1)?.id).toBe('entry-501');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://reports.api.clockify.me/v1/workspaces/ws-1/reports/detailed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          dateRangeStart: '2026-05-03T22:00:00.000Z',
          dateRangeEnd: '2026-05-10T21:59:59.999Z',
          exportType: 'JSON',
          detailedFilter: {
            page: 1,
            pageSize: 500,
          },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://reports.api.clockify.me/v1/workspaces/ws-1/reports/detailed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          dateRangeStart: '2026-05-03T22:00:00.000Z',
          dateRangeEnd: '2026-05-10T21:59:59.999Z',
          exportType: 'JSON',
          detailedFilter: {
            page: 2,
            pageSize: 500,
          },
        }),
      }),
    );
  });

  it('maps 401 responses to an invalid-api-key error', async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse(401, { message: 'Unauthorized' }));

    const client = new ClockifyClient({ fetchFn: fetchMock });

    await expect(client.validateApiKey('bad-key')).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    });
  });

  it('maps 429 responses to a rate-limit error', async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse(429, { message: 'Too many requests' }));

    const client = new ClockifyClient({ fetchFn: fetchMock });

    await expect(
      client.getDetailedReport({
        apiKey: 'test-api-key',
        workspaceId: 'ws-1',
        fromDate: '2026-05-04',
        toDate: '2026-05-10',
        userTimeZone: 'UTC',
      }),
    ).rejects.toMatchObject({
      code: 'RATE_LIMIT',
    });
  });

  it('maps transport failures to a retry-safe network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));

    const client = new ClockifyClient({ fetchFn: fetchMock });

    await expect(client.getWorkspaces('test-api-key')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  });
});

// src/api/__tests__/productJobs.test.js
//
// Pattern 15 (R2/S3 migration audit) — "image worker retries/failure
// state". Tests waitForProductJob directly (not through the full
// ProductForm component, unlike src/component/Adminlogin/__tests__/
// ProductForm.test.jsx) so the timeout-exhaustion path can be exercised
// with fake timers instead of waiting out MAX_POLLS real seconds.
jest.mock('../apiClient', () => {
  const fn = jest.fn();
  fn.get = jest.fn();
  return { __esModule: true, default: fn };
});

// eslint-disable-next-line import/first
import apiClient from '../apiClient';
// eslint-disable-next-line import/first
import { waitForProductJob } from '../productJobs';

// jest.advanceTimersByTimeAsync (needed to drive a loop with two awaits
// per iteration — the API call, then the poll delay — under fake timers)
// isn't available until Jest 29; react-scripts 5's bundled Jest is 27.
// Rather than fight legacy-timer/microtask interleaving, these two
// multi-poll tests shrink the real setTimeout delay to near-zero instead —
// still genuine async control flow (no mocked Promise/timer internals),
// just fast.
const withInstantPolling = (run) => async () => {
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (fn) => originalSetTimeout(fn, 0);
  try {
    await run();
  } finally {
    global.setTimeout = originalSetTimeout;
  }
};

describe('waitForProductJob', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('returns immediately once the job has completed', async () => {
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'j1', state: 'completed', result: { id: 'p1' } } },
    });

    const result = await waitForProductJob('j1');

    expect(result).toEqual({ jobId: 'j1', state: 'completed', result: { id: 'p1' } });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns immediately once the job has failed, with the failure reason', async () => {
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'j1', state: 'failed', failedReason: 'R2 unavailable' } },
    });

    const result = await waitForProductJob('j1');

    expect(result).toEqual({ jobId: 'j1', state: 'failed', failedReason: 'R2 unavailable' });
  });

  it(
    'keeps polling while the job is still in progress',
    withInstantPolling(async () => {
      apiClient.get
        .mockResolvedValueOnce({ data: { data: { jobId: 'j1', state: 'active' } } })
        .mockResolvedValueOnce({ data: { data: { jobId: 'j1', state: 'active' } } })
        .mockResolvedValueOnce({
          data: { data: { jobId: 'j1', state: 'completed', result: { id: 'p1' } } },
        });

      const result = await waitForProductJob('j1');

      expect(result).toEqual({ jobId: 'j1', state: 'completed', result: { id: 'p1' } });
      expect(apiClient.get).toHaveBeenCalledTimes(3);
    })
  );

  // The real defect this guards against: MAX_POLLS previously gave up
  // (25s) before the backend's own guaranteed-minimum retry window
  // (30s — see jobs/queues/imageQueue.js's attempts/backoff) could ever
  // reach 'failed'. A job that never resolves within the ceiling must be
  // reported as an honest timeout, not silently mistaken for success.
  it(
    'reports a timeout after exhausting every poll, without ever claiming success',
    withInstantPolling(async () => {
      apiClient.get.mockResolvedValue({ data: { data: { state: 'active' } } });

      const result = await waitForProductJob('j1');

      expect(result).toEqual({ jobId: 'j1', state: 'unknown', timedOut: true });
      expect(apiClient.get).toHaveBeenCalledTimes(45);
    })
  );

  it('stops polling and throws when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitForProductJob('j1', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

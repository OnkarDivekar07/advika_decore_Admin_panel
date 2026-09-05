// src/api/productJobs.js
//
// Product create/update is processed asynchronously on the backend (see
// backend/src/modules/product/product.service.js's queueProductCreation/
// queueProductUpdate, and jobs/workers/imageWorker.js) — POST/PATCH
// return only { jobId }, not the finished product. This polls
// GET /api/products/jobs/:jobId (admin-only) until the job completes or
// fails, so the UI can tell the truth about whether the write actually
// landed instead of guessing with a fixed timeout.
import apiClient from './apiClient';

const POLL_INTERVAL_MS = 1000;
// ~45s ceiling before we stop waiting and say so. Must comfortably exceed
// the backend's own worst-case time-to-'failed' (backend 2.0's
// jobs/queues/imageQueue.js: attempts: 3 with exponential backoff,
// delay: 10000 — a job that keeps failing waits 10s then 20s between
// retries, 30s of backoff alone before the 3rd/final attempt even runs,
// on top of each attempt's own execution time). This used to be 25,
// which is provably shorter than that 30s floor — every sustained
// image-processing failure (e.g. a real R2 outage) was guaranteed to hit
// this ceiling and report the ambiguous "still processing" message
// instead of the real failure, well before the backend ever reached
// 'failed'. If that backend retry policy changes, this needs to move
// with it.
const MAX_POLLS = 45;

/**
 * @param {string} jobId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ state: string, result?: object, failedReason?: string, timedOut?: boolean }>}
 */
export const waitForProductJob = async (jobId, { signal } = {}) => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // eslint-disable-next-line no-await-in-loop
    const response = await apiClient.get(`/api/products/jobs/${jobId}`, { signal });
    const status = response.data?.data;

    if (status?.state === 'completed' || status?.state === 'failed') {
      return status;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return { jobId, state: 'unknown', timedOut: true };
};

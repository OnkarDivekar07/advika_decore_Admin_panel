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
const MAX_POLLS = 25; // ~25s ceiling before we stop waiting and say so

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

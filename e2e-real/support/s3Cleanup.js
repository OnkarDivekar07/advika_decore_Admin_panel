// e2e-real/support/s3Cleanup.js
//
// Tracks the real S3 image URLs a real admin real-E2E product-creation
// test uploaded, and deletes exactly those objects afterward — see
// backend 2.0/tests/e2e-helpers/cleanupE2EUploads.js for the full
// rationale (real bucket, isolated by the uploaded file's own distinctive
// "e2e-fixture-" basename, no application code changed).
const path = require('path');
const { deleteE2EUploads } = require('../../../backend 2.0/tests/e2e-helpers/cleanupE2EUploads');

const recordedUrls = [];

function recordUploadedImageUrls(urls) {
  recordedUrls.push(...urls);
}

function keyFromS3Url(url) {
  // e.g. https://advikaauto.s3.ap-south-1.amazonaws.com/product-images/172_0_e2e-fixture-x.webp
  const marker = '.amazonaws.com/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

async function cleanupRecordedUploads() {
  if (recordedUrls.length === 0) return;
  const keys = recordedUrls.map(keyFromS3Url).filter(Boolean);
  if (keys.length === 0) return;

  // Loads the same AWS credentials the real E2E backend process itself
  // used (backend 2.0/.env.e2e) — this cleanup script isn't spawned as
  // part of that process, so it needs its own env load.
  require('dotenv').config({
    path: path.join(__dirname, '..', '..', '..', 'backend 2.0', '.env.e2e'),
  });

  const result = await deleteE2EUploads(process.env.BUCKET_NAME, keys);
  console.log(
    `[s3Cleanup] deleted ${result.deleted} E2E-uploaded image(s), skipped ${result.skipped}.`
  );
}

module.exports = { recordUploadedImageUrls, cleanupRecordedUploads };

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

function keyFromUploadUrl(url) {
  // New uploads (post R2 migration) look like
  // https://media.advikadecore.com/product-images/172_0_e2e-fixture-x.webp
  // — strip the known public-URL prefix from env. Falls back to the old
  // S3 marker so this still works against any pre-migration URL.
  const r2Prefix = `${(process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')}/`;
  if (r2Prefix !== '/' && url.startsWith(r2Prefix)) {
    return url.slice(r2Prefix.length);
  }
  const s3Marker = '.amazonaws.com/';
  const idx = url.indexOf(s3Marker);
  return idx === -1 ? null : url.slice(idx + s3Marker.length);
}

async function cleanupRecordedUploads() {
  if (recordedUrls.length === 0) return;

  // Loads the same credentials the real E2E backend process itself used
  // (backend 2.0/.env.e2e) — this cleanup script isn't spawned as part of
  // that process, so it needs its own env load. Done before parsing keys
  // since key parsing now depends on R2_PUBLIC_URL being loaded.
  require('dotenv').config({
    path: path.join(__dirname, '..', '..', '..', 'backend 2.0', '.env.e2e'),
  });

  const keys = recordedUrls.map(keyFromUploadUrl).filter(Boolean);
  if (keys.length === 0) return;

  const result = await deleteE2EUploads(process.env.R2_BUCKET_NAME, keys);
  console.log(
    `[s3Cleanup] deleted ${result.deleted} E2E-uploaded image(s), skipped ${result.skipped}.`
  );
}

module.exports = { recordUploadedImageUrls, cleanupRecordedUploads };

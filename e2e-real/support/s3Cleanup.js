// e2e-real/support/s3Cleanup.js
//
// Tracks the real S3 image URLs a real admin real-E2E product-creation
// test uploaded, and deletes exactly those objects afterward — see
// backend 2.0/tests/e2e-helpers/cleanupE2EUploads.js for the full
// rationale (real bucket, isolated by the uploaded file's own distinctive
// "e2e-fixture-" basename, no application code changed).
const path = require('path');
const {
  deleteE2EUploads,
  objectExistsInR2,
} = require('../../../backend 2.0/tests/e2e-helpers/cleanupE2EUploads');

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

// Loads the same credentials the real E2E backend process itself used
// (backend 2.0/.env.e2e) — these support scripts aren't spawned as part of
// that process, so they need their own env load. dotenv.config() doesn't
// overwrite already-set vars, so calling this more than once is harmless.
function loadE2EEnv() {
  require('dotenv').config({
    path: path.join(__dirname, '..', '..', '..', 'backend 2.0', '.env.e2e'),
  });
}

// Pattern 14: direct, real-bucket proof that a superseded product image was
// actually deleted from R2 (not an inference from the app's own response) —
// resolves the public URL to its object key the same way cleanup does, then
// asks R2 itself whether the object is still there.
async function imageExistsInR2(url) {
  loadE2EEnv();
  const key = keyFromUploadUrl(url);
  if (!key) throw new Error(`Could not derive an R2 key from URL: ${url}`);
  return objectExistsInR2(process.env.R2_BUCKET_NAME, key);
}

async function cleanupRecordedUploads() {
  if (recordedUrls.length === 0) return;

  // Done before parsing keys since key parsing depends on R2_PUBLIC_URL
  // being loaded.
  loadE2EEnv();

  const keys = recordedUrls.map(keyFromUploadUrl).filter(Boolean);
  if (keys.length === 0) return;

  const result = await deleteE2EUploads(process.env.R2_BUCKET_NAME, keys);
  console.log(
    `[s3Cleanup] deleted ${result.deleted} E2E-uploaded image(s), skipped ${result.skipped}.`
  );
}

module.exports = { recordUploadedImageUrls, cleanupRecordedUploads, imageExistsInR2 };

// e2e-real/fixtures/e2eData.js — real-run identifiers for the admin real
// E2E layer. See frontend-improved/e2e-real/fixtures/e2eData.js for the
// same "fixed identifiers are safe because the DB is reset+reseeded before
// a full run; run-unique identifiers are used for anything created live"
// reasoning.
const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// Must match backend 2.0/.env.e2e's ADMIN_EMAIL/ADMIN_PASSWORD, seeded by
// prisma/seed.js's seedAdmin() when pointed at .env.e2e.
const E2E_ADMIN_EMAIL = 'e2e-admin@advika-e2e.test';
const E2E_ADMIN_PASSWORD = 'E2eAdmin@12345';

const E2E_CUSTOMER_PHONE = '9812345670'; // same customer frontend-improved's real E2E layer logs in as
const E2E_OTP = '123456';

function uniqueProductName(label) {
  return `E2E-${label}-${runId}`;
}

// The image filename an admin real-E2E product-creation test uploads.
// Deliberately distinctive ("e2e-fixture-") so the resulting S3 key
// (product-images/{timestamp}_{index}_e2e-fixture-{runId}.webp — see
// src/utils/bannerHelpers.js's generateUniqueProductFilenames) can be
// safely identified and deleted afterward — see
// backend 2.0/tests/e2e-helpers/cleanupE2EUploads.js. The actual image
// bytes are read from the repo's existing public/admin-logo.png at test
// time (see admin-journey.spec.js) — no new binary fixture file is needed.
function e2eFixtureImageName() {
  return `e2e-fixture-${runId}.png`;
}

module.exports = {
  runId,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_CUSTOMER_PHONE,
  E2E_OTP,
  uniqueProductName,
  e2eFixtureImageName,
};

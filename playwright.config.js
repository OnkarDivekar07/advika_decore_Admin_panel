// playwright.config.js — admin panel E2E (real CRA dev server, real
// React tree; backend network boundary intercepted per-test — see
// e2e/support/mockApi.js for why).
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');

// Only used in the sandboxed environment this suite was originally
// authored in, where browsers ship pre-installed at this fixed path and
// `npx playwright install` isn't available. On a normal machine (where
// you've run `npx playwright install chromium`), this path won't exist
// and Playwright falls back to its own default browser resolution —
// don't hardcode a path here, or every other machine breaks.
const SANDBOX_CHROMIUM_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const sandboxExecutablePath = fs.existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

// --- Real full-stack E2E project ---------------------------------------
// A second, fully separate project (own testDir, own dev server port) next
// to the existing mocked "chromium" project above — that project and every
// spec under e2e/ are UNCHANGED. This one (testDir e2e-real/) runs a real
// CRA dev server on a different port (3002, so it can run alongside the
// mocked dev server on 3001) pointed at the REAL backend (see
// backend 2.0/.env.e2e + `npm run e2e:server`, started separately). No
// page.route() interception happens anywhere under e2e-real/ — see
// e2e-real/support/realApi.js.
const E2E_REAL_PORT = 3002;

module.exports = defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // `webServer` is a top-level-only config option (a single object or
  // array) — Playwright does NOT read a `webServer` key nested inside an
  // individual `projects[]` entry (it's silently ignored; confirmed the
  // hard way in frontend-improved's identical config, where nesting it per
  // project meant neither dev server ever actually started). An array
  // here starts both regardless of which project you run with
  // `--project=`; each one no-ops instantly via reuseExistingServer if its
  // own port is already up.
  // Running both CRA dev servers at once is memory-heavy (see the
  // `workers` comment below) — E2E_REAL_ONLY=1 skips starting the mocked
  // project's own dev server when you only intend to run
  // `--project=admin-real` (see repo root's E2E_REAL_README.md).
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : [
        ...(process.env.E2E_REAL_ONLY
          ? []
          : [
              {
                command: 'npm start',
                url: 'http://localhost:3001',
                reuseExistingServer: !process.env.CI,
                timeout: 120000,
                env: {
                  PORT: '3001',
                  BROWSER: 'none',
                  REACT_APP_API_URL: process.env.E2E_API_URL || 'http://localhost:5000',
                  NODE_OPTIONS: '--max-old-space-size=4096',
                },
              },
            ]),
        {
          command: 'npm start',
          url: `http://localhost:${E2E_REAL_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          env: {
            PORT: String(E2E_REAL_PORT),
            BROWSER: 'none',
            REACT_APP_API_URL: process.env.E2E_REAL_API_URL || 'http://localhost:5001',
            NODE_OPTIONS: '--max-old-space-size=4096',
          },
        },
      ],
  projects: [
    {
      name: 'chromium',
      testDir: './e2e',
      // CRA's webpack dev server (spawned once for the whole run, see
      // webServer above) keeps growing its own memory footprint the longer
      // it stays up serving an unbundled dev build — on a
      // memory-constrained machine, 2+ parallel workers hammering it with
      // page loads can run it out of heap mid-suite (observed as a
      // `FATAL ERROR: Zone Allocation failed` crash in the dev server
      // process, which then fails every subsequent test with a connection
      // error that has nothing to do with the test itself). 1 worker
      // locally trades some wall-clock time for not needing to debug that.
      workers: process.env.CI ? 2 : 1,
      use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
    {
      name: 'admin-real',
      testDir: './e2e-real',
      workers: 1,
      timeout: 60000,
      use: {
        baseURL: process.env.E2E_REAL_BASE_URL || `http://localhost:${E2E_REAL_PORT}`,
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
  ],
});

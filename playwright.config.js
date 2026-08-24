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

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CRA's webpack dev server (spawned once for the whole run, see
  // webServer below) keeps growing its own memory footprint the longer it
  // stays up serving an unbundled dev build — on a memory-constrained
  // machine, 2+ parallel workers hammering it with page loads can run it
  // out of heap mid-suite (observed as a `FATAL ERROR: Zone Allocation
  // failed` crash in the dev server process, which then fails every
  // subsequent test with a connection error that has nothing to do with
  // the test itself). 1 worker locally trades some wall-clock time for
  // not needing to debug that.
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(sandboxExecutablePath && { launchOptions: { executablePath: sandboxExecutablePath } }),
      },
    },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        // Passed directly to the spawned `npm start` process rather than
        // relying on a .env file — CRA defaults to PORT=3000 with no env
        // var/`.env` set, which silently starts the dev server on the
        // wrong port and makes this config's `url: 'http://localhost:3001'`
        // wait the full 120s for a server that's actually listening
        // elsewhere. This also works identically on Windows/macOS/Linux,
        // unlike `PORT=3001 npm start` shell syntax (POSIX-only — breaks
        // in PowerShell/cmd.exe).
        env: {
          PORT: '3001',
          BROWSER: 'none',
          REACT_APP_API_URL: process.env.E2E_API_URL || 'http://localhost:5000',
          // Raises the dev server's own V8 heap ceiling — see the
          // `workers` comment above for why this process can otherwise
          // run out of memory partway through a full E2E run.
          NODE_OPTIONS: '--max-old-space-size=4096',
        },
      },
});

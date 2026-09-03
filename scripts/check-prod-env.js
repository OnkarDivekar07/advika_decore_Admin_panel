// scripts/check-prod-env.js
//
// Runs as a `prebuild` hook (see package.json — npm runs this
// automatically before `npm run build`) so `react-scripts build` never
// even starts without a real REACT_APP_API_URL. CRA has no config-file
// hook the way vite.config.js does for frontend-improved's equivalent
// check, so this replicates just enough of CRA's own .env-file precedence
// (see https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used)
// to read the same value react-scripts itself would resolve.
//
// Why this matters: src/api/apiClient.js sets `baseURL:
// process.env.REACT_APP_API_URL` with NO fallback. If that's ever unset
// for a production build, `baseURL` is `undefined` — axios then resolves
// every relative request path against whatever origin the admin panel
// itself happens to be served from. If that's ever the same origin as the
// real backend (e.g. both behind one reverse proxy), it can even appear
// to work by pure coincidence, silently masking a real misconfiguration.
// If it's a different origin (the more common static-hosting setup), it
// fails with 404s. Either way, nobody decided that on purpose — this
// makes it a build-time failure instead.
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// CRA's own precedence for `npm run build` (NODE_ENV=production), highest
// priority first — a variable already found in an earlier file is never
// overridden by a later one.
const ENV_FILES_HIGH_TO_LOW_PRIORITY = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
];

function resolveReactAppApiUrl() {
  // An explicit environment variable (e.g. set by a deploy platform's
  // build settings, not a checked-in file) takes precedence over every
  // .env file, same as CRA itself.
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  for (const file of ENV_FILES_HIGH_TO_LOW_PRIORITY) {
    const parsed = parseEnvFile(path.join(__dirname, '..', file));
    if (parsed.REACT_APP_API_URL) return parsed.REACT_APP_API_URL;
  }
  return undefined;
}

const apiUrl = resolveReactAppApiUrl();
const looksLikeLocalhost = !apiUrl || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(apiUrl);

if (looksLikeLocalhost) {
  console.error(
    `\nRefusing to build: REACT_APP_API_URL is ${apiUrl ? `set to "${apiUrl}"` : 'not set'}.\n` +
      'Building without a real backend URL leaves apiClient.js\'s axios baseURL undefined, which ' +
      'resolves every request against whatever origin the admin panel itself is served from — silently ' +
      '"working" by coincidence if that happens to match the backend\'s origin, or 404ing if it doesn\'t.\n' +
      'Set REACT_APP_API_URL to the real backend URL via .env.production(.local) or your deploy ' +
      "platform's environment variables before building.\n"
  );
  process.exit(1);
}

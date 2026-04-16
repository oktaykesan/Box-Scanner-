// BoxScan — App Configuration
//
// Required environment variables (set in mobile/.env.local, never commit that file):
//
//   EXPO_PUBLIC_API_BASE_URL  (required)
//     The LAN URL of the backend server, reachable from the physical device or emulator.
//     Corresponds to APP_BASE_URL in backend/.env.
//     Example: http://192.168.1.100:3000
//
//   EXPO_PUBLIC_API_KEY  (required in production, optional in mock mode)
//     Must match API_SHARED_SECRET in backend/.env exactly.
//     Example: openssl rand -hex 32
//
// See mobile/.env.example for the full template.

const _rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const _rawApiKey = process.env.EXPO_PUBLIC_API_KEY;

// Fail-fast: crash at module load time rather than with a cryptic network error later.
if (!_rawApiBaseUrl || _rawApiBaseUrl.trim() === '') {
    throw new Error(
        '[BoxScan] EXPO_PUBLIC_API_BASE_URL is not set.\n' +
        'Create mobile/.env.local with EXPO_PUBLIC_API_BASE_URL=http://<host>:<port>\n' +
        'See mobile/.env.example for the full template.'
    );
}

if (!_rawApiKey || _rawApiKey.trim() === '') {
    console.warn(
        '[BoxScan] EXPO_PUBLIC_API_KEY is not set. ' +
        'All authenticated API requests will fail unless the backend is running in an open configuration. ' +
        'Set EXPO_PUBLIC_API_KEY in mobile/.env.local to match the backend API_SHARED_SECRET.'
    );
}

export const Config = {
    /** Backend API base URL — set via EXPO_PUBLIC_API_BASE_URL in mobile/.env.local */
    API_BASE_URL: _rawApiBaseUrl.trim(),

    /** Shared API secret — set via EXPO_PUBLIC_API_KEY in mobile/.env.local (never commit this value) */
    API_KEY: (_rawApiKey ?? '').trim(),

    /** Enable mock mode (no backend required) */
    MOCK_MODE: false,

    /** API request timeout in ms (normal endpoints) */
    REQUEST_TIMEOUT: 60000,

    /** Timeout for long-running AI / upload operations in ms */
    AI_REQUEST_TIMEOUT: 120000,

    /** Deep link scheme */
    DEEP_LINK_SCHEME: 'boxscan',

    /** Feature flags */
    features: {
        enablePrint: true,
        enableCamera: true,
        enableSearch: true,
    },
};

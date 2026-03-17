// BoxScan — App Configuration
// Sensitive values are loaded from environment variables at build time.
// Create a .env.local file (gitignored) with:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
//   EXPO_PUBLIC_API_KEY=<your-high-entropy-secret>
export const Config = {
    /** Backend API base URL — set via EXPO_PUBLIC_API_BASE_URL in .env.local */
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.247:3000',

    /** Shared API secret — set via EXPO_PUBLIC_API_KEY in .env.local (never commit this value) */
    API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',

    /** Enable mock mode (no backend required) */
    MOCK_MODE: false,

    /** API request timeout in ms */
    REQUEST_TIMEOUT: 30000,

    /** Deep link scheme */
    DEEP_LINK_SCHEME: 'boxscan',

    /** Feature flags */
    features: {
        enablePrint: true,
        enableCamera: true,
        enableSearch: true,
    },
};

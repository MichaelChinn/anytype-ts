// Global variables injected by rspack DefinePlugin
// These always have values - either from env vars or defaults
declare const SPARK_ONBOARDING_URL: string;
declare const SPARK_ONBOARDING_TOKEN: string;
declare const SPARK_ONBOARDING_NO_AUTH: string;
declare const SENTRY_DSN: string;
declare const __IS_EXTENSION__: string;

// Anytype-fork compile-time feature flags. See vite.config.ts and docs/PLAN.md.
declare const __FEATURE_CHANNELS__: boolean;
declare const __FEATURE_MEMBERSHIP__: boolean;
declare const __FEATURE_PUBLISHING__: boolean;
declare const __FEATURE_EXPERIENCE_GALLERY__: boolean;
declare const __FEATURE_CHAT__: boolean;
declare const __FEATURE_DIRECT_MESSAGES__: boolean;

declare module 'selection-ranges';
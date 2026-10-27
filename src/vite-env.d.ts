/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
    /** JSON. */
    readonly VITE_FIREBASE_CONFIG?: string;
    readonly VITE_FIREBASE_EMULATORS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

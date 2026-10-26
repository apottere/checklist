/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** JSON. */
    readonly VITE_FIREBASE_CONFIG?: string;
    readonly VITE_FIREBASE_EMULATORS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

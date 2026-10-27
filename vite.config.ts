import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';

/** The commit being built, so Settings can show which version is running. */
function version(): string {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'dev';
    }
}

export default defineConfig({
    // Set by the deploy workflow to the repo's GitHub Pages path.
    base: process.env.BASE_PATH ?? '/',
    define: {
        __APP_VERSION__: JSON.stringify(version()),
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    plugins: [
        solid(),
        VitePWA({
            // src/lib/updates.ts asks before reloading, so an update never drops an open sheet or a pending Undo.
            registerType: 'prompt',
            pwaAssets: {
                image: 'public/icon.svg',
                preset: 'minimal-2023',
                overrideManifestIcons: true,
                includeHtmlHeadLinks: true,
            },
            manifest: {
                name: 'Checklist',
                short_name: 'Checklist',
                display: 'standalone',
                theme_color: '#fbf8fd',
                background_color: '#fbf8fd',
            },
            workbox: {
                // Beer CSS ships four icon fonts; only the outlined one is used.
                globPatterns: ['**/*.{js,css,html,svg,png,ico}', 'assets/material-symbols-outlined-*.woff2'],
            },
        }),
    ],
    server: {
        port: 3000,
    },
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';

export default defineConfig({
    // Set by the deploy workflow to the repo's GitHub Pages path.
    base: process.env.BASE_PATH ?? '/',
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    plugins: [
        solid(),
        VitePWA({
            registerType: 'autoUpdate',
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

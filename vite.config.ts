import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';

export default defineConfig({
    // Served from https://<user>.github.io/checklist/
    base: '/checklist/',
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
                theme_color: '#1c1917',
                background_color: '#1c1917',
            },
        }),
    ],
    server: {
        port: 3000,
    },
});

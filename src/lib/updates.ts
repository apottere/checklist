import { registerSW } from 'virtual:pwa-register';
import { setStandingSnackbar, showSnackbar } from '@/lib/snackbar.ts';

/** An installed app can stay open for days, so checking only on load isn't enough. */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

let registration: ServiceWorkerRegistration | undefined;

const updateSW = registerSW({
    onNeedRefresh: () =>
        setStandingSnackbar({
            message: 'Update available',
            action: { label: 'Reload', run: () => void updateSW(true) },
        }),
    onRegisteredSW: (_url, reg) => {
        registration = reg;
        setInterval(() => void checkQuietly(), CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void checkQuietly();
        });
    },
});

async function checkQuietly(): Promise<void> {
    // Offline or a flaky connection; the next check will try again.
    await registration?.update().catch(() => undefined);
}

/** Finds a new version if there is one; `onNeedRefresh` then shows the prompt. */
export async function checkForUpdates(): Promise<void> {
    if (!registration) {
        showSnackbar({ message: "Updates aren't available here" });
        return;
    }
    try {
        await registration.update();
    } catch {
        showSnackbar({ message: "Couldn't check for updates" });
        return;
    }
    if (!registration.installing && !registration.waiting) showSnackbar({ message: "You're up to date" });
}

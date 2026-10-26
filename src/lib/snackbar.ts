import { createSignal } from 'solid-js';

export interface Snack {
    message: string;
    action?: { label: string; run: () => void };
}

const [snack, setSnack] = createSignal<Snack>();
let timer: ReturnType<typeof setTimeout> | undefined;

export { snack };

export function showSnackbar(value: Snack): void {
    setSnack(value);
    clearTimeout(timer);
    timer = setTimeout(() => setSnack(undefined), 5000);
}

export function dismissSnackbar(): void {
    clearTimeout(timer);
    setSnack(undefined);
}

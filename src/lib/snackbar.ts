import { createSignal } from 'solid-js';

export interface Snack {
    message: string;
    action?: { label: string; run: () => void };
}

const [current, setCurrent] = createSignal<Snack>();
/** Shown whenever no other snack is, until cleared. Used for prompts that shouldn't time out. */
const [standing, setStanding] = createSignal<Snack>();
let timer: ReturnType<typeof setTimeout> | undefined;

export const snack = (): Snack | undefined => current() ?? standing();

export { setStanding as setStandingSnackbar };

export function showSnackbar(value: Snack): void {
    setCurrent(value);
    clearTimeout(timer);
    timer = setTimeout(() => setCurrent(undefined), 5000);
}

export function dismissSnackbar(): void {
    clearTimeout(timer);
    setCurrent(undefined);
}

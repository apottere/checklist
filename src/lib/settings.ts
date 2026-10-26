// localStorage can throw in private mode or when storage is blocked.

export function loadSetting(key: string): string | undefined {
    try {
        return localStorage.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
}

export function saveSetting(key: string, value: string | undefined): void {
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        // Not worth surfacing.
    }
}

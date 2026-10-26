import { createSignal } from 'solid-js';

// Hash routing, since GitHub Pages can't rewrite paths to index.html.

export type Route =
    | { name: 'checklists' }
    | { name: 'checklist'; id: string }
    | { name: 'structure'; id: string }
    | { name: 'templates' }
    | { name: 'template'; id: string }
    | { name: 'archivedChecklists' }
    | { name: 'archivedTemplates' }
    | { name: 'settings' };

function parse(hash: string): Route {
    const [, a, b, c] = hash.replace(/^#/, '').split('/');
    if (a === 'c' && b && c === 'edit') return { name: 'structure', id: b };
    if (a === 'c' && b) return { name: 'checklist', id: b };
    if (a === 't' && b) return { name: 'template', id: b };
    if (a === 'templates') return { name: 'templates' };
    if (a === 'archive' && b === 'templates') return { name: 'archivedTemplates' };
    if (a === 'archive') return { name: 'archivedChecklists' };
    if (a === 'settings') return { name: 'settings' };
    return { name: 'checklists' };
}

export function href(route: Route): string {
    switch (route.name) {
        case 'checklists':
            return '#/';
        case 'checklist':
            return `#/c/${route.id}`;
        case 'structure':
            return `#/c/${route.id}/edit`;
        case 'templates':
            return '#/templates';
        case 'template':
            return `#/t/${route.id}`;
        case 'archivedChecklists':
            return '#/archive/checklists';
        case 'archivedTemplates':
            return '#/archive/templates';
        case 'settings':
            return '#/settings';
    }
}

const [hash, setHash] = createSignal(location.hash);
window.addEventListener('popstate', () => setHash(location.hash));

export const route = (): Route => parse(hash());

/** Top-level destinations replace history instead of stacking. */
export function navigate(to: Route, replace = false): void {
    if (replace) history.replaceState(history.state, '', href(to));
    else history.pushState({ inApp: true }, '', href(to));
    setHash(location.hash);
    scrollTo(0, 0);
}

/** Goes back if the previous entry is in this app, otherwise to `parent`. */
export function back(parent: Route): void {
    if ((history.state as { inApp?: boolean } | null)?.inApp) history.back();
    else navigate(parent, true);
}

import { Component, For, Match, Show, Switch } from 'solid-js';
import { User } from 'firebase/auth';
import { EmptyState } from '@/components/Visuals.tsx';
import { createStore, StoreContext } from '@/lib/data.ts';
import { navigate, Route, route } from '@/lib/router.ts';
import { dismissSnackbar, snack } from '@/lib/snackbar.ts';
import { ArchiveScreen } from '@/screens/ArchiveScreen.tsx';
import { ChecklistScreen } from '@/screens/ChecklistScreen.tsx';
import { ChecklistsScreen } from '@/screens/ChecklistsScreen.tsx';
import { signOutItem } from '@/screens/common.tsx';
import { SettingsScreen } from '@/screens/SettingsScreen.tsx';
import { StructureScreen } from '@/screens/StructureScreen.tsx';
import { TemplateScreen } from '@/screens/TemplateScreen.tsx';
import { TemplatesScreen } from '@/screens/TemplatesScreen.tsx';

export const Shell: Component<{ user: User }> = (props) => {
    const store = createStore();
    const r = route;
    const idOf = (): string => {
        const current = r();
        return 'id' in current ? current.id : '';
    };
    const destinations: { route: Route; also?: Route['name']; icon: string; label: string }[] = [
        { route: { name: 'checklists' }, icon: 'checklist', label: 'Checklists' },
        { route: { name: 'templates' }, icon: 'library_books', label: 'Templates' },
        { route: { name: 'archivedChecklists' }, also: 'archivedTemplates', icon: 'inventory_2', label: 'Archive' },
        { route: { name: 'settings' }, icon: 'settings', label: 'Settings' },
    ];
    const isActive = (d: (typeof destinations)[number]): boolean => r().name === d.route.name || r().name === d.also;
    const topLevel = (): boolean => destinations.some(isActive);
    const hasFab = (): boolean => ['checklists', 'templates', 'checklist'].includes(r().name);

    return (
        <StoreContext.Provider value={store}>
            <Switch>
                <Match when={store.error()?.code === 'permission-denied'}>
                    <main class="responsive middle-align center-align">
                        <EmptyState
                            icon="lock"
                            shape="sided-cookie6"
                            title="No access"
                            action={
                                <button class="border" onClick={() => signOutItem.onClick()}>
                                    Sign out
                                </button>
                            }
                        >
                            {props.user.email} isn't on the allowlist.
                        </EmptyState>
                    </main>
                </Match>
                <Match when={store.loading()}>
                    <main class="responsive middle-align center-align">
                        <progress class="circle" />
                    </main>
                </Match>
                <Match when={true}>
                    <Switch>
                        <Match when={r().name === 'checklists'}>
                            <ChecklistsScreen />
                        </Match>
                        <Match when={r().name === 'checklist'}>
                            <ChecklistScreen id={idOf()} />
                        </Match>
                        <Match when={r().name === 'structure'}>
                            <StructureScreen id={idOf()} />
                        </Match>
                        <Match when={r().name === 'templates'}>
                            <TemplatesScreen />
                        </Match>
                        <Match when={r().name === 'template'}>
                            <TemplateScreen id={idOf()} />
                        </Match>
                        <Match when={r().name === 'archivedChecklists'}>
                            <ArchiveScreen tab="checklists" />
                        </Match>
                        <Match when={r().name === 'archivedTemplates'}>
                            <ArchiveScreen tab="templates" />
                        </Match>
                        <Match when={r().name === 'settings'}>
                            <SettingsScreen user={props.user} />
                        </Match>
                    </Switch>
                    <Show when={topLevel()}>
                        <nav class="bottom">
                            <For each={destinations}>
                                {(d) => (
                                    <a classList={{ active: isActive(d) }} onClick={() => navigate(d.route, true)}>
                                        <i>{d.icon}</i>
                                        <span>{d.label}</span>
                                    </a>
                                )}
                            </For>
                        </nav>
                    </Show>
                </Match>
            </Switch>

            <div class="snackbar" classList={{ active: !!snack(), 'above-nav': topLevel(), 'above-fab': hasFab() }}>
                <div class="max">{snack()?.message}</div>
                <Show when={snack()?.action}>
                    {(action) => (
                        <a
                            class="inverse-link"
                            onClick={() => {
                                action().run();
                                dismissSnackbar();
                            }}
                        >
                            {action().label}
                        </a>
                    )}
                </Show>
            </div>
        </StoreContext.Provider>
    );
};

import { Component, Match, Show, Switch } from 'solid-js';
import { User } from 'firebase/auth';
import { createStore, StoreContext } from '@/lib/data.ts';
import { navigate, route } from '@/lib/router.ts';
import { dismissSnackbar, snack } from '@/lib/snackbar.ts';
import { ArchivedChecklistsScreen, ArchivedTemplatesScreen } from '@/screens/ArchiveScreen.tsx';
import { ChecklistScreen } from '@/screens/ChecklistScreen.tsx';
import { ChecklistsScreen } from '@/screens/ChecklistsScreen.tsx';
import { signOutItem } from '@/screens/common.tsx';
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
    const topLevel = (): boolean => r().name === 'checklists' || r().name === 'templates';

    return (
        <StoreContext.Provider value={store}>
            <Switch>
                <Match when={store.error()?.code === 'permission-denied'}>
                    <main class="responsive middle-align center-align">
                        <div>
                            <i class="extra error-text">block</i>
                            <h5>{props.user.email} isn't on the allowlist.</h5>
                            <button class="border" onClick={() => signOutItem.onClick()}>
                                Sign out
                            </button>
                        </div>
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
                            <ArchivedChecklistsScreen />
                        </Match>
                        <Match when={r().name === 'archivedTemplates'}>
                            <ArchivedTemplatesScreen />
                        </Match>
                    </Switch>
                    <Show when={topLevel()}>
                        <nav class="bottom">
                            <a
                                classList={{ active: r().name === 'checklists' }}
                                onClick={() => navigate({ name: 'checklists' }, true)}
                            >
                                <i>checklist</i>
                                <span>Checklists</span>
                            </a>
                            <a
                                classList={{ active: r().name === 'templates' }}
                                onClick={() => navigate({ name: 'templates' }, true)}
                            >
                                <i>library_books</i>
                                <span>Templates</span>
                            </a>
                        </nav>
                    </Show>
                </Match>
            </Switch>

            <div class="snackbar" classList={{ active: !!snack(), 'above-nav': topLevel() }}>
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

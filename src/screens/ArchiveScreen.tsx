import { Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { ConfirmDialog } from '@/components/Dialog.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import { deleteTemplate, setChecklistArchived, setTemplateArchived } from '@/lib/plan.ts';
import { navigate } from '@/lib/router.ts';
import { Template, WithId } from '@/lib/schema.ts';

const newestFirst = (a: { createdAt: number }, b: { createdAt: number }): number => b.createdAt - a.createdAt;

export const ArchiveScreen: Component<{ tab: 'checklists' | 'templates' }> = (props) => (
    <>
        <TopBar title="Archive" />
        <main class="responsive">
            <div class="tabs">
                <a
                    classList={{ active: props.tab === 'checklists' }}
                    onClick={() => navigate({ name: 'archivedChecklists' }, true)}
                >
                    Checklists
                </a>
                <a
                    classList={{ active: props.tab === 'templates' }}
                    onClick={() => navigate({ name: 'archivedTemplates' }, true)}
                >
                    Templates
                </a>
            </div>
            <Switch>
                <Match when={props.tab === 'checklists'}>
                    <ArchivedChecklists />
                </Match>
                <Match when={props.tab === 'templates'}>
                    <ArchivedTemplates />
                </Match>
            </Switch>
        </main>
    </>
);

const ArchivedChecklists: Component = () => {
    const { data } = useStore();
    const checklists = createMemo(() =>
        data()
            .checklists.filter((c) => c.archived)
            .sort(newestFirst)
    );

    return (
        <Show when={checklists().length > 0} fallback={<p class="empty">No archived checklists.</p>}>
            <ul class="list">
                <For each={checklists()}>
                    {(c) => (
                        <li>
                            <a class="max row-link" onClick={() => navigate({ name: 'checklist', id: c.id })}>
                                <span>{c.name}</span>
                                <span class="muted small-text">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </a>
                            <button
                                class="transparent"
                                onClick={() => commit(setChecklistArchived(data(), c.id, false))}
                            >
                                <i>unarchive</i>
                                <span>Restore</span>
                            </button>
                        </li>
                    )}
                </For>
            </ul>
        </Show>
    );
};

const ArchivedTemplates: Component = () => {
    const { data } = useStore();
    const templates = createMemo(() =>
        data()
            .templates.filter((t) => t.archived)
            .sort(newestFirst)
    );
    const [deleting, setDeleting] = createSignal<WithId<Template>>();

    return (
        <>
            <Show when={templates().length > 0} fallback={<p class="empty">No archived templates.</p>}>
                <ul class="list">
                    <For each={templates()}>
                        {(t) => (
                            <li>
                                <span class="max">{t.name}</span>
                                <button
                                    class="transparent"
                                    onClick={() => commit(setTemplateArchived(data(), t.id, false))}
                                >
                                    <i>unarchive</i>
                                    <span>Restore</span>
                                </button>
                                <button
                                    class="circle transparent"
                                    aria-label="Delete forever"
                                    onClick={() => setDeleting(t)}
                                >
                                    <i>delete_forever</i>
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <Show when={deleting()}>
                {(t) => (
                    <ConfirmDialog
                        open
                        title={`Delete "${t().name}" forever?`}
                        confirm="Delete"
                        onConfirm={() => commitWithUndo(deleteTemplate(data(), t().id), `Deleted "${t().name}"`)}
                        onClose={() => setDeleting(undefined)}
                    >
                        Checklists that use it keep their items.
                    </ConfirmDialog>
                )}
            </Show>
        </>
    );
};

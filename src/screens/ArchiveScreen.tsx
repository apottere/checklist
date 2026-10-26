import { Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { ConfirmDialog } from '@/components/Dialog.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { EmptyState } from '@/components/Visuals.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import { deleteChecklist, deleteTemplate, setChecklistArchived, setTemplateArchived } from '@/lib/plan.ts';
import { navigate } from '@/lib/router.ts';
import { Checklist, Template, WithId } from '@/lib/schema.ts';

const newestFirst = (a: { createdAt: number }, b: { createdAt: number }): number => b.createdAt - a.createdAt;

export const ArchiveScreen: Component<{ tab: 'checklists' | 'templates' }> = (props) => (
    <>
        <TopBar title="Archive" large />
        <main class="responsive">
            <div class="tabs archive-tabs">
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
    const [deleting, setDeleting] = createSignal<WithId<Checklist>>();

    return (
        <>
            <Show
                when={checklists().length > 0}
                fallback={
                    <EmptyState icon="inventory_2" shape="pentagon" title="No archived checklists">
                        Finished checklists end up here.
                    </EmptyState>
                }
            >
                <ul class="list tonal">
                    <For each={checklists()}>
                        {(c) => (
                            <li>
                                <span class="tile">
                                    <i>checklist</i>
                                </span>
                                <a class="max row-link" onClick={() => navigate({ name: 'checklist', id: c.id })}>
                                    <span>{c.name}</span>
                                    <span class="muted">Started {new Date(c.createdAt).toLocaleDateString()}</span>
                                </a>
                                <button
                                    class="transparent"
                                    onClick={() => commit(setChecklistArchived(data(), c.id, false))}
                                >
                                    <i>unarchive</i>
                                    <span>Restore</span>
                                </button>
                                <button
                                    class="circle transparent"
                                    aria-label="Delete forever"
                                    onClick={() => setDeleting(c)}
                                >
                                    <i>delete_forever</i>
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <Show when={deleting()}>
                {(c) => <DeleteChecklistDialog checklist={c()} onClose={() => setDeleting(undefined)} />}
            </Show>
        </>
    );
};

export const DeleteChecklistDialog: Component<{
    checklist: WithId<Checklist>;
    onClose: () => void;
    onDeleted?: () => void;
}> = (props) => {
    const { data } = useStore();
    return (
        <ConfirmDialog
            open
            title={`Delete "${props.checklist.name}" forever?`}
            confirm="Delete"
            onConfirm={() => {
                commitWithUndo(deleteChecklist(data(), props.checklist.id), `Deleted "${props.checklist.name}"`);
                props.onDeleted?.();
            }}
            onClose={() => props.onClose()}
        >
            Its items and their progress are deleted too.
        </ConfirmDialog>
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
            <Show
                when={templates().length > 0}
                fallback={
                    <EmptyState icon="inventory_2" shape="pentagon" title="No archived templates">
                        Templates you archive are kept here.
                    </EmptyState>
                }
            >
                <ul class="list tonal">
                    <For each={templates()}>
                        {(t) => (
                            <li>
                                <span class="tile">
                                    <i>description</i>
                                </span>
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

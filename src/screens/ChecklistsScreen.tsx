import { Component, createMemo, createSignal, Show } from 'solid-js';
import { FormDialog, TextField } from '@/components/Dialog.tsx';
import { Fab } from '@/components/Fab.tsx';
import { Handle, SortableList } from '@/components/Sortable.tsx';
import { TemplatePicker } from '@/components/TemplatePicker.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import { EmptyState, ProgressRing } from '@/components/Visuals.tsx';
import { activeChecklists, createChecklist, moveChecklist, pickableTemplates, Progress, progress } from '@/lib/plan.ts';
import { navigate } from '@/lib/router.ts';
import { progressText } from '@/screens/common.tsx';

export const ChecklistsScreen: Component = () => {
    const { data } = useStore();
    const ids = createMemo(() => activeChecklists(data()).map((c) => c.id));
    const [creating, setCreating] = createSignal(false);

    return (
        <>
            <TopBar title="Checklists" large />
            <main class="responsive">
                <Show
                    when={ids().length > 0}
                    fallback={
                        <EmptyState icon="checklist" shape="sunny" title="No checklists yet">
                            Tap + to start one from your templates.
                        </EmptyState>
                    }
                >
                    <SortableList
                        each={ids()}
                        onMove={(from, to) => commit(moveChecklist(data(), from, to))}
                        class="cards"
                    >
                        {(id, handle) => {
                            const checklist = (): { name: string } | undefined =>
                                data().checklists.find((c) => c.id === id);
                            const p = (): Progress => progress(data(), id);
                            return (
                                <Show when={checklist()}>
                                    {(c) => (
                                        <li>
                                            <article class="card" onClick={() => navigate({ name: 'checklist', id })}>
                                                <ProgressRing value={p().resolved} total={p().total} />
                                                <div class="max">
                                                    <p class="card-title">{c().name}</p>
                                                    <span class="muted small-text">{progressText(p())}</span>
                                                </div>
                                                <Handle {...handle} />
                                            </article>
                                        </li>
                                    )}
                                </Show>
                            );
                        }}
                    </SortableList>
                </Show>
            </main>

            <Fab aboveNav items={[{ label: 'New checklist', icon: 'checklist', onClick: () => setCreating(true) }]} />

            <Show when={creating()}>
                <NewChecklistDialog onClose={() => setCreating(false)} />
            </Show>
        </>
    );
};

const NewChecklistDialog: Component<{ onClose: () => void }> = (props) => {
    const { data } = useStore();
    const [name, setName] = createSignal('');
    const [selected, setSelected] = createSignal(new Set<string>());

    return (
        <FormDialog
            open
            title="New checklist"
            confirm="Create"
            disabled={!name().trim()}
            onSubmit={() => {
                const { id, ops } = createChecklist(data(), name().trim(), [...selected()]);
                commit(ops);
                navigate({ name: 'checklist', id });
            }}
            onClose={props.onClose}
        >
            <TextField label="Name" value={name()} onInput={setName} autofocus />
            <p class="muted small-text">Templates to include</p>
            <TemplatePicker templates={pickableTemplates(data())} selected={selected()} onChange={setSelected} />
        </FormDialog>
    );
};

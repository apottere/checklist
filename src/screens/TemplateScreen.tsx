import { Component, createMemo, createSignal, Show } from 'solid-js';
import { TextDialog } from '@/components/Dialog.tsx';
import { Handle, SortableList } from '@/components/Sortable.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import {
    addTemplateItem,
    deleteTemplateItem,
    editTemplateItem,
    moveTemplateItem,
    renameTemplate,
    setTemplateArchived,
    templateItems,
} from '@/lib/plan.ts';
import { back, navigate } from '@/lib/router.ts';
import { Template, WithId } from '@/lib/schema.ts';
import { NotFound } from '@/screens/common.tsx';
import { MoveToFolderDialog } from '@/screens/TemplatesScreen.tsx';

export const TemplateScreen: Component<{ id: string }> = (props) => {
    const { data } = useStore();
    const template = (): WithId<Template> | undefined => data().templates.find((t) => t.id === props.id);

    return (
        <Show
            when={template()}
            fallback={<NotFound parent={{ name: 'templates' }}>This template doesn't exist.</NotFound>}
        >
            {(t) => <TemplateEditor template={t()} />}
        </Show>
    );
};

const TemplateEditor: Component<{ template: WithId<Template> }> = (props) => {
    const { data } = useStore();
    const items = createMemo(() => templateItems(data(), props.template.id));
    const ids = createMemo(() => items().map((i) => i.id));
    const usedBy = createMemo(
        () =>
            data().checklists.filter(
                (c) => !c.archived && c.groups.some((g) => g.sections.some((s) => s.templateId === props.template.id))
            ).length
    );
    const [dialog, setDialog] = createSignal<'rename' | 'move'>();
    const [editing, setEditing] = createSignal<string>();
    const [text, setText] = createSignal('');
    let addInput!: HTMLInputElement;

    const add = (e: SubmitEvent): void => {
        e.preventDefault();
        const value = text().trim();
        if (!value) return;
        commit(addTemplateItem(data(), props.template.id, value));
        setText('');
        addInput.focus();
    };

    const finishEdit = (id: string, value: string): void => {
        setEditing(undefined);
        const trimmed = value.trim();
        const item = items().find((i) => i.id === id);
        if (item && trimmed && trimmed !== item.text) commit(editTemplateItem(data(), id, trimmed));
    };

    return (
        <>
            <TopBar
                title={props.template.name}
                onBack={() => back({ name: 'templates' })}
                menu={[
                    { label: 'Rename', icon: 'edit', onClick: () => setDialog('rename') },
                    { label: 'Move to folder', icon: 'drive_file_move', onClick: () => setDialog('move') },
                    {
                        label: 'Archive',
                        icon: 'archive',
                        onClick: () => {
                            commitWithUndo(
                                setTemplateArchived(data(), props.template.id, true),
                                `Archived "${props.template.name}"`
                            );
                            navigate({ name: 'templates' }, true);
                        },
                    },
                ]}
            />
            <main class="responsive">
                <Show when={usedBy() > 0}>
                    <p class="muted small-text">
                        Changes apply to {usedBy()} active checklist{usedBy() === 1 ? '' : 's'}.
                    </p>
                </Show>
                <SortableList
                    each={ids()}
                    onMove={(from, to) => commit(moveTemplateItem(data(), props.template.id, from, to))}
                    class="list"
                >
                    {(id, handle) => {
                        const item = (): { text: string } | undefined => items().find((i) => i.id === id);
                        return (
                            <Show when={item()}>
                                {(i) => (
                                    <li>
                                        <Handle {...handle} />
                                        <Show
                                            when={editing() === id}
                                            fallback={
                                                <a class="max row-link" onClick={() => setEditing(id)}>
                                                    {i().text}
                                                </a>
                                            }
                                        >
                                            <input
                                                class="max inline-edit"
                                                value={i().text}
                                                maxLength={1000}
                                                ref={(el) => queueMicrotask(() => el.focus())}
                                                onBlur={(e) => finishEdit(id, e.currentTarget.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                    if (e.key === 'Escape') setEditing(undefined);
                                                }}
                                            />
                                        </Show>
                                        <button
                                            class="circle transparent"
                                            aria-label="Delete item"
                                            onClick={() =>
                                                commitWithUndo(deleteTemplateItem(data(), id), `Deleted "${i().text}"`)
                                            }
                                        >
                                            <i>delete</i>
                                        </button>
                                    </li>
                                )}
                            </Show>
                        );
                    }}
                </SortableList>
                <form class="add-item" onSubmit={add}>
                    <div class="field border max">
                        <input
                            ref={addInput}
                            value={text()}
                            onInput={(e) => setText(e.currentTarget.value)}
                            placeholder="Add an item"
                            aria-label="New item"
                            maxLength={1000}
                            enterkeyhint="done"
                        />
                    </div>
                    <button type="submit" class="circle" aria-label="Add">
                        <i>add</i>
                    </button>
                </form>
            </main>

            <TextDialog
                open={dialog() === 'rename'}
                title="Rename template"
                label="Name"
                confirm="Rename"
                initial={props.template.name}
                onSubmit={(name) => commit(renameTemplate(data(), props.template.id, name))}
                onClose={() => setDialog(undefined)}
            />
            <Show when={dialog() === 'move'}>
                <MoveToFolderDialog template={props.template} onClose={() => setDialog(undefined)} />
            </Show>
        </>
    );
};

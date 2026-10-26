import { Component, createMemo, createSignal, Show } from 'solid-js';
import { ConfirmDialog, FormDialog, TextDialog, TextField } from '@/components/Dialog.tsx';
import { Menu } from '@/components/Menu.tsx';
import { Handle, HandleProps, SortableList } from '@/components/Sortable.tsx';
import { TemplatePicker } from '@/components/TemplatePicker.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import {
    addGroup,
    importTemplates,
    moveGroup,
    moveSection,
    pickableTemplates,
    removeGroup,
    removeSection,
    renameGroup,
    sectionName,
} from '@/lib/plan.ts';
import { back } from '@/lib/router.ts';
import { Checklist, EXTRAS, Group, Section, WithId } from '@/lib/schema.ts';
import { NotFound } from '@/screens/common.tsx';

type DialogState =
    | { kind: 'addGroup' }
    | { kind: 'renameGroup'; group: Group }
    | { kind: 'removeGroup'; group: Group }
    | { kind: 'import'; group: Group }
    | { kind: 'removeSection'; section: Section };

export const StructureScreen: Component<{ id: string }> = (props) => {
    const { data } = useStore();
    const checklist = (): WithId<Checklist> | undefined => data().checklists.find((c) => c.id === props.id);

    return (
        <Show
            when={checklist()}
            fallback={<NotFound parent={{ name: 'checklists' }}>This checklist doesn't exist.</NotFound>}
        >
            {(c) => <StructureEditor checklist={c()} />}
        </Show>
    );
};

const StructureEditor: Component<{ checklist: WithId<Checklist> }> = (props) => {
    const { data } = useStore();
    const id = (): string => props.checklist.id;
    const defaultGroup = (): Group => props.checklist.groups[0];
    const namedGroupIds = createMemo(() => props.checklist.groups.slice(1).map((g) => g.id));
    const groupById = (groupId: string): Group | undefined => props.checklist.groups.find((g) => g.id === groupId);
    const [dialog, setDialog] = createSignal<DialogState>();
    const close = (): void => void setDialog(undefined);
    const dialogOf = <K extends DialogState['kind']>(kind: K): Extract<DialogState, { kind: K }> | undefined => {
        const d = dialog();
        return d?.kind === kind ? (d as Extract<DialogState, { kind: K }>) : undefined;
    };

    const Sections: Component<{ group: Group }> = (p) => {
        const ids = (): string[] => p.group.sections.filter((s) => s.id !== EXTRAS).map((s) => s.id);
        return (
            <Show when={ids().length > 0} fallback={<p class="muted nested">No templates yet.</p>}>
                <SortableList
                    each={ids()}
                    onMove={(from, to) => commit(moveSection(data(), id(), p.group.id, from, to))}
                    class="list nested"
                >
                    {(sectionId, handle) => {
                        const section = (): Section | undefined => p.group.sections.find((s) => s.id === sectionId);
                        return (
                            <Show when={section()}>
                                {(s) => (
                                    <li>
                                        <Handle {...handle} />
                                        <span class="max">{sectionName(data(), s())}</span>
                                        <button
                                            class="circle transparent"
                                            aria-label="Remove"
                                            onClick={() => setDialog({ kind: 'removeSection', section: s() })}
                                        >
                                            <i>remove_circle_outline</i>
                                        </button>
                                    </li>
                                )}
                            </Show>
                        );
                    }}
                </SortableList>
            </Show>
        );
    };

    const ImportButton: Component<{ group: Group }> = (p) => (
        <button class="transparent small" onClick={() => setDialog({ kind: 'import', group: p.group })}>
            <i>playlist_add</i>
            <span>Import templates</span>
        </button>
    );

    const GroupCard: Component<{ group: Group; handle: HandleProps }> = (p) => (
        <li>
            <article class="group-card">
                <div class="row">
                    <Handle {...p.handle} />
                    <h6 class="max small">{p.group.name}</h6>
                    <Menu
                        items={[
                            {
                                label: 'Import templates',
                                icon: 'playlist_add',
                                onClick: () => setDialog({ kind: 'import', group: p.group }),
                            },
                            {
                                label: 'Rename',
                                icon: 'edit',
                                onClick: () => setDialog({ kind: 'renameGroup', group: p.group }),
                            },
                            {
                                label: 'Remove group',
                                icon: 'delete',
                                onClick: () => setDialog({ kind: 'removeGroup', group: p.group }),
                            },
                        ]}
                    />
                </div>
                <Sections group={p.group} />
            </article>
        </li>
    );

    return (
        <>
            <TopBar title="Edit structure" onBack={() => back({ name: 'checklist', id: id() })} />
            <main class="responsive">
                <article class="group-card">
                    <div class="row">
                        <h6 class="max small muted">Ungrouped</h6>
                        <ImportButton group={defaultGroup()} />
                    </div>
                    <Sections group={defaultGroup()} />
                </article>

                <SortableList
                    each={namedGroupIds()}
                    onMove={(from, to) => commit(moveGroup(data(), id(), from, to))}
                    class="cards"
                >
                    {(groupId, handle) => (
                        <Show when={groupById(groupId)}>{(g) => <GroupCard group={g()} handle={handle} />}</Show>
                    )}
                </SortableList>

                <nav class="center-align">
                    <button class="border" onClick={() => setDialog({ kind: 'addGroup' })}>
                        <i>add</i>
                        <span>Add group</span>
                    </button>
                </nav>
            </main>

            <Show when={dialogOf('addGroup')}>
                <AddGroupDialog checklistId={id()} onClose={close} />
            </Show>
            <Show when={dialogOf('import')}>
                {(d) => <ImportDialog checklistId={id()} group={d().group} onClose={close} />}
            </Show>
            <Show when={dialogOf('renameGroup')}>
                {(d) => (
                    <TextDialog
                        open
                        title="Rename group"
                        label="Name"
                        confirm="Rename"
                        initial={d().group.name ?? ''}
                        onSubmit={(name) => commit(renameGroup(data(), id(), d().group.id, name))}
                        onClose={close}
                    />
                )}
            </Show>
            <Show when={dialogOf('removeGroup')}>
                {(d) => (
                    <ConfirmDialog
                        open
                        title={`Remove "${d().group.name}"?`}
                        confirm="Remove"
                        onConfirm={() =>
                            commitWithUndo(removeGroup(data(), id(), d().group.id), `Removed "${d().group.name}"`)
                        }
                        onClose={close}
                    >
                        Its sections and their items will be removed from this checklist. Templates aren't affected.
                    </ConfirmDialog>
                )}
            </Show>
            <Show when={dialogOf('removeSection')}>
                {(d) => (
                    <ConfirmDialog
                        open
                        title={`Remove "${sectionName(data(), d().section)}"?`}
                        confirm="Remove"
                        onConfirm={() =>
                            commitWithUndo(
                                removeSection(data(), id(), d().section.id),
                                `Removed "${sectionName(data(), d().section)}"`
                            )
                        }
                        onClose={close}
                    >
                        Its items will be removed from this checklist. The template isn't affected.
                    </ConfirmDialog>
                )}
            </Show>
        </>
    );
};

const AddGroupDialog: Component<{ checklistId: string; onClose: () => void }> = (props) => {
    const { data } = useStore();
    const [name, setName] = createSignal('');
    const [selected, setSelected] = createSignal(new Set<string>());

    return (
        <FormDialog
            open
            title="Add group"
            confirm="Add"
            disabled={!name().trim()}
            onSubmit={() => commit(addGroup(data(), props.checklistId, name().trim(), [...selected()]))}
            onClose={props.onClose}
        >
            <TextField label="Name" value={name()} onInput={setName} autofocus />
            <p class="muted small-text">Templates to import</p>
            <TemplatePicker templates={pickableTemplates(data())} selected={selected()} onChange={setSelected} />
        </FormDialog>
    );
};

const ImportDialog: Component<{ checklistId: string; group: Group; onClose: () => void }> = (props) => {
    const { data } = useStore();
    const [selected, setSelected] = createSignal(new Set<string>());
    const available = createMemo(() => {
        const existing = new Set(props.group.sections.map((s) => s.templateId));
        return pickableTemplates(data()).filter((p) => !existing.has(p.template.id));
    });

    return (
        <FormDialog
            open
            title={props.group.name ? `Import into "${props.group.name}"` : 'Import templates'}
            confirm="Import"
            disabled={selected().size === 0}
            onSubmit={() => commit(importTemplates(data(), props.checklistId, props.group.id, [...selected()]))}
            onClose={props.onClose}
        >
            <TemplatePicker templates={available()} selected={selected()} onChange={setSelected} />
        </FormDialog>
    );
};

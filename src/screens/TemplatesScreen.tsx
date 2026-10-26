import { Component, createMemo, createSignal, For, Show, untrack } from 'solid-js';
import { ConfirmDialog, FormDialog, TextDialog } from '@/components/Dialog.tsx';
import { Fab } from '@/components/Fab.tsx';
import { EmptyState } from '@/components/Visuals.tsx';
import { Menu, MenuItem } from '@/components/Menu.tsx';
import { Handle, HandleProps, SortableList } from '@/components/Sortable.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import {
    byOrder,
    createFolder,
    createTemplate,
    deleteFolder,
    library,
    moveInFolder,
    moveTemplateToFolder,
    moveTopLevel,
    renameFolder,
    renameTemplate,
    setTemplateArchived,
    templateItems,
} from '@/lib/plan.ts';
import { navigate } from '@/lib/router.ts';
import { Folder, Template, WithId } from '@/lib/schema.ts';
import { plural } from '@/screens/common.tsx';

type DialogState =
    | { kind: 'newTemplate' }
    | { kind: 'newFolder' }
    | { kind: 'renameFolder'; folder: WithId<Folder> }
    | { kind: 'deleteFolder'; folder: WithId<Folder> }
    | { kind: 'renameTemplate'; template: WithId<Template> }
    | { kind: 'move'; template: WithId<Template> };

export const TemplatesScreen: Component = () => {
    const { data } = useStore();
    // Rows are keyed by ID string, since library entries are rebuilt on every change.
    const keys = createMemo(() =>
        library(data()).map((e) => (e.kind === 'folder' ? `f:${e.folder.id}` : `t:${e.template.id}`))
    );
    const [expanded, setExpanded] = createSignal(new Set<string>());
    const [dialog, setDialog] = createSignal<DialogState>();
    const close = (): void => void setDialog(undefined);
    const dialogOf = <K extends DialogState['kind']>(kind: K): Extract<DialogState, { kind: K }> | undefined => {
        const d = dialog();
        return d?.kind === kind ? (d as Extract<DialogState, { kind: K }>) : undefined;
    };

    const toggle = (id: string): void => {
        const next = new Set(expanded());
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpanded(next);
    };

    const TemplateRow: Component<{ id: string; handle: HandleProps }> = (props) => {
        const template = (): WithId<Template> | undefined => data().templates.find((t) => t.id === props.id);
        const menu = (t: WithId<Template>): MenuItem[] => [
            { label: 'Rename', icon: 'edit', onClick: () => setDialog({ kind: 'renameTemplate', template: t }) },
            {
                label: 'Move to folder',
                icon: 'drive_file_move',
                onClick: () => setDialog({ kind: 'move', template: t }),
            },
            {
                label: 'Archive',
                icon: 'archive',
                onClick: () => commitWithUndo(setTemplateArchived(data(), t.id, true), `Archived "${t.name}"`),
            },
        ];
        return (
            <Show when={template()}>
                {(t) => (
                    <li>
                        <span class="tile">
                            <i>description</i>
                        </span>
                        <a class="max row-link" onClick={() => navigate({ name: 'template', id: t().id })}>
                            <span>{t().name}</span>
                            <span class="muted">{plural(templateItems(data(), t().id).length, 'item')}</span>
                        </a>
                        <Menu items={menu(t())} />
                        <Handle {...props.handle} />
                    </li>
                )}
            </Show>
        );
    };

    const FolderRow: Component<{ id: string; handle: HandleProps }> = (props) => {
        const folder = (): WithId<Folder> | undefined => data().folders.find((f) => f.id === props.id);
        const templateIds = createMemo(() =>
            data()
                .templates.filter((t) => t.folderId === props.id && !t.archived)
                .sort(byOrder)
                .map((t) => t.id)
        );
        const open = (): boolean => expanded().has(props.id);
        return (
            <Show when={folder()}>
                {(f) => (
                    <li class="folder">
                        <span class="tile tile-tertiary">
                            <i>{open() ? 'folder_open' : 'folder'}</i>
                        </span>
                        <a class="max row-link" onClick={() => toggle(props.id)}>
                            <span>{f().name}</span>
                            <span class="muted">{plural(templateIds().length, 'template')}</span>
                        </a>
                        <Menu
                            items={[
                                {
                                    label: 'Rename',
                                    icon: 'edit',
                                    onClick: () => setDialog({ kind: 'renameFolder', folder: f() }),
                                },
                                {
                                    label: 'Delete',
                                    icon: 'delete',
                                    onClick: () => setDialog({ kind: 'deleteFolder', folder: f() }),
                                },
                            ]}
                        />
                        <Handle {...props.handle} />
                        <Show when={open()}>
                            <Show
                                when={templateIds().length > 0}
                                fallback={<p class="muted nested">Empty. Use Move to folder on a template.</p>}
                            >
                                <SortableList
                                    each={templateIds()}
                                    onMove={(from, to) => commit(moveInFolder(data(), props.id, from, to))}
                                    class="list nested"
                                >
                                    {(id, handle) => <TemplateRow id={id} handle={handle} />}
                                </SortableList>
                            </Show>
                        </Show>
                    </li>
                )}
            </Show>
        );
    };

    return (
        <>
            <TopBar title="Templates" large />
            <main class="responsive">
                <Show
                    when={keys().length > 0}
                    fallback={
                        <EmptyState icon="library_books" shape="sided-cookie9" title="No templates yet">
                            Templates are reusable lists that checklists are built from. Tap + to make one.
                        </EmptyState>
                    }
                >
                    <SortableList
                        each={keys()}
                        onMove={(from, to) => commit(moveTopLevel(data(), from, to))}
                        class="list tonal"
                    >
                        {(key, handle) =>
                            key.startsWith('f:') ? (
                                <FolderRow id={key.slice(2)} handle={handle} />
                            ) : (
                                <TemplateRow id={key.slice(2)} handle={handle} />
                            )
                        }
                    </SortableList>
                </Show>
            </main>

            <Fab
                aboveNav
                items={[
                    { label: 'New template', icon: 'description', onClick: () => setDialog({ kind: 'newTemplate' }) },
                    { label: 'New folder', icon: 'create_new_folder', onClick: () => setDialog({ kind: 'newFolder' }) },
                ]}
            />

            <TextDialog
                open={dialog()?.kind === 'newTemplate'}
                title="New template"
                label="Name"
                confirm="Create"
                onSubmit={(name) => {
                    const { id, ops } = createTemplate(data(), name, null);
                    commit(ops);
                    navigate({ name: 'template', id });
                }}
                onClose={close}
            />
            <TextDialog
                open={dialog()?.kind === 'newFolder'}
                title="New folder"
                label="Name"
                confirm="Create"
                onSubmit={(name) => commit(createFolder(data(), name))}
                onClose={close}
            />
            <Show when={dialogOf('renameFolder')}>
                {(d) => (
                    <TextDialog
                        open
                        title="Rename folder"
                        label="Name"
                        confirm="Rename"
                        initial={d().folder.name}
                        onSubmit={(name) => commit(renameFolder(data(), d().folder.id, name))}
                        onClose={close}
                    />
                )}
            </Show>
            <Show when={dialogOf('renameTemplate')}>
                {(d) => (
                    <TextDialog
                        open
                        title="Rename template"
                        label="Name"
                        confirm="Rename"
                        initial={d().template.name}
                        onSubmit={(name) => commit(renameTemplate(data(), d().template.id, name))}
                        onClose={close}
                    />
                )}
            </Show>
            <Show when={dialogOf('deleteFolder')}>
                {(d) => (
                    <ConfirmDialog
                        open
                        title={`Delete "${d().folder.name}"?`}
                        confirm="Delete"
                        onConfirm={() =>
                            commitWithUndo(deleteFolder(data(), d().folder.id), `Deleted "${d().folder.name}"`)
                        }
                        onClose={close}
                    >
                        Its templates will move to the top level.
                    </ConfirmDialog>
                )}
            </Show>
            <Show when={dialogOf('move')}>{(d) => <MoveToFolderDialog template={d().template} onClose={close} />}</Show>
        </>
    );
};

export const MoveToFolderDialog: Component<{ template: WithId<Template>; onClose: () => void }> = (props) => {
    const { data } = useStore();
    const [folderId, setFolderId] = createSignal(untrack(() => props.template.folderId));
    const options = (): { id: string | null; name: string }[] => [
        { id: null, name: 'No folder' },
        ...[...data().folders].sort((a, b) => a.name.localeCompare(b.name)),
    ];

    return (
        <FormDialog
            open
            title={`Move "${props.template.name}"`}
            confirm="Move"
            onSubmit={() => commit(moveTemplateToFolder(data(), props.template.id, folderId()))}
            onClose={props.onClose}
        >
            <nav class="vertical left-align">
                <For each={options()}>
                    {(option) => (
                        <label class="radio">
                            <input
                                type="radio"
                                name="folder"
                                checked={folderId() === option.id}
                                onChange={() => setFolderId(option.id)}
                            />
                            <span>{option.name}</span>
                        </label>
                    )}
                </For>
            </nav>
        </FormDialog>
    );
};

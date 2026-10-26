import { Component, createEffect, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { signOut, User } from 'firebase/auth';
import { FirestoreError } from 'firebase/firestore';
import { ConfirmDialog, Dialog, TextDialog } from '@/components/Dialog.tsx';
import { auth } from '@/lib/firebase.ts';
import {
    addItem,
    addList,
    deleteItem,
    deleteItems,
    deleteList,
    Item,
    itemsQuery,
    List,
    listsQuery,
    renameList,
    setItemDone,
    WithId,
    writeError,
} from '@/lib/model.ts';
import { createOnline, createQuery } from '@/lib/primitives.ts';
import { loadSetting, saveSetting } from '@/lib/settings.ts';

const isPermissionDenied = (error: Error): boolean =>
    error instanceof FirestoreError && error.code === 'permission-denied';

// Beer CSS menus stay open while focus is inside them.
const closeMenus = (): void => (document.activeElement as HTMLElement | null)?.blur();

type DialogName = 'newList' | 'rename' | 'delete' | 'addItem';

export const Checklist: Component<{ user: User }> = (props) => {
    const lists = createQuery<List>(listsQuery);
    const items = createQuery<Item>(itemsQuery);
    const online = createOnline();
    const [dialog, setDialog] = createSignal<DialogName>();
    const closeDialog = (): void => void setDialog(undefined);

    const [selectedId, setSelectedId] = createSignal(loadSetting('selectedList'));
    const selected = (): WithId<List> | undefined =>
        lists().docs.find((list) => list.id === selectedId()) ?? lists().docs[0];
    createEffect(() => saveSetting('selectedList', selected()?.id));

    const itemsByList = createMemo(() => {
        const grouped = new Map<string, WithId<Item>[]>();
        for (const item of items().docs) {
            grouped.set(item.listId, [...(grouped.get(item.listId) ?? []), item]);
        }
        return grouped;
    });
    const itemsOf = (listId: string): WithId<Item>[] => itemsByList().get(listId) ?? [];
    const selectedItems = (): WithId<Item>[] => itemsOf(selected()?.id ?? '');

    const error = (): Error | undefined => lists().error ?? items().error ?? writeError();
    const pending = (): boolean => lists().pending || items().pending;

    return (
        <>
            <header class="fixed">
                <nav>
                    <h6 class="max">Checklist</h6>
                    <Switch>
                        <Match when={!online()}>
                            <i title="Offline, changes are saved on this device">cloud_off</i>
                        </Match>
                        <Match when={pending()}>
                            <i title="Syncing">cloud_sync</i>
                        </Match>
                        <Match when={true}>
                            <i title="Synced">cloud_done</i>
                        </Match>
                    </Switch>
                    <div>
                        <button class="circle transparent" aria-label="Account">
                            <i>account_circle</i>
                        </button>
                        <menu class="left no-wrap">
                            <li class="small-text">{props.user.email}</li>
                            <li
                                onClick={() => {
                                    closeMenus();
                                    void signOut(auth);
                                }}
                            >
                                <i>logout</i>
                                <span>Sign out</span>
                            </li>
                        </menu>
                    </div>
                </nav>
            </header>

            <main class="responsive">
                <Show when={error()}>
                    {(error) => (
                        <article class="error-container">
                            <Show when={isPermissionDenied(error())} fallback={error().message}>
                                {props.user.email} isn't on the allowlist.
                            </Show>
                        </article>
                    )}
                </Show>

                <nav class="lists no-wrap">
                    <For each={lists().docs}>
                        {(list) => (
                            <button
                                class="chip"
                                classList={{ fill: list.id === selected()?.id }}
                                onClick={() => setSelectedId(list.id)}
                            >
                                <span>{list.name}</span>
                                <span class="count">{itemsOf(list.id).filter((item) => !item.done).length}</span>
                            </button>
                        )}
                    </For>
                    <button class="chip" onClick={() => setDialog('newList')}>
                        <i>add</i>
                        <span>New list</span>
                    </button>
                </nav>

                <Show
                    when={selected()}
                    fallback={
                        <div class="center-align large-padding">
                            {lists().loading ? <progress class="circle" /> : <p>Create a list to get started.</p>}
                        </div>
                    }
                >
                    {(list) => (
                        <ListView
                            list={list()}
                            items={selectedItems()}
                            onRename={() => setDialog('rename')}
                            onDelete={() => setDialog('delete')}
                        />
                    )}
                </Show>
            </main>

            <Show when={selected()}>
                <button class="fab extra square round" aria-label="Add item" onClick={() => setDialog('addItem')}>
                    <i>add</i>
                </button>
            </Show>

            <TextDialog
                open={dialog() === 'newList'}
                title="New list"
                label="Name"
                confirm="Create"
                onSubmit={(name) => setSelectedId(addList(name))}
                onClose={closeDialog}
            />
            <TextDialog
                open={dialog() === 'rename'}
                title="Rename list"
                label="Name"
                confirm="Rename"
                initial={selected()?.name}
                onSubmit={(name) => {
                    const list = selected();
                    if (list && name !== list.name) renameList(list.id, name);
                }}
                onClose={closeDialog}
            />
            <ConfirmDialog
                open={dialog() === 'delete'}
                title={`Delete "${selected()?.name}"?`}
                confirm="Delete"
                onConfirm={() => {
                    const list = selected();
                    if (list) deleteList(list.id, selectedItems());
                }}
                onClose={closeDialog}
            >
                Its {selectedItems().length} items will be deleted too.
            </ConfirmDialog>
            <AddItemSheet
                open={dialog() === 'addItem'}
                onAdd={(text) => {
                    const list = selected();
                    if (list) addItem(list.id, text);
                }}
                onClose={closeDialog}
            />
        </>
    );
};

const ListView: Component<{
    list: WithId<List>;
    items: WithId<Item>[];
    onRename: () => void;
    onDelete: () => void;
}> = (props) => {
    const done = (): WithId<Item>[] => props.items.filter((item) => item.done);

    return (
        <>
            <div class="row">
                <h5 class="max">{props.list.name}</h5>
                <div>
                    <button class="circle transparent" aria-label="List options">
                        <i>more_vert</i>
                    </button>
                    <menu class="left no-wrap">
                        <li
                            onClick={() => {
                                closeMenus();
                                props.onRename();
                            }}
                        >
                            <i>edit</i>
                            <span>Rename</span>
                        </li>
                        <li
                            onClick={() => {
                                closeMenus();
                                props.onDelete();
                            }}
                        >
                            <i>delete</i>
                            <span>Delete list</span>
                        </li>
                    </menu>
                </div>
            </div>

            <Show when={props.items.length === 0}>
                <p class="center-align large-padding">No items yet. Tap + to add some.</p>
            </Show>

            <ul class="list">
                <For each={props.items}>
                    {(item) => (
                        <li>
                            <label class="checkbox item max">
                                <input
                                    type="checkbox"
                                    checked={item.done}
                                    onChange={(e) => setItemDone(item.id, e.currentTarget.checked)}
                                />
                                <span>{item.text}</span>
                            </label>
                            <button
                                class="circle transparent small"
                                aria-label="Delete item"
                                onClick={() => deleteItem(item.id)}
                            >
                                <i>close</i>
                            </button>
                        </li>
                    )}
                </For>
            </ul>

            <Show when={done().length > 0}>
                <nav class="center-align top-margin">
                    <button class="border" onClick={() => deleteItems(done())}>
                        <i>delete_sweep</i>
                        <span>Clear {done().length} done</span>
                    </button>
                </nav>
            </Show>
        </>
    );
};

// Stays open after each add so several items can be entered in a row.
const AddItemSheet: Component<{ open: boolean; onAdd: (text: string) => void; onClose: () => void }> = (props) => {
    let input!: HTMLInputElement;
    createEffect(() => {
        if (props.open) input.value = '';
    });
    const add = (e: SubmitEvent): void => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) props.onAdd(text);
        input.value = '';
        input.focus();
    };

    return (
        <Dialog open={props.open} onClose={props.onClose} class="bottom">
            <form onSubmit={add}>
                <div class="field label border">
                    <input ref={input} placeholder=" " maxLength={1000} enterkeyhint="done" autofocus />
                    <label>New item</label>
                </div>
                <nav class="right-align">
                    <button type="button" class="transparent" onClick={() => props.onClose()}>
                        Done
                    </button>
                    <button type="submit">
                        <i>add</i>
                        <span>Add</span>
                    </button>
                </nav>
            </form>
        </Dialog>
    );
};

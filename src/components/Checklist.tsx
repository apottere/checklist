import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { signOut, User } from 'firebase/auth';
import { FirestoreError } from 'firebase/firestore';
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

export const Checklist: Component<{ user: User }> = (props) => {
    const lists = createQuery<List>(listsQuery);
    const items = createQuery<Item>(itemsQuery);
    const online = createOnline();

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

    const error = (): Error | undefined => lists().error ?? items().error ?? writeError();
    const syncStatus = (): string => {
        if (!online()) return 'Offline, saved on this device';
        if (lists().pending || items().pending) return 'Syncing…';
        return 'Synced';
    };

    const newList = (): void => {
        const name = prompt('List name')?.trim();
        if (name) setSelectedId(addList(name));
    };

    return (
        <div class="app">
            <header>
                <h1>Checklist</h1>
                <span class="sync" classList={{ offline: !online() }}>
                    {syncStatus()}
                </span>
                <button class="link" onClick={() => void signOut(auth)} title={props.user.email ?? undefined}>
                    Sign out
                </button>
            </header>

            <Show when={error()}>
                {(error) => (
                    <p class="error">
                        <Show when={isPermissionDenied(error())} fallback={error().message}>
                            {props.user.email} isn't on the allowlist.
                        </Show>
                    </p>
                )}
            </Show>

            <nav>
                <For each={lists().docs}>
                    {(list) => (
                        <button
                            classList={{ selected: list.id === selected()?.id }}
                            onClick={() => setSelectedId(list.id)}
                        >
                            {list.name}
                            <span class="count">{itemsOf(list.id).filter((item) => !item.done).length}</span>
                        </button>
                    )}
                </For>
                <button class="add" onClick={newList}>
                    + List
                </button>
            </nav>

            <Show
                when={selected()}
                fallback={<p class="status">{lists().loading ? 'Loading…' : 'Create a list to get started.'}</p>}
            >
                {(list) => <ListView list={list()} items={itemsOf(list().id)} />}
            </Show>
        </div>
    );
};

const ListView: Component<{ list: WithId<List>; items: WithId<Item>[] }> = (props) => {
    const [text, setText] = createSignal('');
    const done = (): WithId<Item>[] => props.items.filter((item) => item.done);

    const add = (e: SubmitEvent): void => {
        e.preventDefault();
        const value = text().trim();
        if (!value) return;
        addItem(props.list.id, value);
        setText('');
    };
    const rename = (): void => {
        const name = prompt('Rename list', props.list.name)?.trim();
        if (name && name !== props.list.name) renameList(props.list.id, name);
    };
    const remove = (): void => {
        if (confirm(`Delete "${props.list.name}" and its ${props.items.length} items?`)) {
            deleteList(props.list.id, props.items);
        }
    };

    return (
        <main>
            <div class="list-header">
                <h2>{props.list.name}</h2>
                <button class="link" onClick={rename}>
                    Rename
                </button>
                <button class="link danger" onClick={remove}>
                    Delete
                </button>
            </div>

            <form class="add-item" onSubmit={add}>
                <input
                    value={text()}
                    onInput={(e) => setText(e.currentTarget.value)}
                    placeholder="Add an item"
                    aria-label="New item"
                    maxLength={1000}
                />
                <button class="primary" type="submit">
                    Add
                </button>
            </form>

            <ul class="items">
                <For each={props.items}>
                    {(item) => (
                        <li classList={{ done: item.done }}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={item.done}
                                    onChange={(e) => setItemDone(item.id, e.currentTarget.checked)}
                                />
                                <span>{item.text}</span>
                            </label>
                            <button class="link danger" onClick={() => deleteItem(item.id)} aria-label="Delete item">
                                ✕
                            </button>
                        </li>
                    )}
                </For>
            </ul>

            <Show when={done().length > 0}>
                <button class="link" onClick={() => deleteItems(done())}>
                    Clear {done().length} done
                </button>
            </Show>
        </main>
    );
};

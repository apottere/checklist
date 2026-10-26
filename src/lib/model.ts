import { createSignal } from 'solid-js';
import { collection, deleteDoc, doc, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase.ts';

export interface List {
    name: string;
    createdAt: number;
}

export interface Item {
    listId: string;
    text: string;
    done: boolean;
    createdAt: number;
}

export type WithId<T> = T & { id: string };

const lists = collection(db, 'lists');
const items = collection(db, 'items');

// Load everything so lists that haven't been opened are still available offline.
export const listsQuery = query(lists, orderBy('createdAt'));
export const itemsQuery = query(items, orderBy('createdAt'));

const [writeError, setWriteError] = createSignal<Error>();
export { writeError };

// Don't await writes: they apply to the cache immediately, but the promise waits for the server, which hangs offline.
function track(write: Promise<void>): void {
    write.catch((error: Error) => {
        console.error('Write failed', error);
        setWriteError(error);
    });
}

export function addList(name: string): string {
    const ref = doc(lists);
    track(setDoc(ref, { name, createdAt: Date.now() } satisfies List));
    return ref.id;
}

export function renameList(id: string, name: string): void {
    track(updateDoc(doc(lists, id), { name }));
}

export function deleteList(id: string, listItems: WithId<Item>[]): void {
    const batch = writeBatch(db);
    batch.delete(doc(lists, id));
    for (const item of listItems) batch.delete(doc(items, item.id));
    track(batch.commit());
}

export function addItem(listId: string, text: string): void {
    track(setDoc(doc(items), { listId, text, done: false, createdAt: Date.now() } satisfies Item));
}

export function setItemDone(id: string, done: boolean): void {
    track(updateDoc(doc(items, id), { done }));
}

export function deleteItem(id: string): void {
    track(deleteDoc(doc(items, id)));
}

export function deleteItems(toDelete: WithId<Item>[]): void {
    const batch = writeBatch(db);
    for (const item of toDelete) batch.delete(doc(items, item.id));
    track(batch.commit());
}

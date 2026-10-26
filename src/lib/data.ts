import { Accessor, createContext, createMemo, useContext } from 'solid-js';
import { collection, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase.ts';
import { createQuery } from '@/lib/primitives.ts';
import { Checklist, ChecklistItem, Data, Folder, Template, TemplateItem } from '@/lib/schema.ts';

export interface Store {
    data: Accessor<Data>;
    loading: Accessor<boolean>;
    error: Accessor<FirestoreError | undefined>;
    /** Has local writes the server hasn't acknowledged. */
    pending: Accessor<boolean>;
}

// Everything is loaded so it's all in the offline cache, including things that haven't been opened.
export function createStore(): Store {
    const folders = createQuery<Folder>(collection(db, 'folders'));
    const templates = createQuery<Template>(collection(db, 'templates'));
    const templateItems = createQuery<TemplateItem>(collection(db, 'templateItems'));
    const checklists = createQuery<Checklist>(collection(db, 'checklists'));
    const checklistItems = createQuery<ChecklistItem>(collection(db, 'checklistItems'));
    const all = [folders, templates, templateItems, checklists, checklistItems];

    const data = createMemo<Data>(() => ({
        folders: folders().docs,
        templates: templates().docs,
        templateItems: templateItems().docs,
        checklists: checklists().docs,
        checklistItems: checklistItems().docs,
    }));

    return {
        data,
        loading: () => all.some((q) => q().loading),
        error: () => all.map((q) => q().error).find(Boolean),
        pending: () => all.some((q) => q().pending),
    };
}

export const StoreContext = createContext<Store>();

export function useStore(): Store {
    const store = useContext(StoreContext);
    if (!store) throw new Error('useStore outside StoreContext');
    return store;
}

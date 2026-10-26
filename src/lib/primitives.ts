import { Accessor, createSignal, onCleanup } from 'solid-js';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FirestoreError, onSnapshot, Query } from 'firebase/firestore';
import { auth } from '@/lib/firebase.ts';

/** `undefined` until auth initializes. */
export function createAuthUser(): Accessor<User | null | undefined> {
    const [user, setUser] = createSignal<User | null | undefined>(undefined);
    onCleanup(onAuthStateChanged(auth, setUser));
    return user;
}

export interface QueryState<T> {
    docs: (T & { id: string })[];
    loading: boolean;
    error?: FirestoreError;
    /** Has local writes the server hasn't acknowledged. */
    pending: boolean;
}

export function createQuery<T>(query: Query): Accessor<QueryState<T>> {
    const [state, setState] = createSignal<QueryState<T>>({ docs: [], loading: true, pending: false });
    onCleanup(
        onSnapshot(
            query,
            { includeMetadataChanges: true },
            (snapshot) =>
                setState({
                    docs: snapshot.docs.map((doc) => ({ ...(doc.data() as T), id: doc.id })),
                    loading: false,
                    pending: snapshot.metadata.hasPendingWrites,
                }),
            (error) => setState((prev) => ({ ...prev, loading: false, error }))
        )
    );
    return state;
}

export function createOnline(): Accessor<boolean> {
    const [online, setOnline] = createSignal(navigator.onLine);
    const update = (): void => void setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    onCleanup(() => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
    });
    return online;
}

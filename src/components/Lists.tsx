import { Component } from 'solid-js';
import { useDatabase, useFirebaseApp } from 'solid-firebase';
import { getDatabase, set } from 'firebase/database';
import { createRef } from '@/lib/refs.ts';

export const Lists: Component = () => {
    const app = useFirebaseApp();
    const db = getDatabase(app);
    const ref = createRef(db, 'lists');
    const lists = useDatabase(ref);
    const update = () => void set(ref, { test: Date.now() });

    return (
        <div>
            {JSON.stringify(lists)}
            <button onClick={update}>Update</button>
        </div>
    );
};

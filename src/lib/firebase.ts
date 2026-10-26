import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
    connectFirestoreEmulator,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from 'firebase/firestore';

const config = import.meta.env.VITE_FIREBASE_CONFIG;
if (!config) throw new Error('VITE_FIREBASE_CONFIG is not set, see README.md');

export const app = initializeApp(JSON.parse(config));

export const auth = getAuth(app);

// Without a persistent cache, offline data and queued writes are lost on reload.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

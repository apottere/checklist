/* @refresh reload */
import '@/index.css';

import { render } from 'solid-js/web';
import { initializeApp } from 'firebase/app';
import { FirebaseProvider } from 'solid-firebase';
import firebaseConfig from '@/firebase-sdk-config.json';
import { App } from '@/components/App.tsx';

const firebaseApp = initializeApp(firebaseConfig);

const root = document.getElementById('root');
if (!root) throw new Error('No root element!');

render(
    () => (
        <FirebaseProvider app={firebaseApp}>
            <App />
        </FirebaseProvider>
    ),
    root
);

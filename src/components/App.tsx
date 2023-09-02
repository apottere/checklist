import type { Component } from 'solid-js';
import { useAuth, useFirebaseApp } from 'solid-firebase';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { Match, Switch } from 'solid-js';
import { Lists } from '@/components/Lists.tsx';

const Login: Component = () => {
    const app = useFirebaseApp();
    const signIn = () => void signInWithPopup(getAuth(app), new GoogleAuthProvider());
    return <button onClick={signIn}>Sign In with Google</button>;
};

export const App: Component = () => {
    const app = useFirebaseApp();
    const state = useAuth(getAuth(app));

    return (
        <Switch fallback={<Login />}>
            <Match when={state.loading}>
                <p>Loading...</p>
            </Match>
            <Match when={state.error}>
                <Login />
            </Match>
            <Match when={state.data}>
                {JSON.stringify(state.data)}
                <Lists />
            </Match>
        </Switch>
    );
};

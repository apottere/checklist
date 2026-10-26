import { Component, createSignal, Match, Show, Switch } from 'solid-js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Checklist } from '@/components/Checklist.tsx';
import { auth } from '@/lib/firebase.ts';
import { createAuthUser } from '@/lib/primitives.ts';

const Login: Component = () => {
    const [error, setError] = createSignal<string>();
    const signIn = (): void => {
        setError(undefined);
        signInWithPopup(auth, new GoogleAuthProvider()).catch((e: Error) => setError(e.message));
    };

    return (
        <main class="login">
            <h1>Checklist</h1>
            <button class="primary" onClick={signIn}>
                Sign in with Google
            </button>
            <Show when={error()}>{(message) => <p class="error">{message()}</p>}</Show>
        </main>
    );
};

export const App: Component = () => {
    const user = createAuthUser();

    return (
        <Switch>
            <Match when={user() === undefined}>
                <p class="status">Loading…</p>
            </Match>
            <Match when={user() === null}>
                <Login />
            </Match>
            <Match when={user()}>{(user) => <Checklist user={user()} />}</Match>
        </Switch>
    );
};

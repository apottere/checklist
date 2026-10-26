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
        <main class="responsive middle-align center-align">
            <div>
                <i class="extra primary-text">checklist</i>
                <h4>Checklist</h4>
                <button class="large" onClick={signIn}>
                    <i>login</i>
                    <span>Sign in with Google</span>
                </button>
                <Show when={error()}>{(message) => <p class="error-text">{message()}</p>}</Show>
            </div>
        </main>
    );
};

export const App: Component = () => {
    const user = createAuthUser();

    return (
        <Switch>
            <Match when={user() === undefined}>
                <main class="responsive middle-align center-align">
                    <progress class="circle" />
                </main>
            </Match>
            <Match when={user() === null}>
                <Login />
            </Match>
            <Match when={user()}>{(user) => <Checklist user={user()} />}</Match>
        </Switch>
    );
};

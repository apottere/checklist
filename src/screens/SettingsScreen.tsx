import { Component } from 'solid-js';
import { signOut, User } from 'firebase/auth';
import { TopBar } from '@/components/TopBar.tsx';
import { auth } from '@/lib/firebase.ts';

export const SettingsScreen: Component<{ user: User }> = (props) => (
    <>
        <TopBar title="Settings" />
        <main class="responsive">
            <ul class="list">
                <li>
                    <i>account_circle</i>
                    <div class="max row-link">
                        <span>{props.user.displayName ?? 'Signed in'}</span>
                        <span class="muted small-text">{props.user.email}</span>
                    </div>
                    <button class="border" onClick={() => void signOut(auth)}>
                        <i>logout</i>
                        <span>Sign out</span>
                    </button>
                </li>
            </ul>
        </main>
    </>
);

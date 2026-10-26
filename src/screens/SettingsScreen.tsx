import { Component } from 'solid-js';
import { signOut, User } from 'firebase/auth';
import { TopBar } from '@/components/TopBar.tsx';
import { auth } from '@/lib/firebase.ts';

export const SettingsScreen: Component<{ user: User }> = (props) => {
    const name = (): string => props.user.displayName ?? props.user.email ?? 'Signed in';

    return (
        <>
            <TopBar title="Settings" large />
            <main class="responsive">
                <div class="tonal">
                    <div class="profile">
                        <span class="avatar">{name().charAt(0).toUpperCase()}</span>
                        <div class="max row-link">
                            <span>{name()}</span>
                            <span class="muted">{props.user.email}</span>
                        </div>
                    </div>
                    <ul class="list">
                        <li class="row-button" onClick={() => void signOut(auth)}>
                            <span class="tile">
                                <i>logout</i>
                            </span>
                            <span class="max">Sign out</span>
                        </li>
                    </ul>
                </div>
            </main>
        </>
    );
};

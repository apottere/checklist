import { Component } from 'solid-js';
import { signOut, User } from 'firebase/auth';
import { TopBar } from '@/components/TopBar.tsx';
import { auth } from '@/lib/firebase.ts';
import { checkForUpdates } from '@/lib/updates.ts';

export const SettingsScreen: Component<{ user: User }> = (props) => {
    // The Google profile is refreshed on sign-in; the account's own display name may predate a rename.
    const name = (): string =>
        props.user.providerData.find((p) => p.providerId === 'google.com')?.displayName ??
        props.user.displayName ??
        props.user.email ??
        'Signed in';

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
                        <li class="row-button" onClick={() => void checkForUpdates()}>
                            <span class="tile">
                                <i>system_update</i>
                            </span>
                            <div class="max row-link">
                                <span>Check for updates</span>
                                <span class="muted">Version {__APP_VERSION__}</span>
                            </div>
                        </li>
                        <li class="row-button" onClick={() => location.reload()}>
                            <span class="tile">
                                <i>refresh</i>
                            </span>
                            <span class="max">Reload</span>
                        </li>
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

import { ParentComponent } from 'solid-js';
import { signOut } from 'firebase/auth';
import { MenuItem } from '@/components/Menu.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { auth } from '@/lib/firebase.ts';
import { back, Route } from '@/lib/router.ts';

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

export const signOutItem: MenuItem = { label: 'Sign out', icon: 'logout', onClick: () => void signOut(auth) };

export const NotFound: ParentComponent<{ parent: Route }> = (props) => (
    <>
        <TopBar title="" onBack={() => back(props.parent)} />
        <main class="responsive">
            <p class="empty">{props.children}</p>
        </main>
    </>
);

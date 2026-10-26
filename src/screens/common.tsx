import { ParentComponent } from 'solid-js';
import { signOut } from 'firebase/auth';
import { MenuItem } from '@/components/Menu.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { EmptyState } from '@/components/Visuals.tsx';
import { auth } from '@/lib/firebase.ts';
import { Progress } from '@/lib/plan.ts';
import { back, Route } from '@/lib/router.ts';

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

export function progressText(p: Progress): string {
    if (p.total === 0) return 'Empty';
    const text = `${p.done} of ${p.total} done`;
    return p.skipped ? `${text} · ${p.skipped} skipped` : text;
}

export const signOutItem: MenuItem = { label: 'Sign out', icon: 'logout', onClick: () => void signOut(auth) };

export const NotFound: ParentComponent<{ parent: Route }> = (props) => (
    <>
        <TopBar title="" onBack={() => back(props.parent)} />
        <main class="responsive">
            <EmptyState icon="search_off" shape="sided-cookie6" title="Not found">
                {props.children}
            </EmptyState>
        </main>
    </>
);

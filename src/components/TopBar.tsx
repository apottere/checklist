import { Match, ParentComponent, Show, Switch } from 'solid-js';
import { Menu, MenuItem } from '@/components/Menu.tsx';
import { useStore } from '@/lib/data.ts';
import { createOnline } from '@/lib/primitives.ts';

/** `large` is for top-level screens; detail screens get a compact bar with a back button. */
export const TopBar: ParentComponent<{ title: string; large?: boolean; onBack?: () => void; menu?: MenuItem[] }> = (
    props
) => {
    const store = useStore();
    const online = createOnline();

    return (
        <header class="fixed top-bar" classList={{ large: props.large }}>
            <nav>
                <Show when={props.onBack}>
                    {(onBack) => (
                        <button class="circle transparent" aria-label="Back" onClick={() => onBack()()}>
                            <i>arrow_back</i>
                        </button>
                    )}
                </Show>
                <h6 class="max title">{props.title}</h6>
                <Switch>
                    <Match when={!online()}>
                        <i class="sync" title="Offline, changes are saved on this device">
                            cloud_off
                        </i>
                    </Match>
                    <Match when={store.pending()}>
                        <i class="sync" title="Syncing">
                            cloud_sync
                        </i>
                    </Match>
                </Switch>
                {props.children}
                <Show when={props.menu?.length}>
                    <Menu items={props.menu ?? []} />
                </Show>
            </nav>
        </header>
    );
};

import { Component, createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { MenuItem } from '@/components/Menu.tsx';

/** A plain FAB for one action, or a FAB menu for several. */
export const Fab: Component<{ items: MenuItem[]; aboveNav?: boolean }> = (props) => (
    <Show
        when={props.items.length > 1}
        fallback={
            <button
                class="fab extra square round"
                classList={{ 'above-nav': props.aboveNav }}
                aria-label={props.items[0]?.label}
                onClick={() => props.items[0]?.onClick()}
            >
                <i>add</i>
            </button>
        }
    >
        <FabMenu items={props.items} aboveNav={props.aboveNav} />
    </Show>
);

const FabMenu: Component<{ items: MenuItem[]; aboveNav?: boolean }> = (props) => {
    const [open, setOpen] = createSignal(false);
    let root!: HTMLDivElement;

    createEffect(() => {
        if (!open()) return;
        const onPointerDown = (e: PointerEvent): void => {
            if (!root.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        onCleanup(() => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        });
    });

    return (
        <div ref={root} class="fab fab-menu" classList={{ open: open(), 'above-nav': props.aboveNav }}>
            <div class="fab-actions">
                <For each={props.items}>
                    {(item, index) => (
                        <button
                            class="fab-action"
                            // Items nearest the FAB appear first.
                            style={{ '--delay': `${(props.items.length - 1 - index()) * 30}ms` }}
                            tabIndex={open() ? 0 : -1}
                            aria-hidden={!open()}
                            onClick={() => {
                                setOpen(false);
                                item.onClick();
                            }}
                        >
                            <i>{item.icon}</i>
                            <span>{item.label}</span>
                        </button>
                    )}
                </For>
            </div>
            <button
                class="fab-toggle extra square round"
                aria-label={open() ? 'Close' : 'Create'}
                aria-expanded={open()}
                onClick={() => setOpen(!open())}
            >
                <i>add</i>
            </button>
        </div>
    );
};

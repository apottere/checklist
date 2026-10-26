import { Component, For, Show } from 'solid-js';
import { closeMenus, MenuItem } from '@/components/Menu.tsx';

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
        <div class="fab" classList={{ 'above-nav': props.aboveNav }}>
            <button class="extra square round" aria-label="Create">
                <i>add</i>
            </button>
            <menu class="top left transparent no-wrap fab-menu">
                <For each={props.items}>
                    {(item) => (
                        <li>
                            <button
                                class="secondary-container"
                                onClick={() => {
                                    closeMenus();
                                    item.onClick();
                                }}
                            >
                                <i>{item.icon}</i>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    )}
                </For>
            </menu>
        </div>
    </Show>
);

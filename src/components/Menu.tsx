import { Component, For, JSX } from 'solid-js';

export interface MenuItem {
    label: string;
    icon: string;
    onClick: () => void;
}

// Beer CSS menus stay open while focus is inside them.
const closeMenus = (): void => (document.activeElement as HTMLElement | null)?.blur();

export const Menu: Component<{ items: MenuItem[]; icon?: string; label?: string; header?: JSX.Element }> = (props) => (
    <div>
        <button
            class="circle transparent"
            aria-label={props.label ?? 'More options'}
            onClick={(e) => e.stopPropagation()}
        >
            <i>{props.icon ?? 'more_vert'}</i>
        </button>
        <menu class="left no-wrap">
            {props.header}
            <For each={props.items}>
                {(item) => (
                    <li
                        onClick={(e) => {
                            e.stopPropagation();
                            closeMenus();
                            item.onClick();
                        }}
                    >
                        <i>{item.icon}</i>
                        <span>{item.label}</span>
                    </li>
                )}
            </For>
        </menu>
    </div>
);

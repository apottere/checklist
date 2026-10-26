import { Component, JSX, Show } from 'solid-js';

export const EmptyState: Component<{
    icon: string;
    shape?: string;
    title: string;
    children?: JSX.Element;
    action?: JSX.Element;
}> = (props) => (
    <div class="empty-state">
        <div class={`shape ${props.shape ?? 'sunny'}`}>
            <i>{props.icon}</i>
        </div>
        <h6>{props.title}</h6>
        <Show when={props.children}>
            <p>{props.children}</p>
        </Show>
        {props.action}
    </div>
);

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ProgressRing: Component<{ value: number; total: number }> = (props) => {
    const fraction = (): number => (props.total === 0 ? 0 : props.value / props.total);
    return (
        <div class="ring" classList={{ complete: props.total > 0 && props.value === props.total }}>
            <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle class="ring-track" cx="22" cy="22" r={RADIUS} />
                {/* The round line cap would draw a dot at 0%. */}
                <Show when={fraction() > 0}>
                    <circle
                        class="ring-value"
                        cx="22"
                        cy="22"
                        r={RADIUS}
                        stroke-dasharray={`${CIRCUMFERENCE * fraction()} ${CIRCUMFERENCE}`}
                    />
                </Show>
            </svg>
            <Show
                when={props.total > 0 && props.value === props.total}
                fallback={<span>{Math.round(fraction() * 100)}%</span>}
            >
                <i>check</i>
            </Show>
        </div>
    );
};

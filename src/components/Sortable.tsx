import { For, JSX } from 'solid-js';

export interface HandleProps {
    onPointerDown: (e: PointerEvent) => void;
    class: string;
    'aria-label': string;
}

/**
 * A vertical list reordered by dragging a handle. Rows are moved with transforms during the drag and `onMove` is called
 * on drop; the list itself re-renders from data.
 */
export function SortableList<T>(props: {
    each: T[];
    onMove: (from: number, to: number) => void;
    class?: string;
    children: (item: T, handle: HandleProps) => JSX.Element;
}): JSX.Element {
    let list!: HTMLUListElement;

    const start = (from: number, e: PointerEvent): void => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const handle = e.currentTarget as HTMLElement;
        const rows = [...list.children] as HTMLElement[];
        const rects = rows.map((r) => r.getBoundingClientRect());
        const dragged = rows[from];
        // Distance a neighbor shifts to make room: the dragged row's height plus the gap between rows.
        const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
        const shift = rects[from].height + gap;
        const startY = e.clientY;
        let to = from;

        handle.setPointerCapture(e.pointerId);
        dragged.classList.add('dragging');

        const move = (ev: PointerEvent): void => {
            const dy = ev.clientY - startY;
            dragged.style.transform = `translateY(${dy}px)`;
            const center = rects[from].top + rects[from].height / 2 + dy;
            to = from;
            rects.forEach((rect, i) => {
                const mid = rect.top + rect.height / 2;
                if (i < from && center < mid) to = Math.min(to, i);
                if (i > from && center > mid) to = Math.max(to, i);
            });
            rows.forEach((row, i) => {
                if (i === from) return;
                const offset = i >= to && i < from ? shift : i <= to && i > from ? -shift : 0;
                row.style.transform = offset ? `translateY(${offset}px)` : '';
            });
        };

        const end = (): void => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', end);
            handle.removeEventListener('pointercancel', end);
            for (const row of rows) row.style.transform = '';
            dragged.classList.remove('dragging');
            if (to !== from) props.onMove(from, to);
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
    };

    return (
        <ul ref={list} class={props.class}>
            <For each={props.each}>
                {(item, index) =>
                    props.children(item, {
                        onPointerDown: (e) => start(index(), e),
                        class: 'handle',
                        'aria-label': 'Drag to reorder',
                    })
                }
            </For>
        </ul>
    );
}

// Stops clicks so dropping a row doesn't also activate whatever contains the handle.
export const Handle = (props: HandleProps): JSX.Element => (
    <i
        class={props.class}
        aria-label={props['aria-label']}
        onPointerDown={(e) => props.onPointerDown(e)}
        onClick={(e) => e.stopPropagation()}
    >
        drag_indicator
    </i>
);

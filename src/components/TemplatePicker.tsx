import { Component, For, Show } from 'solid-js';
import { PickableTemplate } from '@/lib/plan.ts';

export const TemplatePicker: Component<{
    templates: PickableTemplate[];
    selected: Set<string>;
    onChange: (selected: Set<string>) => void;
}> = (props) => {
    const toggle = (id: string, on: boolean): void => {
        const next = new Set(props.selected);
        if (on) next.add(id);
        else next.delete(id);
        props.onChange(next);
    };

    return (
        <Show when={props.templates.length > 0} fallback={<p class="muted">No templates to add.</p>}>
            <ul class="list picker">
                <For each={props.templates}>
                    {(p) => (
                        <li>
                            <label class="checkbox item max">
                                <input
                                    type="checkbox"
                                    checked={props.selected.has(p.template.id)}
                                    onChange={(e) => toggle(p.template.id, e.currentTarget.checked)}
                                />
                                <span>{p.label}</span>
                            </label>
                        </li>
                    )}
                </For>
            </ul>
        </Show>
    );
};

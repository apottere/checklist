import { Component, createEffect, createMemo, createSignal, For, JSX, on, onCleanup, Show, untrack } from 'solid-js';
import { ConfirmDialog, Dialog, TextDialog } from '@/components/Dialog.tsx';
import { Fab } from '@/components/Fab.tsx';
import { Reflow } from '@/components/Reflow.tsx';
import { EmptyState, ProgressRing } from '@/components/Visuals.tsx';
import { TemplatePicker } from '@/components/TemplatePicker.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { commit, commitWithUndo } from '@/lib/actions.ts';
import { useStore } from '@/lib/data.ts';
import { swipe } from '@/lib/gestures.ts';
import { DeleteChecklistDialog } from '@/screens/ArchiveScreen.tsx';
import {
    addItem,
    checklistView,
    filterView,
    GroupView,
    pickableTemplates,
    Progress,
    progress,
    SectionView,
    renameChecklist,
    reopenAll,
    sectionName,
    setChecklistArchived,
    setItemState,
} from '@/lib/plan.ts';
import { back, navigate } from '@/lib/router.ts';
import { Checklist, ChecklistItem, EXTRAS, ItemState, WithId } from '@/lib/schema.ts';
import { loadSetting, saveSetting } from '@/lib/settings.ts';
import { showSnackbar } from '@/lib/snackbar.ts';
import { NotFound } from '@/screens/common.tsx';

/** Long enough for the Undo snackbar of the last check to be used first. */
const ALL_DONE_DELAY_MS = 5000;

export const ChecklistScreen: Component<{ id: string }> = (props) => {
    const { data } = useStore();
    const checklist = (): WithId<Checklist> | undefined => data().checklists.find((c) => c.id === props.id);

    return (
        <Show
            when={checklist()}
            fallback={<NotFound parent={{ name: 'checklists' }}>This checklist doesn't exist.</NotFound>}
        >
            {(c) => <ChecklistView checklist={c()} />}
        </Show>
    );
};

const count = (view: GroupView[]): number =>
    view.reduce((n, g) => n + g.sections.reduce((m, s) => m + s.items.length, 0), 0);

const ChecklistView: Component<{ checklist: WithId<Checklist> }> = (props) => {
    const { data } = useStore();
    const id = (): string => props.checklist.id;
    const view = createMemo(() => checklistView(data(), id()));
    const [dialog, setDialog] = createSignal<'rename' | 'uncheck' | 'unskip' | 'add' | 'delete'>();

    const openView = createMemo(() => filterView(view(), (i) => i.state === 'open'));
    const doneView = createMemo(() => filterView(view(), (i) => i.state === 'done'));
    const skippedView = createMemo(() => filterView(view(), (i) => i.state === 'skipped'));
    const total = (): number => count(view());
    const summary = (): Progress => progress(data(), id());

    const changeState = (item: WithId<ChecklistItem>, state: ItemState): void => {
        const verb = { open: 'Reopened', done: 'Checked', skipped: 'Skipped' }[state];
        commitWithUndo(setItemState(data(), item.id, state), `${verb} "${item.text}"`);
    };

    const archive = (): void => {
        commitWithUndo(setChecklistArchived(data(), id(), true), `Archived "${props.checklist.name}"`);
        navigate({ name: 'checklists' }, true);
    };

    const openCount = (): number => count(filterView(view(), (i) => i.state === 'open'));
    let allDoneTimer: ReturnType<typeof setTimeout> | undefined;
    createEffect(
        on(openCount, (now, previous) => {
            clearTimeout(allDoneTimer);
            if (previous && now === 0 && !props.checklist.archived) {
                allDoneTimer = setTimeout(() => {
                    if (openCount() === 0) {
                        showSnackbar({
                            message: 'Everything is done or skipped',
                            action: { label: 'Archive', run: archive },
                        });
                    }
                }, ALL_DONE_DELAY_MS);
            }
        })
    );
    onCleanup(() => clearTimeout(allDoneTimer));

    const OpenRow: Component<{ item: WithId<ChecklistItem> }> = (p) => {
        let content!: HTMLLabelElement;
        return (
            <li
                class="swipe-row"
                ref={(el) => queueMicrotask(() => swipe(el, content, () => changeState(p.item, 'skipped')))}
            >
                <div class="swipe-behind" aria-hidden="true">
                    <i>block</i>
                    <span>Skip</span>
                </div>
                <label ref={content} class="checkbox item swipe-content">
                    <input
                        type="checkbox"
                        checked={p.item.state === 'done'}
                        onChange={(e) => changeState(p.item, e.currentTarget.checked ? 'done' : 'open')}
                    />
                    <span>{p.item.text}</span>
                </label>
            </li>
        );
    };

    const ResolvedRow: Component<{ item: WithId<ChecklistItem> }> = (p) => (
        <li class="resolved" onClick={() => changeState(p.item, 'open')}>
            <i classList={{ 'primary-text': p.item.state === 'done' }}>
                {p.item.state === 'done' ? 'check_circle' : 'block'}
            </i>
            <span class="max">{p.item.text}</span>
            <i class="muted" title="Reopen">
                undo
            </i>
        </li>
    );

    return (
        <>
            <TopBar
                title={props.checklist.name}
                onBack={() => back({ name: props.checklist.archived ? 'archivedChecklists' : 'checklists' })}
                menu={[
                    {
                        label: 'Edit structure',
                        icon: 'account_tree',
                        onClick: () => navigate({ name: 'structure', id: id() }),
                    },
                    { label: 'Rename', icon: 'edit', onClick: () => setDialog('rename') },
                    { label: 'Uncheck all', icon: 'remove_done', onClick: () => setDialog('uncheck') },
                    { label: 'Unskip all', icon: 'settings_backup_restore', onClick: () => setDialog('unskip') },
                    props.checklist.archived
                        ? {
                              label: 'Restore',
                              icon: 'unarchive',
                              onClick: () => commit(setChecklistArchived(data(), id(), false)),
                          }
                        : { label: 'Archive', icon: 'archive', onClick: archive },
                    ...(props.checklist.archived
                        ? [{ label: 'Delete forever', icon: 'delete_forever', onClick: () => setDialog('delete') }]
                        : []),
                ]}
            />
            <main class="responsive">
                <Show when={props.checklist.archived}>
                    <div class="archived-banner">
                        <i>inventory_2</i>
                        <span class="max">Archived. Template changes don't apply here.</span>
                        <button class="transparent" onClick={() => commit(setChecklistArchived(data(), id(), false))}>
                            Restore
                        </button>
                    </div>
                </Show>

                <Show
                    when={total() > 0}
                    fallback={
                        <EmptyState icon="playlist_add" shape="sided-cookie9" title="Nothing here yet">
                            Tap + to add items, or import templates with Edit structure.
                        </EmptyState>
                    }
                >
                    <div class="summary">
                        <ProgressRing value={summary().resolved} total={summary().total} />
                        <div class="max">
                            <div class="summary-title">
                                {summary().done} of {summary().total} done
                            </div>
                            <span>
                                {summary().skipped ? `${summary().skipped} skipped` : 'Swipe an item to skip it'}
                            </span>
                        </div>
                    </div>

                    <Show when={count(openView()) === 0}>
                        <EmptyState icon="task_alt" shape="very-sunny" title="All done">
                            Everything is done or skipped.
                        </EmptyState>
                    </Show>
                    <Grouped view={openView()} row={(item) => <OpenRow item={item} />} />

                    <Show when={count(doneView()) > 0}>
                        <details class="fold tonal">
                            <summary>
                                <span class="tile tile-primary">
                                    <i>check</i>
                                </span>
                                <span class="max">Done</span>
                                <span class="muted">{count(doneView())}</span>
                                <i class="chevron">expand_more</i>
                            </summary>
                            <Grouped view={doneView()} row={(item) => <ResolvedRow item={item} />} flat />
                        </details>
                    </Show>
                    <Show when={count(skippedView()) > 0}>
                        <details class="fold tonal">
                            <summary>
                                <span class="tile tile-tertiary">
                                    <i>block</i>
                                </span>
                                <span class="max">Skipped</span>
                                <span class="muted">{count(skippedView())}</span>
                                <i class="chevron">expand_more</i>
                            </summary>
                            <Grouped view={skippedView()} row={(item) => <ResolvedRow item={item} />} flat />
                        </details>
                    </Show>
                </Show>
            </main>

            <Fab items={[{ label: 'Add item', icon: 'add', onClick: () => setDialog('add') }]} />

            <TextDialog
                open={dialog() === 'rename'}
                title="Rename checklist"
                label="Name"
                confirm="Rename"
                initial={props.checklist.name}
                onSubmit={(name) => commit(renameChecklist(data(), id(), name))}
                onClose={() => setDialog(undefined)}
            />
            <ConfirmDialog
                open={dialog() === 'uncheck'}
                title="Uncheck all?"
                confirm="Uncheck all"
                onConfirm={() => commitWithUndo(reopenAll(data(), id(), 'done'), 'Unchecked all items')}
                onClose={() => setDialog(undefined)}
            >
                Every done item will be open again.
            </ConfirmDialog>
            <ConfirmDialog
                open={dialog() === 'unskip'}
                title="Unskip all?"
                confirm="Unskip all"
                onConfirm={() => commitWithUndo(reopenAll(data(), id(), 'skipped'), 'Unskipped all items')}
                onClose={() => setDialog(undefined)}
            >
                Every skipped item will be open again.
            </ConfirmDialog>
            <Show when={dialog() === 'add'}>
                <AddItemSheet checklist={props.checklist} onClose={() => setDialog(undefined)} />
            </Show>
            <Show when={dialog() === 'delete'}>
                <DeleteChecklistDialog
                    checklist={props.checklist}
                    onClose={() => setDialog(undefined)}
                    onDeleted={() => navigate({ name: 'archivedChecklists' }, true)}
                />
            </Show>
        </>
    );
};

/**
 * Groups and sections, keyed by ID so rows survive re-renders. Rows and sections that leave fade out while the rest
 * slide into place. `flat` drops the section cards, for use inside a fold.
 */
const Grouped: Component<{
    view: GroupView[];
    row: (item: WithId<ChecklistItem>) => JSX.Element;
    flat?: boolean;
}> = (props) => (
    <Reflow>
        <For each={props.view.map((g) => g.group.id)}>
            {(groupId) => {
                const group = (): GroupView | undefined => props.view.find((g) => g.group.id === groupId);
                return (
                    <Show when={group()}>
                        {(g) => (
                            <section class="group">
                                <Show when={g().group.name}>
                                    <h5 class="group-title">{g().group.name}</h5>
                                </Show>
                                <Reflow>
                                    <For each={g().sections.map((s) => s.section.id)}>
                                        {(sectionId) => {
                                            const section = (): SectionView | undefined =>
                                                g().sections.find((s) => s.section.id === sectionId);
                                            return (
                                                <Show when={section()}>
                                                    {(s) => (
                                                        <div classList={{ tonal: !props.flat }}>
                                                            <div class="section-title">
                                                                <span>{s().name}</span>
                                                                <span class="muted">{s().items.length}</span>
                                                            </div>
                                                            <ul class="list">
                                                                <Reflow>
                                                                    <For each={s().items}>
                                                                        {(item) => props.row(item)}
                                                                    </For>
                                                                </Reflow>
                                                            </ul>
                                                        </div>
                                                    )}
                                                </Show>
                                            );
                                        }}
                                    </For>
                                </Reflow>
                            </section>
                        )}
                    </Show>
                );
            }}
        </For>
    </Reflow>
);

// Stays open after each add for quick entry.
const AddItemSheet: Component<{ checklist: WithId<Checklist>; onClose: () => void }> = (props) => {
    const { data } = useStore();
    const settingKey = (): string => `lastSection:${props.checklist.id}`;
    const sections = createMemo(() =>
        props.checklist.groups.flatMap((g) =>
            g.sections.map((s) => ({
                section: s,
                label: g.name ? `${g.name} / ${sectionName(data(), s)}` : sectionName(data(), s),
            }))
        )
    );
    const [sectionId, setSectionId] = createSignal(
        untrack(() => {
            const last = loadSetting(settingKey());
            return last && sections().some((s) => s.section.id === last) ? last : EXTRAS;
        })
    );
    const [templateIds, setTemplateIds] = createSignal(new Set<string>());
    const [text, setText] = createSignal('');
    let input!: HTMLInputElement;

    const sectionTemplate = createMemo(() => {
        const templateId = sections().find((s) => s.section.id === sectionId())?.section.templateId;
        return data().templates.find((t) => t.id === templateId && !t.archived);
    });
    const otherTemplates = createMemo(() =>
        pickableTemplates(data()).filter((p) => p.template.id !== sectionTemplate()?.id)
    );

    const toggleSectionTemplate = (on: boolean): void => {
        const templateId = sectionTemplate()?.id;
        if (!templateId) return;
        const next = new Set(templateIds());
        if (on) next.add(templateId);
        else next.delete(templateId);
        setTemplateIds(next);
    };

    const submit = (e: SubmitEvent): void => {
        e.preventDefault();
        const value = text().trim();
        if (!value) return;
        commit(addItem(data(), props.checklist.id, sectionId(), value, [...templateIds()]));
        saveSetting(settingKey(), sectionId());
        setText('');
        input.focus();
    };

    return (
        <Dialog open onClose={props.onClose} class="bottom">
            <form onSubmit={submit} class="form-dialog">
                <div class="sheet-handle" />
                <h6>Add item</h6>
                <div class="field label border">
                    <input
                        ref={input}
                        value={text()}
                        onInput={(e) => setText(e.currentTarget.value)}
                        placeholder=" "
                        maxLength={1000}
                        enterkeyhint="done"
                        autofocus
                    />
                    <label>New item</label>
                </div>
                <div class="field label border">
                    <select
                        value={sectionId()}
                        onChange={(e) => {
                            setSectionId(e.currentTarget.value);
                            setTemplateIds(new Set<string>());
                        }}
                    >
                        <For each={sections()}>{(s) => <option value={s.section.id}>{s.label}</option>}</For>
                    </select>
                    <label>Section</label>
                </div>
                <Show when={sectionTemplate()}>
                    {(t) => (
                        <label class="checkbox item">
                            <input
                                type="checkbox"
                                checked={templateIds().has(t().id)}
                                onChange={(e) => toggleSectionTemplate(e.currentTarget.checked)}
                            />
                            <span>Also add to template "{t().name}"</span>
                        </label>
                    )}
                </Show>
                <Show when={otherTemplates().length > 0}>
                    <details class="more-templates">
                        <summary class="muted">
                            {sectionTemplate() ? 'Also add to other templates' : 'Also add to templates'}
                        </summary>
                        <TemplatePicker
                            templates={otherTemplates()}
                            selected={templateIds()}
                            onChange={setTemplateIds}
                        />
                    </details>
                </Show>
                <nav class="right-align">
                    <button type="button" class="transparent" onClick={() => props.onClose()}>
                        Done
                    </button>
                    <button type="submit">
                        <i>add</i>
                        <span>Add</span>
                    </button>
                </nav>
            </form>
        </Dialog>
    );
};

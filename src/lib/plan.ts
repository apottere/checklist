// Pure functions that turn user actions into Firestore writes, so sync logic is testable without Firestore.
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import {
    Checklist,
    ChecklistItem,
    Collection,
    Data,
    DEFAULT_GROUP,
    EXTRAS,
    Folder,
    Group,
    ItemState,
    Section,
    Template,
    TemplateItem,
    WithId,
} from '@/lib/schema.ts';

type Fields = Record<string, unknown>;

export type Op =
    | { kind: 'set'; collection: Collection; id: string; data: Fields }
    | { kind: 'update'; collection: Collection; id: string; data: Fields; before: Fields }
    | { kind: 'delete'; collection: Collection; id: string; before: Fields };

export interface Env {
    newId: () => string;
    now: () => number;
}

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const defaultEnv: Env = {
    newId: () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => ID_CHARS[b % ID_CHARS.length]).join(''),
    now: () => Date.now(),
};

// Ops

function fields(doc: object): Fields {
    const copy: Fields = { ...doc };
    delete copy.id;
    return copy;
}

const set = (collection: Collection, id: string, data: object): Op => ({
    kind: 'set',
    collection,
    id,
    data: { ...data },
});

function update<T extends object>(collection: Collection, doc: WithId<T>, data: Partial<T>): Op {
    const before: Fields = {};
    for (const key of Object.keys(data)) before[key] = (doc as Fields)[key];
    return { kind: 'update', collection, id: doc.id, data: data as Fields, before };
}

const remove = (collection: Collection, doc: object & { id: string }): Op => ({
    kind: 'delete',
    collection,
    id: doc.id,
    before: fields(doc),
});

function invert(op: Op): Op {
    switch (op.kind) {
        case 'set':
            return { kind: 'delete', collection: op.collection, id: op.id, before: op.data };
        case 'update':
            return { kind: 'update', collection: op.collection, id: op.id, data: op.before, before: op.data };
        case 'delete':
            return { kind: 'set', collection: op.collection, id: op.id, data: op.before };
    }
}

export const inverse = (ops: Op[]): Op[] => ops.map(invert).reverse();

// Helpers

// Plain comparison, not localeCompare: fractional index keys sort by code unit.
export const byOrder = (a: { order: string }, b: { order: string }): number =>
    a.order < b.order ? -1 : a.order > b.order ? 1 : 0;

const sorted = <T extends { order: string }>(list: T[]): T[] => [...list].sort(byOrder);

const keyAfter = (list: { order: string }[]): string => generateKeyBetween(sorted(list).at(-1)?.order ?? null, null);

/** The order key that moves the item at `from` to index `to` of the sorted list. */
function keyForMove(list: { order: string }[], from: number, to: number): string {
    const rest = sorted(list);
    rest.splice(from, 1);
    return generateKeyBetween(rest[to - 1]?.order ?? null, rest[to]?.order ?? null);
}

function find<T>(list: WithId<T>[], id: string): WithId<T> {
    const doc = list.find((d) => d.id === id);
    if (!doc) throw new Error(`Not found: ${id}`);
    return doc;
}

function move<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
}

// Library

export type LibraryEntry =
    | { kind: 'folder'; folder: WithId<Folder>; templates: WithId<Template>[] }
    | { kind: 'template'; template: WithId<Template> };

const activeTemplates = (d: Data): WithId<Template>[] => d.templates.filter((t) => !t.archived);

export function library(d: Data): LibraryEntry[] {
    const folderIds = new Set(d.folders.map((f) => f.id));
    const entries: (LibraryEntry & { order: string })[] = [
        ...d.folders.map((folder) => ({
            kind: 'folder' as const,
            order: folder.order,
            folder,
            templates: sorted(activeTemplates(d).filter((t) => t.folderId === folder.id)),
        })),
        ...activeTemplates(d)
            .filter((t) => t.folderId === null || !folderIds.has(t.folderId))
            .map((template) => ({ kind: 'template' as const, order: template.order, template })),
    ];
    return sorted(entries);
}

const topLevel = (d: Data): (WithId<Folder> | WithId<Template>)[] =>
    library(d).map((e) => (e.kind === 'folder' ? e.folder : e.template));

const containerTemplates = (d: Data, folderId: string | null): { order: string }[] =>
    folderId === null ? topLevel(d) : activeTemplates(d).filter((t) => t.folderId === folderId);

export interface PickableTemplate {
    template: WithId<Template>;
    /** Flattened as `Folder / Template`. */
    label: string;
}

/** Active templates in library order. */
export function pickableTemplates(d: Data): PickableTemplate[] {
    return library(d).flatMap((e) =>
        e.kind === 'folder'
            ? e.templates.map((template) => ({ template, label: `${e.folder.name} / ${template.name}` }))
            : [{ template: e.template, label: e.template.name }]
    );
}

export function createFolder(d: Data, name: string, env = defaultEnv): Op[] {
    return [set('folders', env.newId(), { name, order: keyAfter(topLevel(d)) } satisfies Folder)];
}

export const renameFolder = (d: Data, id: string, name: string): Op[] => [
    update('folders', find(d.folders, id), { name }),
];

/** Moves the folder's templates to the end of the top level. */
export function deleteFolder(d: Data, id: string): Op[] {
    const contained = sorted(d.templates.filter((t) => t.folderId === id));
    const keys = generateNKeysBetween(sorted(topLevel(d)).at(-1)?.order ?? null, null, contained.length);
    return [
        remove('folders', find(d.folders, id)),
        ...contained.map((t, i) => update('templates', t, { folderId: null, order: keys[i] })),
    ];
}

export function moveTopLevel(d: Data, from: number, to: number): Op[] {
    const entry = library(d)[from];
    const order = keyForMove(topLevel(d), from, to);
    return entry.kind === 'folder'
        ? [update('folders', entry.folder, { order })]
        : [update('templates', entry.template, { order })];
}

export function moveInFolder(d: Data, folderId: string, from: number, to: number): Op[] {
    const list = sorted(activeTemplates(d).filter((t) => t.folderId === folderId));
    return [update('templates', list[from], { order: keyForMove(list, from, to) })];
}

export function createTemplate(
    d: Data,
    name: string,
    folderId: string | null,
    env = defaultEnv
): { id: string; ops: Op[] } {
    const id = env.newId();
    const template: Template = {
        name,
        folderId,
        order: keyAfter(containerTemplates(d, folderId)),
        archived: false,
        createdAt: env.now(),
    };
    return { id, ops: [set('templates', id, template)] };
}

export const renameTemplate = (d: Data, id: string, name: string): Op[] => [
    update('templates', find(d.templates, id), { name }),
];

export const setTemplateArchived = (d: Data, id: string, archived: boolean): Op[] => [
    update('templates', find(d.templates, id), { archived }),
];

export function moveTemplateToFolder(d: Data, id: string, folderId: string | null): Op[] {
    const template = find(d.templates, id);
    if (template.folderId === folderId) return [];
    return [update('templates', template, { folderId, order: keyAfter(containerTemplates(d, folderId)) })];
}

/** Checklist items synced from the template become local items. */
export function deleteTemplate(d: Data, id: string): Op[] {
    const items = d.templateItems.filter((i) => i.templateId === id);
    const itemIds = new Set(items.map((i) => i.id));
    return [
        remove('templates', find(d.templates, id)),
        ...items.map((i) => remove('templateItems', i)),
        ...d.checklistItems
            .filter((i) => i.templateItemId !== null && itemIds.has(i.templateItemId))
            .map((i) => update('checklistItems', i, { templateItemId: null })),
    ];
}

export const templateItems = (d: Data, templateId: string): WithId<TemplateItem>[] =>
    sorted(d.templateItems.filter((i) => i.templateId === templateId));

// Template sync

const activeChecklistIds = (d: Data): Set<string> => new Set(d.checklists.filter((c) => !c.archived).map((c) => c.id));

function activeSections(d: Data, templateId: string): { checklistId: string; sectionId: string }[] {
    return d.checklists
        .filter((c) => !c.archived)
        .flatMap((c) =>
            c.groups.flatMap((g) =>
                g.sections
                    .filter((s) => s.templateId === templateId)
                    .map((s) => ({ checklistId: c.id, sectionId: s.id }))
            )
        );
}

function linkedActiveItems(d: Data, templateItemId: string): WithId<ChecklistItem>[] {
    const active = activeChecklistIds(d);
    return d.checklistItems.filter((i) => i.templateItemId === templateItemId && active.has(i.checklistId));
}

export function addTemplateItem(d: Data, templateId: string, text: string, env = defaultEnv): Op[] {
    const id = env.newId();
    const order = keyAfter(templateItems(d, templateId));
    return [
        set('templateItems', id, { templateId, text, order } satisfies TemplateItem),
        ...activeSections(d, templateId).map((s) =>
            set('checklistItems', env.newId(), {
                ...s,
                templateItemId: id,
                text,
                order,
                state: 'open',
            } satisfies ChecklistItem)
        ),
    ];
}

export function editTemplateItem(d: Data, id: string, text: string): Op[] {
    return [
        update('templateItems', find(d.templateItems, id), { text }),
        ...linkedActiveItems(d, id).map((i) => update('checklistItems', i, { text })),
    ];
}

export function moveTemplateItem(d: Data, templateId: string, from: number, to: number): Op[] {
    const list = templateItems(d, templateId);
    const order = keyForMove(list, from, to);
    return [
        update('templateItems', list[from], { order }),
        ...linkedActiveItems(d, list[from].id).map((i) => update('checklistItems', i, { order })),
    ];
}

export function deleteTemplateItem(d: Data, id: string): Op[] {
    return [
        remove('templateItems', find(d.templateItems, id)),
        ...linkedActiveItems(d, id).map((i) => remove('checklistItems', i)),
    ];
}

// Checklists

export const activeChecklists = (d: Data): WithId<Checklist>[] => sorted(d.checklists.filter((c) => !c.archived));

/** Imports templates, in library order, as new sections of a checklist. */
function importSections(
    d: Data,
    checklistId: string,
    templateIds: string[],
    env: Env
): { sections: Section[]; ops: Op[] } {
    const sections: Section[] = [];
    const ops: Op[] = [];
    const templates = pickableTemplates(d)
        .map((p) => p.template)
        .filter((t) => templateIds.includes(t.id));
    for (const template of templates) {
        const sectionId = env.newId();
        sections.push({ id: sectionId, templateId: template.id, name: template.name });
        for (const item of templateItems(d, template.id)) {
            ops.push(
                set('checklistItems', env.newId(), {
                    checklistId,
                    sectionId,
                    templateItemId: item.id,
                    text: item.text,
                    order: item.order,
                    state: 'open',
                } satisfies ChecklistItem)
            );
        }
    }
    return { sections, ops };
}

export function createChecklist(
    d: Data,
    name: string,
    templateIds: string[],
    env = defaultEnv
): { id: string; ops: Op[] } {
    const id = env.newId();
    const { sections, ops } = importSections(d, id, templateIds, env);
    const checklist: Checklist = {
        name,
        order: keyAfter(activeChecklists(d)),
        archived: false,
        createdAt: env.now(),
        groups: [
            {
                id: DEFAULT_GROUP,
                name: null,
                sections: [...sections, { id: EXTRAS, templateId: null, name: 'Extras' }],
            },
        ],
    };
    return { id, ops: [set('checklists', id, checklist), ...ops] };
}

export const renameChecklist = (d: Data, id: string, name: string): Op[] => [
    update('checklists', find(d.checklists, id), { name }),
];

export const setChecklistArchived = (d: Data, id: string, archived: boolean): Op[] => [
    update('checklists', find(d.checklists, id), { archived }),
];

export const deleteChecklist = (d: Data, id: string): Op[] => [
    remove('checklists', find(d.checklists, id)),
    ...d.checklistItems.filter((i) => i.checklistId === id).map((i) => remove('checklistItems', i)),
];

export function moveChecklist(d: Data, from: number, to: number): Op[] {
    const list = activeChecklists(d);
    return [update('checklists', list[from], { order: keyForMove(list, from, to) })];
}

export const setItemState = (d: Data, id: string, state: ItemState): Op[] => [
    update('checklistItems', find(d.checklistItems, id), { state }),
];

/** Reopens every item in the given state. */
export const reopenAll = (d: Data, checklistId: string, state: 'done' | 'skipped'): Op[] =>
    d.checklistItems
        .filter((i) => i.checklistId === checklistId && i.state === state)
        .map((i) => update('checklistItems', i, { state: 'open' }));

function findSection(checklist: Checklist, sectionId: string): Section {
    const section = checklist.groups.flatMap((g) => g.sections).find((s) => s.id === sectionId);
    if (!section) throw new Error(`Not found: ${sectionId}`);
    return section;
}

function addLocalItem(d: Data, checklistId: string, sectionId: string, text: string, env: Env): Op {
    const locals = d.checklistItems.filter(
        (i) => i.checklistId === checklistId && i.sectionId === sectionId && i.templateItemId === null
    );
    return set('checklistItems', env.newId(), {
        checklistId,
        sectionId,
        templateItemId: null,
        text,
        order: keyAfter(locals),
        state: 'open',
    } satisfies ChecklistItem);
}

/**
 * Adds to each template, which syncs to every section imported from it. Adds a local item too unless the chosen
 * section's template is one of them, since sync already covers that section.
 */
export function addItem(
    d: Data,
    checklistId: string,
    sectionId: string,
    text: string,
    templateIds: string[],
    env = defaultEnv
): Op[] {
    const section = findSection(find(d.checklists, checklistId), sectionId);
    const ops = templateIds.flatMap((templateId) => addTemplateItem(d, templateId, text, env));
    if (section.templateId === null || !templateIds.includes(section.templateId)) {
        ops.push(addLocalItem(d, checklistId, sectionId, text, env));
    }
    return ops;
}

// Checklist structure

const withGroups = (checklist: WithId<Checklist>, groups: Group[]): Op => update('checklists', checklist, { groups });

function sectionItems(d: Data, checklistId: string, sectionIds: Set<string>): WithId<ChecklistItem>[] {
    return d.checklistItems.filter((i) => i.checklistId === checklistId && sectionIds.has(i.sectionId));
}

/** Extras stays last in the default group. */
function appendSections(sections: Section[], added: Section[]): Section[] {
    return [...sections.filter((s) => s.id !== EXTRAS), ...added, ...sections.filter((s) => s.id === EXTRAS)];
}

export function addGroup(d: Data, checklistId: string, name: string, templateIds: string[], env = defaultEnv): Op[] {
    const checklist = find(d.checklists, checklistId);
    const { sections, ops } = importSections(d, checklistId, templateIds, env);
    return [withGroups(checklist, [...checklist.groups, { id: env.newId(), name, sections }]), ...ops];
}

export function renameGroup(d: Data, checklistId: string, groupId: string, name: string): Op[] {
    const checklist = find(d.checklists, checklistId);
    return [
        withGroups(
            checklist,
            checklist.groups.map((g) => (g.id === groupId ? { ...g, name } : g))
        ),
    ];
}

export function removeGroup(d: Data, checklistId: string, groupId: string): Op[] {
    if (groupId === DEFAULT_GROUP) throw new Error("The default group can't be removed");
    const checklist = find(d.checklists, checklistId);
    const group = checklist.groups.find((g) => g.id === groupId);
    if (!group) return [];
    const ids = new Set(group.sections.map((s) => s.id));
    return [
        withGroups(
            checklist,
            checklist.groups.filter((g) => g.id !== groupId)
        ),
        ...sectionItems(d, checklistId, ids).map((i) => remove('checklistItems', i)),
    ];
}

/** Indices count only named groups; the default group stays first. */
export function moveGroup(d: Data, checklistId: string, from: number, to: number): Op[] {
    const checklist = find(d.checklists, checklistId);
    const [defaultGroup, ...named] = checklist.groups;
    return [withGroups(checklist, [defaultGroup, ...move(named, from, to)])];
}

/** Templates already in the group are skipped. */
export function importTemplates(
    d: Data,
    checklistId: string,
    groupId: string,
    templateIds: string[],
    env = defaultEnv
): Op[] {
    const checklist = find(d.checklists, checklistId);
    const group = checklist.groups.find((g) => g.id === groupId);
    if (!group) return [];
    const existing = new Set(group.sections.map((s) => s.templateId));
    const { sections, ops } = importSections(
        d,
        checklistId,
        templateIds.filter((id) => !existing.has(id)),
        env
    );
    const groups = checklist.groups.map((g) =>
        g.id === groupId ? { ...g, sections: appendSections(g.sections, sections) } : g
    );
    return [withGroups(checklist, groups), ...ops];
}

export function removeSection(d: Data, checklistId: string, sectionId: string): Op[] {
    if (sectionId === EXTRAS) throw new Error("Extras can't be removed");
    const checklist = find(d.checklists, checklistId);
    const groups = checklist.groups.map((g) => ({ ...g, sections: g.sections.filter((s) => s.id !== sectionId) }));
    return [
        withGroups(checklist, groups),
        ...sectionItems(d, checklistId, new Set([sectionId])).map((i) => remove('checklistItems', i)),
    ];
}

/** Indices exclude Extras, which stays last. */
export function moveSection(d: Data, checklistId: string, groupId: string, from: number, to: number): Op[] {
    const checklist = find(d.checklists, checklistId);
    const groups = checklist.groups.map((g) => {
        if (g.id !== groupId) return g;
        const movable = g.sections.filter((s) => s.id !== EXTRAS);
        return { ...g, sections: appendSections(move(movable, from, to), g.sections) };
    });
    return [withGroups(checklist, groups)];
}

// Views

export interface SectionView {
    section: Section;
    name: string;
    items: WithId<ChecklistItem>[];
}

export interface GroupView {
    group: Group;
    sections: SectionView[];
}

export const sectionName = (d: Data, section: Section): string =>
    d.templates.find((t) => t.id === section.templateId)?.name ?? section.name;

// Synced items follow the template's order; local items come after.
const itemOrder = (a: ChecklistItem, b: ChecklistItem): number =>
    Number(a.templateItemId === null) - Number(b.templateItemId === null) || byOrder(a, b);

export function checklistView(d: Data, checklistId: string): GroupView[] {
    const checklist = d.checklists.find((c) => c.id === checklistId);
    if (!checklist) return [];
    const items = d.checklistItems.filter((i) => i.checklistId === checklistId);
    return checklist.groups.map((group) => ({
        group,
        sections: group.sections.map((section) => ({
            section,
            name: sectionName(d, section),
            items: items.filter((i) => i.sectionId === section.id).sort(itemOrder),
        })),
    }));
}

/** Keeps matching items, dropping sections and groups left empty. */
export function filterView(view: GroupView[], keep: (item: WithId<ChecklistItem>) => boolean): GroupView[] {
    return view
        .map((g) => ({
            ...g,
            sections: g.sections.map((s) => ({ ...s, items: s.items.filter(keep) })).filter((s) => s.items.length > 0),
        }))
        .filter((g) => g.sections.length > 0);
}

export interface Progress {
    done: number;
    skipped: number;
    /** Done or skipped. */
    resolved: number;
    total: number;
}

export function progress(d: Data, checklistId: string): Progress {
    const items = d.checklistItems.filter((i) => i.checklistId === checklistId);
    const done = items.filter((i) => i.state === 'done').length;
    const skipped = items.filter((i) => i.state === 'skipped').length;
    return { done, skipped, resolved: done + skipped, total: items.length };
}

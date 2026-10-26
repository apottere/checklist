import { describe, expect, test } from 'vitest';
import {
    addItem,
    addTemplateItem,
    checklistView,
    createChecklist,
    deleteFolder,
    deleteTemplate,
    deleteTemplateItem,
    editTemplateItem,
    Env,
    filterView,
    importTemplates,
    inverse,
    library,
    moveGroup,
    moveTemplateItem,
    Op,
    pickableTemplates,
    removeSection,
    reopenAll,
} from '@/lib/plan.ts';
import { Collection, Data, DEFAULT_GROUP, EXTRAS } from '@/lib/schema.ts';

function testEnv(): Env {
    let next = 0;
    return { newId: () => `id${++next}`, now: () => 1000 };
}

/** Applies ops to a copy of the data, like Firestore would. */
function apply(d: Data, ops: Op[]): Data {
    const result = structuredClone(d);
    for (const op of ops) {
        const list = result[op.collection] as { id: string }[];
        const index = list.findIndex((doc) => doc.id === op.id);
        if (op.kind === 'set') {
            const doc = { ...op.data, id: op.id };
            if (index >= 0) list[index] = doc;
            else list.push(doc);
        } else if (op.kind === 'update') {
            list[index] = { ...list[index], ...op.data };
        } else {
            list.splice(index, 1);
        }
    }
    return result;
}

const empty = (): Data => ({ folders: [], templates: [], templateItems: [], checklists: [], checklistItems: [] });

function fixture(): Data {
    return {
        ...empty(),
        folders: [{ id: 'travel', name: 'Travel', order: 'a1' }],
        templates: [
            { id: 'toiletries', name: 'Toiletries', folderId: 'travel', order: 'a0', archived: false, createdAt: 0 },
            { id: 'work', name: 'Work', folderId: null, order: 'a0', archived: false, createdAt: 0 },
            { id: 'old', name: 'Old', folderId: null, order: 'a2', archived: true, createdAt: 0 },
        ],
        templateItems: [
            { id: 'brush', templateId: 'toiletries', text: 'Toothbrush', order: 'a0' },
            { id: 'paste', templateId: 'toiletries', text: 'Toothpaste', order: 'a1' },
            { id: 'laptop', templateId: 'work', text: 'Laptop', order: 'a0' },
        ],
    };
}

const texts = (d: Data, checklistId: string): string[] =>
    checklistView(d, checklistId).flatMap((g) => g.sections.flatMap((s) => s.items.map((i) => i.text)));

const count = (d: Data, collection: Collection): number => d[collection].length;

describe('library', () => {
    test('orders folders and top-level templates together, skipping archived', () => {
        const entries = library(fixture()).map((e) => (e.kind === 'folder' ? e.folder.name : e.template.name));
        expect(entries).toEqual(['Work', 'Travel']);
    });

    test('flattens folder names for picking', () => {
        expect(pickableTemplates(fixture()).map((p) => p.label)).toEqual(['Work', 'Travel / Toiletries']);
    });

    test('deleting a folder moves its templates to the end of the top level', () => {
        const d = apply(fixture(), deleteFolder(fixture(), 'travel'));
        expect(library(d).map((e) => (e.kind === 'template' ? e.template.name : ''))).toEqual(['Work', 'Toiletries']);
    });
});

describe('creating a checklist', () => {
    test('imports templates in library order into the default group, with Extras last', () => {
        const env = testEnv();
        const { id, ops } = createChecklist(fixture(), 'Trip', ['toiletries', 'work'], env);
        const d = apply(fixture(), ops);
        const [group] = checklistView(d, id);
        expect(group.group.id).toBe(DEFAULT_GROUP);
        expect(group.sections.map((s) => s.name)).toEqual(['Work', 'Toiletries', 'Extras']);
        expect(texts(d, id)).toEqual(['Laptop', 'Toothbrush', 'Toothpaste']);
        expect(d.checklistItems.every((i) => i.state === 'open' && i.templateItemId !== null)).toBe(true);
    });
});

function withChecklists(): { d: Data; active: string; archived: string; env: Env } {
    const env = testEnv();
    let d = fixture();
    const active = createChecklist(d, 'Active', ['toiletries'], env);
    d = apply(d, active.ops);
    const archived = createChecklist(d, 'Archived', ['toiletries'], env);
    d = apply(d, archived.ops);
    d.checklists.find((c) => c.id === archived.id)!.archived = true;
    return { d, active: active.id, archived: archived.id, env };
}

describe('template sync', () => {
    test('adding a template item adds it to active checklists only', () => {
        const { d, active, archived, env } = withChecklists();
        const next = apply(d, addTemplateItem(d, 'toiletries', 'Floss', env));
        expect(texts(next, active)).toEqual(['Toothbrush', 'Toothpaste', 'Floss']);
        expect(texts(next, archived)).toEqual(['Toothbrush', 'Toothpaste']);
    });

    test('adds to every section imported from the template, across groups', () => {
        const { d, active, env } = withChecklists();
        let next = apply(d, importTemplates(d, active, DEFAULT_GROUP, ['toiletries'], env));
        expect(texts(next, active)).toHaveLength(2);
        const withGroup = apply(next, [
            {
                kind: 'update',
                collection: 'checklists',
                id: active,
                data: {
                    groups: [
                        ...next.checklists.find((c) => c.id === active)!.groups,
                        { id: 'day2', name: 'Day 2', sections: [] },
                    ],
                },
                before: {},
            },
        ]);
        next = apply(withGroup, importTemplates(withGroup, active, 'day2', ['toiletries'], env));
        next = apply(next, addTemplateItem(next, 'toiletries', 'Floss', env));
        expect(texts(next, active).filter((t) => t === 'Floss')).toHaveLength(2);
    });

    test('editing, reordering, and deleting sync to active checklists only', () => {
        const { d, active, archived } = withChecklists();
        let next = apply(d, editTemplateItem(d, 'brush', 'Electric toothbrush'));
        next = apply(next, moveTemplateItem(next, 'toiletries', 0, 1));
        expect(texts(next, active)).toEqual(['Toothpaste', 'Electric toothbrush']);
        expect(texts(next, archived)).toEqual(['Toothbrush', 'Toothpaste']);

        next = apply(next, deleteTemplateItem(next, 'paste'));
        expect(texts(next, active)).toEqual(['Electric toothbrush']);
        expect(texts(next, archived)).toEqual(['Toothbrush', 'Toothpaste']);
    });

    test('keeps item state', () => {
        const { d, active } = withChecklists();
        const item = d.checklistItems.find((i) => i.checklistId === active && i.templateItemId === 'brush')!;
        item.state = 'done';
        const next = apply(d, editTemplateItem(d, 'brush', 'Brush'));
        expect(next.checklistItems.find((i) => i.id === item.id)).toMatchObject({ text: 'Brush', state: 'done' });
    });

    test('deleting a template turns its synced items into local ones', () => {
        const { d, active } = withChecklists();
        const next = apply(d, deleteTemplate(d, 'toiletries'));
        expect(count(next, 'templateItems')).toBe(1);
        expect(texts(next, active)).toEqual(['Toothbrush', 'Toothpaste']);
        expect(next.checklistItems.every((i) => i.templateItemId === null)).toBe(true);
        expect(checklistView(next, active)[0].sections[0].name).toBe('Toiletries');
    });
});

describe('adding items from a checklist', () => {
    const toiletriesSection = (d: Data, id: string): string =>
        d.checklists.find((c) => c.id === id)!.groups[0].sections[0].id;

    test('without templates adds a local item after synced ones', () => {
        const { d, active, env } = withChecklists();
        let next = apply(d, addItem(d, active, toiletriesSection(d, active), 'Razor', [], env));
        next = apply(next, addTemplateItem(next, 'toiletries', 'Floss', env));
        expect(texts(next, active)).toEqual(['Toothbrush', 'Toothpaste', 'Floss', 'Razor']);
        expect(count(next, 'templateItems')).toBe(4);
    });

    test("with the section's template adds through sync only", () => {
        const { d, active, archived, env } = withChecklists();
        const next = apply(d, addItem(d, active, toiletriesSection(d, active), 'Razor', ['toiletries'], env));
        expect(texts(next, active).filter((t) => t === 'Razor')).toHaveLength(1);
        expect(texts(next, archived)).not.toContain('Razor');
        expect(next.templateItems.map((i) => i.text)).toContain('Razor');
    });

    test('with another template adds locally and to that template', () => {
        const { d, active, env } = withChecklists();
        const next = apply(d, addItem(d, active, EXTRAS, 'Charger', ['work'], env));
        const extras = checklistView(next, active)[0].sections.find((s) => s.section.id === EXTRAS)!;
        expect(extras.items.map((i) => i.text)).toEqual(['Charger']);
        expect(next.templateItems.filter((i) => i.templateId === 'work').map((i) => i.text)).toEqual([
            'Laptop',
            'Charger',
        ]);
    });
});

describe('checklist structure', () => {
    test('importing skips templates already in the group, and Extras stays last', () => {
        const { d, active, env } = withChecklists();
        const next = apply(d, importTemplates(d, active, DEFAULT_GROUP, ['toiletries', 'work'], env));
        expect(checklistView(next, active)[0].sections.map((s) => s.name)).toEqual(['Toiletries', 'Work', 'Extras']);
    });

    test('removing a section removes its items, and undo restores them', () => {
        const { d, active } = withChecklists();
        const section = d.checklists.find((c) => c.id === active)!.groups[0].sections[0].id;
        const ops = removeSection(d, active, section);
        const removed = apply(d, ops);
        expect(texts(removed, active)).toEqual([]);
        const restored = apply(removed, inverse(ops));
        expect(texts(restored, active)).toEqual(['Toothbrush', 'Toothpaste']);
        expect(restored.checklists).toEqual(d.checklists);
    });

    test('the default group stays first when reordering', () => {
        const { d, active } = withChecklists();
        const checklist = d.checklists.find((c) => c.id === active)!;
        checklist.groups.push({ id: 'a', name: 'A', sections: [] }, { id: 'b', name: 'B', sections: [] });
        const next = apply(d, moveGroup(d, active, 0, 1));
        expect(next.checklists.find((c) => c.id === active)!.groups.map((g) => g.id)).toEqual([
            DEFAULT_GROUP,
            'b',
            'a',
        ]);
    });
});

describe('item state', () => {
    test('reopenAll only touches the given state', () => {
        const { d, active } = withChecklists();
        const [first, second] = d.checklistItems.filter((i) => i.checklistId === active);
        first.state = 'done';
        second.state = 'skipped';
        const next = apply(d, reopenAll(d, active, 'done'));
        expect(next.checklistItems.find((i) => i.id === first.id)!.state).toBe('open');
        expect(next.checklistItems.find((i) => i.id === second.id)!.state).toBe('skipped');
    });

    test('filterView drops empty sections and groups', () => {
        const { d, active } = withChecklists();
        const view = filterView(checklistView(d, active), (i) => i.state === 'done');
        expect(view).toEqual([]);
    });
});

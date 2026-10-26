export interface Folder {
    name: string;
    order: string;
}

export interface Template {
    name: string;
    folderId: string | null;
    order: string;
    archived: boolean;
    createdAt: number;
}

export interface TemplateItem {
    templateId: string;
    text: string;
    order: string;
}

export interface Section {
    id: string;
    templateId: string | null;
    /** Fallback for when the template is deleted. */
    name: string;
}

export interface Group {
    id: string;
    /** `null` for the default group. */
    name: string | null;
    sections: Section[];
}

export interface Checklist {
    name: string;
    order: string;
    archived: boolean;
    createdAt: number;
    groups: Group[];
}

export type ItemState = 'open' | 'done' | 'skipped';

export interface ChecklistItem {
    checklistId: string;
    sectionId: string;
    /** `null` for local items, which sync never touches. */
    templateItemId: string | null;
    text: string;
    order: string;
    state: ItemState;
}

export type WithId<T> = T & { id: string };

export interface Data {
    folders: WithId<Folder>[];
    templates: WithId<Template>[];
    templateItems: WithId<TemplateItem>[];
    checklists: WithId<Checklist>[];
    checklistItems: WithId<ChecklistItem>[];
}

export type Collection = keyof Data;

export const DEFAULT_GROUP = 'default';
export const EXTRAS = 'extras';

import { readFileSync } from 'node:fs';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestContext,
    RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';

const allowed = 'me@example.com';
const valid = {
    folders: { name: 'Travel', order: 'a0' },
    templates: { name: 'Toiletries', folderId: null, order: 'a0', archived: false, createdAt: 1 },
    templateItems: { templateId: 't1', text: 'Toothbrush', order: 'a0' },
    checklists: {
        name: 'Trip',
        order: 'a0',
        archived: false,
        createdAt: 1,
        groups: [{ id: 'default', name: null, sections: [] }],
    },
    checklistItems: {
        checklistId: 'c1',
        sectionId: 's1',
        templateItemId: null,
        text: 'Toothbrush',
        order: 'a0',
        state: 'open',
    },
};
const collections = Object.keys(valid) as (keyof typeof valid)[];

let env: RulesTestEnvironment;

beforeAll(async () => {
    // Expected denials are otherwise logged as errors.
    setLogLevel('silent');
    env = await initializeTestEnvironment({
        projectId: 'demo-checklist',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'allowlist', allowed), {});
        for (const name of collections) await setDoc(doc(db, name, 'existing'), valid[name]);
    });
});

const as = (email: string, verified = true): ReturnType<RulesTestContext['firestore']> =>
    env.authenticatedContext(email, { email, email_verified: verified }).firestore();

describe('allowlisted user', () => {
    test.each(collections)('can read, write, and delete %s', async (name) => {
        const db = as(allowed);
        await assertSucceeds(getDocs(collection(db, name)));
        await assertSucceeds(setDoc(doc(db, name, 'new'), valid[name]));
        await assertSucceeds(updateDoc(doc(db, name, 'existing'), { order: 'a1' }));
        await assertSucceeds(deleteDoc(doc(db, name, 'existing')));
    });

    test('matches the allowlist case-insensitively', async () => {
        await assertSucceeds(getDoc(doc(as('Me@Example.com'), 'templates', 'existing')));
    });

    test.each(collections)('cannot write %s with extra or missing fields', async (name) => {
        const db = as(allowed);
        await assertFails(setDoc(doc(db, name, 'new'), { ...valid[name], extra: true }));
        const missing: Record<string, unknown> = { ...valid[name] };
        delete missing.order;
        await assertFails(setDoc(doc(db, name, 'new'), missing));
    });

    test('cannot write invalid values', async () => {
        const db = as(allowed);
        await assertFails(setDoc(doc(db, 'folders', 'new'), { ...valid.folders, name: '' }));
        await assertFails(setDoc(doc(db, 'templates', 'new'), { ...valid.templates, archived: 'no' }));
        await assertFails(setDoc(doc(db, 'templateItems', 'new'), { ...valid.templateItems, text: 'x'.repeat(1001) }));
        await assertFails(setDoc(doc(db, 'checklists', 'new'), { ...valid.checklists, groups: [] }));
        await assertFails(setDoc(doc(db, 'checklistItems', 'new'), { ...valid.checklistItems, state: 'maybe' }));
        await assertFails(updateDoc(doc(db, 'checklistItems', 'existing'), { templateItemId: 5 }));
    });

    test('cannot access the allowlist or unknown collections', async () => {
        const db = as(allowed);
        await assertFails(getDoc(doc(db, 'allowlist', allowed)));
        await assertFails(setDoc(doc(db, 'allowlist', 'friend@example.com'), {}));
        await assertFails(setDoc(doc(db, 'lists', 'old'), { name: 'Old' }));
    });
});

describe('everyone else', () => {
    test('signed-out users are denied', async () => {
        const db = env.unauthenticatedContext().firestore();
        for (const name of collections) {
            await assertFails(getDoc(doc(db, name, 'existing')));
            await assertFails(setDoc(doc(db, name, 'new'), valid[name]));
        }
    });

    test('users not on the allowlist are denied', async () => {
        const db = as('stranger@example.com');
        for (const name of collections) {
            await assertFails(getDoc(doc(db, name, 'existing')));
            await assertFails(setDoc(doc(db, name, 'new'), valid[name]));
            await assertFails(deleteDoc(doc(db, name, 'existing')));
        }
    });

    test('allowlisted emails must be verified', async () => {
        await assertFails(getDoc(doc(as(allowed, false), 'templates', 'existing')));
    });
});

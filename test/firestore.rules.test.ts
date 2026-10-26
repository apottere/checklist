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
const list = { name: 'Groceries', createdAt: 1 };
const item = { listId: 'l1', text: 'Milk', done: false, createdAt: 1 };

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
        await setDoc(doc(db, 'lists', 'l1'), list);
        await setDoc(doc(db, 'items', 'i1'), item);
    });
});

const as = (email: string, verified = true): ReturnType<RulesTestContext['firestore']> =>
    env.authenticatedContext(email, { email, email_verified: verified }).firestore();

describe('allowlisted user', () => {
    test('can read, write, and delete lists and items', async () => {
        const db = as(allowed);
        await assertSucceeds(getDocs(collection(db, 'lists')));
        await assertSucceeds(getDocs(collection(db, 'items')));
        await assertSucceeds(setDoc(doc(db, 'lists', 'l2'), list));
        await assertSucceeds(updateDoc(doc(db, 'lists', 'l1'), { name: 'Renamed' }));
        await assertSucceeds(setDoc(doc(db, 'items', 'i2'), item));
        await assertSucceeds(updateDoc(doc(db, 'items', 'i1'), { done: true }));
        await assertSucceeds(deleteDoc(doc(db, 'items', 'i1')));
        await assertSucceeds(deleteDoc(doc(db, 'lists', 'l1')));
    });

    test('matches the allowlist case-insensitively', async () => {
        await assertSucceeds(getDoc(doc(as('Me@Example.com'), 'lists', 'l1')));
    });

    test('cannot write malformed documents', async () => {
        const db = as(allowed);
        await assertFails(setDoc(doc(db, 'lists', 'l2'), { ...list, extra: true }));
        await assertFails(setDoc(doc(db, 'lists', 'l2'), { ...list, name: '' }));
        await assertFails(setDoc(doc(db, 'lists', 'l2'), { name: 'No timestamp' }));
        await assertFails(setDoc(doc(db, 'items', 'i2'), { ...item, done: 'yes' }));
        await assertFails(setDoc(doc(db, 'items', 'i2'), { ...item, text: 'x'.repeat(1001) }));
        await assertFails(updateDoc(doc(db, 'items', 'i1'), { createdAt: 'now' }));
    });

    test('cannot access the allowlist', async () => {
        const db = as(allowed);
        await assertFails(getDoc(doc(db, 'allowlist', allowed)));
        await assertFails(setDoc(doc(db, 'allowlist', 'friend@example.com'), {}));
    });
});

describe('everyone else', () => {
    test('signed-out users are denied', async () => {
        const db = env.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, 'lists', 'l1')));
        await assertFails(setDoc(doc(db, 'lists', 'l2'), list));
    });

    test('users not on the allowlist are denied', async () => {
        const db = as('stranger@example.com');
        await assertFails(getDoc(doc(db, 'lists', 'l1')));
        await assertFails(getDoc(doc(db, 'items', 'i1')));
        await assertFails(setDoc(doc(db, 'lists', 'l2'), list));
        await assertFails(deleteDoc(doc(db, 'lists', 'l1')));
    });

    test('allowlisted emails must be verified', async () => {
        await assertFails(getDoc(doc(as(allowed, false), 'lists', 'l1')));
    });
});

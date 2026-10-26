// Makes the allowlist collection match $ALLOWLIST (emails separated by commas or whitespace).
// Logs only counts, since Actions logs are public on public repos.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const emails = new Set(
    (process.env.ALLOWLIST ?? '')
        .split(/[\s,]+/)
        .map((email) => email.toLowerCase())
        .filter(Boolean)
);
// A missing secret would otherwise revoke everyone.
if (emails.size === 0) {
    console.error('ALLOWLIST is empty');
    process.exit(1);
}

initializeApp();
const db = getFirestore();
const allowlist = db.collection('allowlist');
const existing = new Set((await allowlist.listDocuments()).map((doc) => doc.id));

const batch = db.batch();
const added = [...emails].filter((email) => !existing.has(email));
const removed = [...existing].filter((email) => !emails.has(email));
for (const email of added) batch.set(allowlist.doc(email), {});
for (const email of removed) batch.delete(allowlist.doc(email));
await batch.commit();

console.log(`Allowlist has ${emails.size} emails: ${added.length} added, ${removed.length} removed`);

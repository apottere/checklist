import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase.ts';
import { inverse, Op } from '@/lib/plan.ts';
import { showSnackbar } from '@/lib/snackbar.ts';

const BATCH_LIMIT = 500;

/**
 * Writes are fire-and-forget: they apply to the cache immediately, but the promise waits for the server, which hangs
 * offline. Batches are atomic up to Firestore's limit; larger changes are split.
 */
export function commit(ops: Op[]): void {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + BATCH_LIMIT)) {
            const ref = doc(db, op.collection, op.id);
            if (op.kind === 'set') batch.set(ref, op.data);
            else if (op.kind === 'update') batch.update(ref, op.data);
            else batch.delete(ref);
        }
        batch.commit().catch((error: Error) => {
            console.error('Write failed', error);
            showSnackbar({ message: `Couldn't save: ${error.message}` });
        });
    }
}

export function commitWithUndo(ops: Op[], message: string): void {
    if (ops.length === 0) return;
    commit(ops);
    showSnackbar({ message, action: { label: 'Undo', run: () => commit(inverse(ops)) } });
}

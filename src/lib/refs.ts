import { ref, Database, DatabaseReference } from 'firebase/database';

export function createRef(db: Database, ...args: string[]): DatabaseReference {
    return ref(db, '/app/' + args.join('/'));
}

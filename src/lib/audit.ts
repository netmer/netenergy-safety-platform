import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'payment';

export type AuditLogEntry = {
    id?: string;
    collectionName: string;
    documentId: string;
    action: AuditAction;
    before?: Record<string, any>;
    after?: Record<string, any>;
    performedBy: string;
    performedByRole?: string;
    note?: string;
    timestamp?: any;
};

/**
 * Writes an audit log entry to the 'auditLog' collection.
 * Fire-and-forget: does not throw — call without await to avoid blocking.
 */
export async function writeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
        await addDoc(collection(db, 'auditLog'), {
            ...entry,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        // Audit log failure should never break the main operation
        console.warn('[AuditLog] Failed to write entry:', error);
    }
}

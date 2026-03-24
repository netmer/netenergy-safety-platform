import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { AuditLogEntry } from '@/lib/audit';
import AuditClientPage from './audit-client-page';

async function getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
        const snap = await getDocs(query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(100)));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
    } catch {
        return [];
    }
}

export default async function AuditLogPage() {
    const logs = await getAuditLogs();
    return <AuditClientPage logs={logs} />;
}

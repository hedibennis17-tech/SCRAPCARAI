'use client';
import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { Loader2, CheckCircle, Database } from 'lucide-react';

export default function MigratePage() {
  const { firestore } = useFirebase();
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [log, setLog]         = useState<string[]>([]);

  const push = (msg: string) => setLog(prev => [...prev, msg]);

  const runMigration = async () => {
    if (!firestore) { push('❌ Firestore not ready'); return; }
    setRunning(true); setDone(false); setLog([]);
    push('📖 Lecture de assessments…');
    const snap = await getDocs(collection(firestore, 'assessments'));
    push(`${snap.docs.length} soumission(s) trouvée(s).`);
    let migrated = 0, skipped = 0, errors = 0;

    for (const docSnap of snap.docs) {
      const a = docSnap.data() as any;
      const v = a.vehicle;
      if (!v) { push(`⚠️ ${docSnap.id}: pas de véhicule — ignoré`); skipped++; continue; }
      const rawVin = (v.vin ?? '').toString().trim();
      const vehicleId = rawVin.length > 0
        ? rawVin.replace(/[^a-zA-Z0-9_-]/g, '_')
        : docSnap.id;
      if (!vehicleId) { skipped++; continue; }
      try {
        await setDoc(doc(firestore, 'vehicles', vehicleId), {
          assessmentId:  docSnap.id,
          year:          v.year ?? null, make: v.make ?? null, model: v.model ?? null,
          trim:          v.trim ?? null, vin: v.vin ?? null, mileage: v.mileage ?? null,
          licensePlate:  v.licensePlate ?? null, transmission: v.transmission ?? null,
          vehicleType:   v.vehicleType ?? null,
          clientName:    a.client?.name ?? null, clientEmail: a.client?.email ?? null,
          clientPhone:   a.client?.phone ?? null,
          offeredPrice:  a.valuation?.finalPrice ?? null,
          finalPrice:    a.valuation?.finalPrice ?? null,
          purchaseOrder: a.summary?.purchaseOrder ?? null,
          deliveryOrder: a.summary?.deliveryOrder ?? null,
          missingParts:  a.condition?.missingParts ?? [],
          photoUrls:     (a.condition?.photos ?? []).filter((p: string) => p && !p.startsWith('data:')),
          condition:     a.condition ?? null,
          createdAt:     a.createdAt ?? new Date(),
        }, { merge: true });
        push(`✅ ${v.year ?? ''} ${v.make ?? ''} ${v.model ?? ''} | ${a.client?.name ?? '—'} | $${a.valuation?.finalPrice ?? '?'}`);
        migrated++;
      } catch (e: any) {
        push(`❌ ${docSnap.id}: ${e?.message}`); errors++;
      }
    }
    push('');
    push(`🏁 Terminé — ${migrated} migrés, ${skipped} ignorés, ${errors} erreurs`);
    setRunning(false); setDone(true);
  };

  return (
    <div className="admin-card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Database style={{ color: 'var(--t-primary)', width: 22, height: 22 }} />
          <h2 className="admin-card-title">Migration — Véhicules</h2>
        </div>
        <p className="admin-card-desc">
          Copie toutes les soumissions de <code>assessments</code> vers <code>vehicles</code>.
          Idempotent — peut être relancé plusieurs fois sans risque.
        </p>
      </div>
      <div style={{ padding: '20px 28px' }}>
        <button onClick={runMigration} disabled={running} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
          background: running ? 'rgba(255,255,255,0.05)' : 'var(--t-primary)',
          color: 'white', border: 'none', borderRadius: 10,
          fontWeight: 600, fontSize: '0.88rem', cursor: running ? 'not-allowed' : 'pointer', marginBottom: 20,
        }}>
          {running ? <><Loader2 style={{ width: 16, height: 16 }} /> Migration en cours…</>
                   : done ? <><CheckCircle style={{ width: 16, height: 16 }} /> Relancer</>
                          : <><Database style={{ width: 16, height: 16 }} /> Lancer la migration</>}
        </button>
        {log.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '14px 18px', maxHeight: 400, overflowY: 'auto',
            fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7,
          }}>
            {log.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith('✅') ? '#4ade80' : line.startsWith('❌') ? '#f87171'
                     : line.startsWith('⚠️') ? '#facc15' : line.startsWith('🏁') ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: line.startsWith('🏁') ? 700 : 400,
              }}>{line || '\u00A0'}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

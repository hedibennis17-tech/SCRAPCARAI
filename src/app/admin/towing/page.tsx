'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';

const STATUS_OPTIONS = [
  { value: 'scheduled',  label: 'Planifié',    cls: 'primary'  },
  { value: 'in_transit', label: 'En route',    cls: 'warning'  },
  { value: 'completed',  label: 'Complété',    cls: 'success'  },
  { value: 'cancelled',  label: 'Annulé',      cls: 'danger'   },
];

export default function AdminTowingPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const q = firestore ? query(collection(firestore, 'towing_dispatches'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const dispatches = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return dispatches;
    const s = search.toLowerCase();
    return dispatches.filter(d =>
      d.clientName?.toLowerCase().includes(s) ||
      d.vehicleName?.toLowerCase().includes(s) ||
      d.purchaseOrder?.toLowerCase().includes(s)
    );
  }, [dispatches, search]);

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'towing_dispatches', id), { status, updatedAt: new Date() });
  };

  const getStatusInfo = (val: string) => STATUS_OPTIONS.find(s => s.value === val) ?? { label: val, cls: 'warning' };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Remorquage & Dispatch</h2>
          <p className="admin-card-desc">Gestion des opérations de remorquage</p>
        </div>
        <div className="admin-search-wrap">
          <Search className="admin-search-icon" />
          <input type="search" placeholder="Rechercher…" className="admin-search-input"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className="admin-table-loading"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--t-primary)' }} /><span>Chargement…</span></div>}
      {error && <p className="admin-error">{error.message}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th>
                <th className="hidden sm:table-cell">Véhicule</th>
                <th className="hidden md:table-cell">Adresse</th>
                <th className="hidden md:table-cell">Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((d: any) => {
                const si = getStatusInfo(d.status);
                return (
                  <tr key={d.id} className="admin-table-row">
                    <td>
                      <div className="admin-table-name">{d.clientName || '—'}</div>
                      <div className="admin-table-sub">{d.clientPhone || '—'}</div>
                      {d.purchaseOrder && <div className="admin-table-sub">PO: {d.purchaseOrder}</div>}
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="admin-table-name" style={{ fontSize: '0.8rem' }}>{d.vehicleName || '—'}</div>
                      <div className="admin-table-sub">{d.parkingLocation || ''}</div>
                    </td>
                    <td className="hidden md:table-cell admin-table-sub">{d.pickupAddress || '—'}</td>
                    <td className="hidden md:table-cell admin-table-sub">
                      {d.pickupDate ? new Date(d.pickupDate).toLocaleDateString('fr-CA') : '—'}
                      {d.pickupTimeSlot && <div>{d.pickupTimeSlot}</div>}
                    </td>
                    <td>
                      <select
                        className="admin-status-select"
                        value={d.status || 'scheduled'}
                        onChange={e => updateStatus(d.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="admin-table-empty">Aucune dispatch trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

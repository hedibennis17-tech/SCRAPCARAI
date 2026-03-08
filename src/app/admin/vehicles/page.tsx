'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';

const STATUS_OPTIONS = [
  { value: 'pending_pickup', label: 'En attente' },
  { value: 'picked_up',      label: 'Ramassé'    },
  { value: 'at_yard',        label: 'Au yard'    },
  { value: 'processed',      label: 'Traité'     },
  { value: 'sold',           label: 'Vendu'      },
];

const PARTS = ['Catalyst', 'Engine', 'Transmission', 'Battery', 'Wheels'];

export default function AdminVehiclesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const q = firestore ? query(collection(firestore, 'vehicles'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const vehicles = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const s = search.toLowerCase();
    return vehicles.filter(v =>
      v.make?.toLowerCase().includes(s) ||
      v.model?.toLowerCase().includes(s) ||
      v.clientName?.toLowerCase().includes(s)
    );
  }, [vehicles, search]);

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'vehicles', id), { status, updatedAt: new Date() });
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Inventaire Véhicules</h2>
          <p className="admin-card-desc">Suivi des véhicules en cours de traitement</p>
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
                <th>Véhicule</th>
                <th className="hidden sm:table-cell">Client</th>
                <th className="hidden md:table-cell">Pièces</th>
                <th>Offre</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((v: any) => {
                const missing: string[] = v.missingParts ?? [];
                return (
                  <tr key={v.id} className="admin-table-row">
                    <td>
                      <div className="admin-table-name">{v.year} {v.make} {v.model}</div>
                      <div className="admin-table-sub">{v.vin || '—'}</div>
                      <div className="admin-table-sub">{v.mileage ? `${Number(v.mileage).toLocaleString('fr-CA')} km` : ''}</div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="admin-table-name" style={{ fontSize: '0.8rem' }}>{v.clientName || '—'}</div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {PARTS.map(p => (
                          <span key={p} className={`admin-badge ${missing.includes(p) ? 'danger' : 'success'}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="admin-table-price">{v.offeredPrice ? `$${Number(v.offeredPrice).toFixed(0)}` : '—'}</td>
                    <td>
                      <select className="admin-status-select" value={v.status || 'pending_pickup'}
                        onChange={e => updateStatus(v.id, e.target.value)}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="admin-table-empty">Aucun véhicule trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

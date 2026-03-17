'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, MapPin } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { AdminPagination, paginate, type PageSize } from '@/components/admin/admin-pagination';

const STATUS_OPTIONS = [
  { value: 'scheduled',  label: 'Planifié', cls: 'primary'  },
  { value: 'in_transit', label: 'En route', cls: 'warning'  },
  { value: 'completed',  label: 'Complété', cls: 'success'  },
  { value: 'cancelled',  label: 'Annulé',   cls: 'danger'   },
];

function parseDate(val: any): number {
  if (!val) return 0;
  if (val?.seconds) return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(val: any): string {
  const ms = parseDate(val);
  return ms > 0 ? new Date(ms).toLocaleDateString('fr-CA') : '—';
}

export default function AdminTowingPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const q = firestore ? query(collection(firestore, 'towing_dispatches'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const dispatches = useMemo(() => {
    if (!snap) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => parseDate(b.createdAt) - parseDate(a.createdAt)) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return dispatches;
    const s = search.toLowerCase();
    return dispatches.filter((d: any) =>
      d.clientName?.toLowerCase().includes(s) ||
      d.vehicleSummary?.toLowerCase().includes(s) ||
      d.purchaseOrder?.toLowerCase().includes(s) ||
      d.pickupAddress?.toLowerCase().includes(s)
    );
  }, [dispatches, search]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const paged = paginate(filtered, page, pageSize);

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'towing_dispatches', id), { status, updatedAt: new Date() });
  };

  const getStatusInfo = (val: string) => STATUS_OPTIONS.find(s => s.value === val) ?? { label: val || 'Planifié', cls: 'warning' };

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
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className="admin-table-loading"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--t-primary)' }} /><span>Chargement…</span></div>}
      {error && <p className="admin-error">{error.message}</p>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="hidden sm:table-cell">Véhicule</th>
                  <th className="hidden md:table-cell">Adresse & Distance</th>
                  <th>Date de ramassage</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paged.length > 0 ? paged.map((d: any) => {
                  const si = getStatusInfo(d.status);
                  return (
                    <tr key={d.id} className="admin-table-row">
                      <td>
                        <div className="admin-table-name">{d.clientName || '—'}</div>
                        <div className="admin-table-sub">{d.clientPhone || ''}</div>
                        <div className="admin-table-sub" style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--t-primary)', opacity: 0.8 }}>
                          {d.purchaseOrder || ''}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{d.vehicleSummary || '—'}</div>
                        <div className="admin-table-sub">{d.parkingLocation || ''}</div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{d.pickupAddress || '—'}</div>
                        {d.towingDistance && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: 'color-mix(in srgb, var(--t-primary) 15%, transparent)', borderRadius: 20, padding: '2px 8px' }}>
                            <MapPin style={{ width: 10, height: 10, color: 'var(--t-primary)' }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--t-primary)', fontWeight: 600 }}>{d.towingDistance}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                          {formatDate(d.pickupDate)}
                        </div>
                        <div className="admin-table-sub">{d.pickupTimeSlot || ''}</div>
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
                  <tr><td colSpan={5} className="admin-table-empty">Aucune opération trouvée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            total={filtered.length} page={page} pageSize={pageSize}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}

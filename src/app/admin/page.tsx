'use client';

import React, { useMemo, useState } from 'react';
import type { Assessment } from '@/types';
import { Loader2, Search, TrendingUp, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { AdminPagination, paginate, type PageSize } from '@/components/admin/admin-pagination';

function StatCard({ label, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={accent ? { background: `color-mix(in srgb, var(--t-primary) 15%, transparent)`, color: 'var(--t-primary)' } : {}}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="admin-stat-body">
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-value">{value}</p>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

function parseDate(val: any): number {
  if (!val) return 0;
  if (val?.seconds) return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const q = firestore ? query(collection(firestore, 'assessments'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const all = useMemo(() => {
    if (!snap) return [] as Assessment[];
    return snap.docs
      .map(d => ({ ...d.data(), id: d.id })) as Assessment[];
  }, [snap]);

  // Sort by createdAt desc (most recent first)
  const sorted = useMemo(() =>
    [...all].sort((a, b) => parseDate((b as any).createdAt) - parseDate((a as any).createdAt)),
    [all]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const s = search.toLowerCase();
    return sorted.filter(a =>
      a.client?.name?.toLowerCase().includes(s) ||
      a.client?.email?.toLowerCase().includes(s) ||
      a.vehicle?.make?.toLowerCase().includes(s) ||
      a.vehicle?.model?.toLowerCase().includes(s)
    );
  }, [sorted, search]);

  // Reset page on search change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const paged = paginate(filtered, page, pageSize);

  // Stats
  const totalValeur = all.reduce((sum, a) => sum + (a.valuation?.finalPrice ?? 0), 0);
  const thisWeek = all.filter(a => {
    const ms = parseDate((a as any).createdAt);
    return ms > 0 && Date.now() - ms < 7 * 24 * 3600 * 1000;
  }).length;
  const acceptes = all.filter(a => !!a.summary?.purchaseOrder).length;

  return (
    <div className="admin-dashboard">
      <div className="admin-stats-grid">
        <StatCard label="Total soumissions" value={all.length} sub="Toutes périodes" icon={TrendingUp} accent />
        <StatCard label="Valeur totale" value={`$${totalValeur.toLocaleString('fr-CA', { minimumFractionDigits: 0 })}`} sub="Offres acceptées" icon={DollarSign} accent />
        <StatCard label="Cette semaine" value={thisWeek} sub="Nouvelles soumissions" icon={Clock} accent />
        <StatCard label="Acceptées" value={acceptes} sub={`sur ${all.length} soumissions`} icon={CheckCircle} accent />
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Dernières soumissions</h2>
            <p className="admin-card-desc">Liste des évaluations de véhicules reçues</p>
          </div>
          <div className="admin-search-wrap">
            <Search className="admin-search-icon" />
            <input type="search" placeholder="Rechercher client, véhicule…" className="admin-search-input"
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
                    <th>Offre</th>
                    <th className="hidden md:table-cell">Soumission</th>
                    <th className="hidden md:table-cell">Ramassage</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length > 0 ? paged.map(a => (
                    <tr key={a.id} className="admin-table-row">
                      <td>
                        <div className="admin-table-name">{a.client?.name || '—'}</div>
                        <div className="admin-table-sub">{a.client?.email || '—'}</div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                          {a.vehicle?.make} {a.vehicle?.model}
                        </div>
                        <div className="admin-table-sub">{a.vehicle?.year}</div>
                      </td>
                      <td className="admin-table-price">
                        {(() => {
                          const price = a.valuation?.finalPrice ?? (a.valuation as any)?.finalOffer;
                          return price ? `$${Number(price).toFixed(0)}` : '—';
                        })()}
                      </td>
                      <td className="hidden md:table-cell admin-table-sub">
                        {parseDate((a as any).createdAt) > 0
                          ? new Date(parseDate((a as any).createdAt)).toLocaleDateString('fr-CA')
                          : '—'}
                      </td>
                      <td className="hidden md:table-cell admin-table-sub">
                        {(() => {
                          const ms = parseDate((a.towing as any)?.pickupDate);
                          return ms > 0 ? new Date(ms).toLocaleDateString('fr-CA') : '—';
                        })()}
                      </td>
                      <td>
                        <span className={`admin-badge ${a.summary?.purchaseOrder ? 'success' : 'warning'}`}>
                          {a.summary?.purchaseOrder ? 'Accepté' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="admin-table-empty">
                      {search ? `Aucun résultat pour "${search}"` : 'Aucune soumission.'}
                    </td></tr>
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
    </div>
  );
}

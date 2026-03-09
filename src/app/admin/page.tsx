'use client';

import React, { useMemo, useState } from 'react';
import type { Assessment } from '@/types';
import { Loader2, Search, TrendingUp, Car, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';

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

export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const q = firestore ? query(collection(firestore, 'assessments'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const all = useMemo(() => {
    if (!snap) return [] as Assessment[];
    return snap.docs.map(d => ({ ...d.data(), id: d.id })) as Assessment[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return all;
    const s = search.toLowerCase();
    return all.filter(a =>
      a.client?.name?.toLowerCase().includes(s) ||
      a.client?.email?.toLowerCase().includes(s) ||
      a.vehicle?.make?.toLowerCase().includes(s) ||
      a.vehicle?.model?.toLowerCase().includes(s)
    );
  }, [all, search]);

  // Stats
  const totalValeur = all.reduce((sum, a) => sum + (a.valuation?.finalPrice ?? 0), 0);
  const thisWeek = all.filter(a => {
    if (!a.createdAt?.seconds) return false;
    const d = new Date(a.createdAt.seconds * 1000);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 3600 * 1000;
  }).length;
  const acceptes = all.filter(a => !!a.summary?.purchaseOrder).length;

  return (
    <div className="admin-dashboard">

      {/* Stats */}
      <div className="admin-stats-grid">
        <StatCard label="Total soumissions" value={all.length} sub="Toutes périodes" icon={TrendingUp} accent />
        <StatCard label="Valeur totale" value={`$${totalValeur.toLocaleString('fr-CA', { minimumFractionDigits: 0 })}`} sub="Offres acceptées" icon={DollarSign} accent />
        <StatCard label="Cette semaine" value={thisWeek} sub="Nouvelles soumissions" icon={Clock} accent />
        <StatCard label="Acceptées" value={acceptes} sub={`sur ${all.length} soumissions`} icon={CheckCircle} accent />
      </div>

      {/* Table card */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Dernières soumissions</h2>
            <p className="admin-card-desc">Liste des évaluations de véhicules reçues</p>
          </div>
          <div className="admin-search-wrap">
            <Search className="admin-search-icon" />
            <input
              type="search"
              placeholder="Rechercher client, véhicule…"
              className="admin-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="admin-table-loading">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--t-primary)' }} />
            <span>Chargement…</span>
          </div>
        )}
        {error && <p className="admin-error">{error.message}</p>}

        {!loading && !error && (
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
                {filtered.length > 0 ? filtered.map(a => (
                  <tr key={a.id} className="admin-table-row">
                    <td>
                      <div className="admin-table-name">{a.client?.name || '—'}</div>
                      <div className="admin-table-sub">{a.client?.email || '—'}</div>
                    </td>
                    <td className="hidden sm:table-cell">
                      {a.vehicle?.make} {a.vehicle?.model}
                      <div className="admin-table-sub">{a.vehicle?.year}</div>
                    </td>
                    <td className="admin-table-price">
                      {(() => {
                        const price = a.valuation?.finalPrice ?? (a.valuation as any)?.finalOffer;
                        return price ? `$${Number(price).toFixed(0)}` : '—';
                      })()}
                    </td>
                    <td className="hidden md:table-cell admin-table-sub">
                      {a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleDateString('fr-CA') : '—'}
                    </td>
                    <td className="hidden md:table-cell admin-table-sub">
                      {(() => {
                        const pd = (a.towing as any)?.pickupDate;
                        if (!pd) return '—';
                        if (pd?.seconds) return new Date(pd.seconds * 1000).toLocaleDateString('fr-CA');
                        const d = new Date(pd);
                        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-CA');
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
        )}
      </div>
    </div>
  );
}

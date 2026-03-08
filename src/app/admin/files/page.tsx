'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, Download, FileText } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminFilesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const q = firestore ? query(collection(firestore, 'transactions'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const transactions = useMemo(() => {
    if (!snap) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(t =>
      t.clientName?.toLowerCase().includes(s) ||
      t.purchaseOrder?.toLowerCase().includes(s) ||
      t.vehicleMake?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const downloadPdf = async (t: any, type: 'PO' | 'DO') => {
    const key = `${t.id}-${type}`;
    setGenerating(key);
    try {
      const doc = new jsPDF();
      const orderNumber = type === 'PO' ? t.purchaseOrder : t.deliveryOrder;

      doc.setFillColor(192, 48, 63);
      doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SCRAP CAR AI', 14, 11);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${type} — ${orderNumber ?? 'N/A'}`, 14, 20);
      doc.text(new Date().toLocaleDateString('fr-CA'), 196, 20, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 32,
        head: [['Informations client', '']],
        body: [
          ['Nom',       t.clientName  ?? 'N/A'],
          ['Email',     t.clientEmail ?? 'N/A'],
          ['Téléphone', t.clientPhone ?? 'N/A'],
        ],
        headStyles: { fillColor: [30, 30, 45], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
        styles: { fontSize: 9 },
      });
      autoTable(doc, {
        head: [['Véhicule', '']],
        body: [
          ['Véhicule', `${t.vehicleYear ?? ''} ${t.vehicleMake ?? ''} ${t.vehicleModel ?? ''}`],
          ['NIV',      t.vehicleVin   ?? 'N/A'],
          ['Km',       t.vehicleMileage ? `${Number(t.vehicleMileage).toLocaleString('fr-CA')} km` : 'N/A'],
        ],
        headStyles: { fillColor: [192, 48, 63], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
        styles: { fontSize: 9 },
      });
      autoTable(doc, {
        head: [['Références', '']],
        body: [
          ['PO', t.purchaseOrder ?? 'N/A'],
          ['DO', t.deliveryOrder ?? 'N/A'],
          ['Offre', t.finalPrice ? `$${Number(t.finalPrice).toFixed(2)}` : 'N/A'],
        ],
        headStyles: { fillColor: [5, 100, 70], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
        styles: { fontSize: 9 },
      });

      doc.save(`${type}_${orderNumber ?? 'document'}.pdf`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Dossiers (PO / DO)</h2>
          <p className="admin-card-desc">Bons de commande et de livraison</p>
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
                <th>Références</th>
                <th className="hidden md:table-cell">Offre</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((t: any) => (
                <tr key={t.id} className="admin-table-row">
                  <td>
                    <div className="admin-table-name">{t.clientName || '—'}</div>
                    <div className="admin-table-sub">{t.clientEmail || '—'}</div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                      {t.vehicleYear} {t.vehicleMake} {t.vehicleModel}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--t-primary)' }}>
                      {t.purchaseOrder || '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {t.deliveryOrder || ''}
                    </div>
                  </td>
                  <td className="hidden md:table-cell admin-table-price">
                    {t.finalPrice ? `$${Number(t.finalPrice).toFixed(0)}` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['PO', 'DO'].map(type => {
                        const key = `${t.id}-${type}`;
                        return (
                          <button key={type}
                            onClick={() => downloadPdf(t, type as 'PO' | 'DO')}
                            disabled={generating === key}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '7px',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {generating === key
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Download className="w-3 h-3" />
                            }
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="admin-table-empty">Aucun dossier trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

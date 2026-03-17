'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Loader2, Search, Images, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, updateDoc, doc, getDoc } from 'firebase/firestore';
import { AdminPagination, paginate, type PageSize } from '@/components/admin/admin-pagination';

const STATUS_OPTIONS = [
  { value: 'pending_pickup', label: 'En attente' },
  { value: 'picked_up',      label: 'Ramassé'    },
  { value: 'at_yard',        label: 'Au yard'    },
  { value: 'processed',      label: 'Traité'     },
  { value: 'sold',           label: 'Vendu'      },
];

const PARTS = ['Catalyst', 'Engine', 'Transmission', 'Battery', 'Wheels'];

function PhotoModal({ vehicle, firestore, onClose }: { vehicle: any; firestore: any; onClose: () => void }) {
  const [photos, setPhotos] = useState<string[]>(vehicle.photoUrls ?? []);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [current, setCurrent] = useState(0);

  // If no photos in vehicle doc, try fetching from assessments collection
  useEffect(() => {
    const storedPhotos: string[] = vehicle.photoUrls ?? [];
    const hasRealPhotos = storedPhotos.some((p: string) => p && p.startsWith('http'));
    if (!hasRealPhotos && vehicle.assessmentId && firestore) {
      setFetchingPhotos(true);
      getDoc(doc(firestore, 'assessments', vehicle.assessmentId))
        .then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            const assessmentPhotos: string[] = (data?.condition?.photos ?? [])
              .filter((p: string) => p && p.startsWith('http'));
            if (assessmentPhotos.length > 0) setPhotos(assessmentPhotos);
          }
        })
        .catch(() => { /* silent */ })
        .finally(() => setFetchingPhotos(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prev = useCallback(() => setCurrent(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && photos.length > 1) prev();
      if (e.key === 'ArrowRight' && photos.length > 1) next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next, photos.length]);

  // Reset current index when photos list changes
  useEffect(() => { setCurrent(0); }, [photos]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--saas-card, #1a1a2e)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16, width: '100%', maxWidth: 820,
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera style={{ width: 18, height: 18, color: 'var(--t-primary)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'rgba(255,255,255,0.92)' }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                {photos.length} photo{photos.length !== 1 ? 's' : ''} &bull; {vehicle.clientName ?? '—'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8,
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
          }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {photos.length === 0 ? (
          <div style={{
            height: 360, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)', gap: 12,
          }}>
            {fetchingPhotos
              ? <><Loader2 style={{ width: 36, height: 36, opacity: 0.5 }} className="animate-spin" /><span style={{ fontSize: '0.88rem' }}>Chargement des photos…</span></>
              : <><Camera style={{ width: 48, height: 48, opacity: 0.3 }} /><span style={{ fontSize: '0.88rem' }}>Aucune photo disponible pour ce véhicule</span></>
            }
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', background: '#000', height: 380 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[current]} alt={`Photo ${current + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              <div style={{
                position: 'absolute', bottom: 12, right: 14,
                background: 'rgba(0,0,0,0.65)', borderRadius: 20,
                padding: '3px 10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500,
              }}>
                {current + 1} / {photos.length}
              </div>
              {photos.length > 1 && (
                <>
                  <button onClick={prev} style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white',
                  }}><ChevronLeft style={{ width: 20, height: 20 }} /></button>
                  <button onClick={next} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white',
                  }}><ChevronRight style={{ width: 20, height: 20 }} /></button>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div style={{
                display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto',
                borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)',
              }}>
                {photos.map((url, i) => (
                  <button key={i} onClick={() => setCurrent(i)} style={{
                    flexShrink: 0, width: 72, height: 54, borderRadius: 7, overflow: 'hidden',
                    border: i === current ? '2px solid var(--t-primary)' : '2px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', background: '#000', padding: 0,
                    opacity: i === current ? 1 : 0.55, transition: 'opacity 0.15s, border-color 0.15s',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Thumb ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminVehiclesPage() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');
  const [photoVehicle, setPhotoVehicle] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const q = firestore ? query(collection(firestore, 'vehicles'), orderBy('createdAt', 'desc')) : null;
  const [snap, loading, error] = useCollection(q);

  const vehicles = useMemo(() => {
    if (!snap) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)) as any[];
  }, [snap]);

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const s = search.toLowerCase();
    return vehicles.filter((v: any) =>
      v.make?.toLowerCase().includes(s) ||
      v.model?.toLowerCase().includes(s) ||
      v.clientName?.toLowerCase().includes(s)
    );
  }, [vehicles, search]);

  const paged = paginate(filtered, page, pageSize);
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const updateStatus = async (id: string, status: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'vehicles', id), { status, updatedAt: new Date() });
  };

  return (
    <>
      {photoVehicle && <PhotoModal vehicle={photoVehicle} firestore={firestore} onClose={() => setPhotoVehicle(null)} />}

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Inventaire Véhicules</h2>
            <p className="admin-card-desc">Suivi des véhicules en cours de traitement</p>
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
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th className="hidden sm:table-cell">Client</th>
                  <th className="hidden md:table-cell">Pièces</th>
                  <th>Offre</th>
                  <th>Photos</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? paged.map((v: any) => {
                  const missing: string[] = v.missingParts ?? [];
                  const photoCount: number = (v.photoUrls ?? []).length;
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

                      {/* Photos button */}
                      <td>
                        <button
                          onClick={() => setPhotoVehicle(v)}
                          title={photoCount > 0 ? `Voir ${photoCount} photo(s)` : 'Aucune photo'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px',
                            background: photoCount > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${photoCount > 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 8,
                            color: photoCount > 0 ? 'var(--t-primary)' : 'rgba(255,255,255,0.25)',
                            fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          <Images style={{ width: 13, height: 13 }} />
                          {photoCount > 0 ? photoCount : '0'}
                        </button>
                      </td>

                      <td>
                        <select className="admin-status-select" value={v.status || 'pending_pickup'}
                          onChange={e => updateStatus(v.id, e.target.value)}>
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="admin-table-empty">Aucun véhicule trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            total={filtered.length} page={page} pageSize={pageSize}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </>
  );
}

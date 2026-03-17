'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

interface AdminPaginationProps {
  total: number;
  page: number;
  pageSize: PageSize;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
}

export function AdminPagination({ total, page, pageSize, onPage, onPageSize }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      flexWrap: 'wrap', gap: 10,
    }}>
      {/* Left: count + page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          {total === 0 ? '0 résultat' : `${from}–${to} sur ${total}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Par page :</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {PAGE_SIZE_OPTIONS.map(s => (
              <button key={s} onClick={() => { onPageSize(s); onPage(1); }}
                style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer',
                  border: `1px solid ${s === pageSize ? 'var(--t-primary)' : 'rgba(255,255,255,0.1)'}`,
                  background: s === pageSize ? 'color-mix(in srgb, var(--t-primary) 20%, transparent)' : 'rgba(255,255,255,0.04)',
                  color: s === pageSize ? 'var(--t-primary)' : 'rgba(255,255,255,0.5)',
                  fontWeight: s === pageSize ? 700 : 400,
                  transition: 'all 0.15s',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: page nav */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => onPage(1)} disabled={page === 1}
            style={navBtn(page === 1)}>«</button>
          <button onClick={() => onPage(page - 1)} disabled={page === 1}
            style={navBtn(page === 1)}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>

          {/* Page numbers */}
          {pageNumbers(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} style={{ padding: '3px 6px', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>…</span>
            ) : (
              <button key={n} onClick={() => onPage(n as number)}
                style={{
                  padding: '3px 9px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                  border: `1px solid ${n === page ? 'var(--t-primary)' : 'rgba(255,255,255,0.1)'}`,
                  background: n === page ? 'color-mix(in srgb, var(--t-primary) 20%, transparent)' : 'rgba(255,255,255,0.04)',
                  color: n === page ? 'var(--t-primary)' : 'rgba(255,255,255,0.5)',
                  fontWeight: n === page ? 700 : 400,
                  minWidth: 32,
                }}>
                {n}
              </button>
            )
          )}

          <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
            style={navBtn(page === totalPages)}>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
            style={navBtn(page === totalPages)}>»</button>
        </div>
      )}
    </div>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3px 7px', borderRadius: 6, fontSize: '0.75rem',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
    cursor: disabled ? 'default' : 'pointer',
    minWidth: 28,
  };
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}

/** Slice a sorted array for the current page */
export function paginate<T>(arr: T[], page: number, pageSize: number): T[] {
  return arr.slice((page - 1) * pageSize, page * pageSize);
}

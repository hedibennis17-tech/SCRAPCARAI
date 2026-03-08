'use client';

import { useEffect, useState } from 'react';

const themes = [
  { id: 'red',     label: 'Ruby',   bg: 'linear-gradient(135deg,#c0303f,#7a1020)' },
  { id: 'blue',    label: 'Ocean',  bg: 'linear-gradient(135deg,#2563eb,#1e3a8a)' },
  { id: 'emerald', label: 'Forest', bg: 'linear-gradient(135deg,#059669,#064e3b)' },
  { id: 'violet',  label: 'Violet', bg: 'linear-gradient(135deg,#7c3aed,#3b0764)' },
  { id: 'amber',   label: 'Amber',  bg: 'linear-gradient(135deg,#d97706,#78350f)' },
  { id: 'rose',    label: 'Rose',   bg: 'linear-gradient(135deg,#e11d78,#831843)' },
];

export function AdminThemeSwitcher() {
  const [active, setActive] = useState('red');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('scrapcar-theme') || 'red';
    setActive(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const apply = (id: string) => {
    setActive(id);
    setOpen(false);
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('scrapcar-theme', id);
  };

  const current = themes.find(t => t.id === active)!;

  return (
    <div className="admin-theme-wrap">
      <button className="admin-theme-trigger" onClick={() => setOpen(o => !o)}>
        <span className="admin-theme-dot" style={{ background: current.bg }} />
        <span className="admin-theme-label">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="admin-theme-panel">
          <p className="admin-theme-panel-title">Thème</p>
          <div className="admin-theme-grid">
            {themes.map(t => (
              <button key={t.id} className={`admin-theme-swatch ${active === t.id ? 'selected' : ''}`} onClick={() => apply(t.id)}>
                <span className="admin-theme-swatch-dot" style={{ background: t.bg }} />
                <span>{t.label}</span>
                {active === t.id && (
                  <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const themes = [
  {
    id: 'red',
    label: 'Ruby',
    color: '#c0303f',
    bg: 'linear-gradient(135deg,#c0303f,#7a1020)',
  },
  {
    id: 'blue',
    label: 'Ocean',
    color: '#2563eb',
    bg: 'linear-gradient(135deg,#2563eb,#1e3a8a)',
  },
  {
    id: 'emerald',
    label: 'Forest',
    color: '#059669',
    bg: 'linear-gradient(135deg,#059669,#064e3b)',
  },
  {
    id: 'violet',
    label: 'Violet',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg,#7c3aed,#3b0764)',
  },
  {
    id: 'amber',
    label: 'Amber',
    color: '#d97706',
    bg: 'linear-gradient(135deg,#d97706,#78350f)',
  },
  {
    id: 'rose',
    label: 'Rose',
    color: '#e11d78',
    bg: 'linear-gradient(135deg,#e11d78,#831843)',
  },
];

export function ThemeSwitcher() {
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
    <div className="theme-switcher-wrap">
      {/* Trigger pill */}
      <button
        className="theme-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Changer le thème de couleur"
        title="Thème"
      >
        <span
          className="theme-dot-active"
          style={{ background: current.bg }}
        />
        <span className="theme-trigger-label">{current.label}</span>
        <svg
          className={`theme-chevron ${open ? 'open' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Palette panel */}
      {open && (
        <div className="theme-panel">
          <p className="theme-panel-title">Couleur du thème</p>
          <div className="theme-grid">
            {themes.map(t => (
              <button
                key={t.id}
                className={`theme-swatch ${active === t.id ? 'selected' : ''}`}
                onClick={() => apply(t.id)}
                title={t.label}
              >
                <span
                  className="theme-swatch-dot"
                  style={{ background: t.bg }}
                />
                <span className="theme-swatch-label">{t.label}</span>
                {active === t.id && (
                  <svg className="theme-check" width="12" height="12" viewBox="0 0 12 12" fill="none">
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

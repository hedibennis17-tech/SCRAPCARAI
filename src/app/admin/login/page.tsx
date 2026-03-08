'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { auth, isUserLoading, user } = useFirebase();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    // Apply saved theme
    const saved = localStorage.getItem('scrapcar-theme') || 'red';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    if (!isUserLoading && user) router.push('/admin');
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);
      router.push('/admin');
    } catch (err: any) {
      const map: Record<string, string> = {
        'auth/invalid-email':       'Adresse courriel invalide.',
        'auth/user-not-found':      'Aucun compte associé à cet email.',
        'auth/wrong-password':      'Mot de passe incorrect.',
        'auth/invalid-credential':  'Identifiants invalides.',
        'auth/too-many-requests':   'Trop de tentatives. Réessayez dans quelques instants.',
      };
      setError(map[err.code] ?? 'Échec de connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root">
      {/* Ambient orbs */}
      <div className="admin-orb admin-orb-1" />
      <div className="admin-orb admin-orb-2" />

      <div className="admin-login-card">
        {/* Logo */}
        <div className="admin-login-logo">
          <img src="/logo.gif" alt="SCRAP CAR AI" className="w-20 h-20 object-contain" />
        </div>
        <h1 className="admin-login-title">Administration</h1>
        <p className="admin-login-subtitle">Connectez-vous à votre tableau de bord</p>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="admin-login-field">
            <label className="admin-login-label">Courriel</label>
            <div className="admin-login-input-wrap">
              <Mail className="admin-login-input-icon" />
              <input
                type="email"
                className="admin-login-input"
                placeholder="admin@scrapcarai.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="admin-login-field">
            <label className="admin-login-label">Mot de passe</label>
            <div className="admin-login-input-wrap">
              <Lock className="admin-login-input-icon" />
              <input
                type="password"
                className="admin-login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="admin-login-error">{error}</p>}

          <button type="submit" className="admin-login-btn" disabled={loading || isUserLoading}>
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>

        <p className="admin-login-footer">
          SCRAP CAR AI — Portail administrateur
        </p>
      </div>
    </div>
  );
}

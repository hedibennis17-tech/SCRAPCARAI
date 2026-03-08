'use client';

import { SideNav } from "@/components/admin/sidenav";
import { MobileBottomNav } from "@/components/admin/mobilenav";
import { usePathname, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { useEffect, useState } from "react";
import { Loader2, Bell, Search } from 'lucide-react';
import { AdminThemeSwitcher } from "@/components/admin/admin-theme-switcher";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, auth } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, isUserLoading, router, pathname]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (isUserLoading || !user) {
    return (
      <div className="admin-loading-screen">
        <img src="/logo.gif" alt="Chargement" className="w-20 h-20 object-contain mb-4" />
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--t-primary)' }} />
      </div>
    );
  }

  const handleLogout = async () => {
    if (auth) { await auth.signOut(); router.push('/admin/login'); }
  };

  // Page title from pathname
  const pageTitles: Record<string, string> = {
    '/admin':                    'Tableau de bord',
    '/admin/files':              'Dossiers',
    '/admin/vehicles':           'Véhicules',
    '/admin/towing':             'Remorquage & Dispatch',
    '/admin/reports':            'Rapports',
    '/admin/management/users':   'Utilisateurs',
    '/admin/management/yards':   'Yards',
  };
  const pageTitle = pageTitles[pathname] ?? 'Administration';

  return (
    <div className="admin-root">
      {/* Ambient orbs */}
      <div className="admin-orb admin-orb-1" />
      <div className="admin-orb admin-orb-2" />

      {/* Sidebar — desktop */}
      <SideNav />

      {/* Main */}
      <div className="admin-main">
        {/* Top header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title">{pageTitle}</h1>
          </div>
          <div className="admin-topbar-right">
            <AdminThemeSwitcher />
            <button className="admin-icon-btn" title="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <button className="admin-avatar-btn" onClick={handleLogout} title="Déconnexion">
              <img
                src={user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

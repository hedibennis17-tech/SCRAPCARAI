'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Car, Truck, BarChart3,
  FolderOpen, Settings, Warehouse, UserCog, LogOut, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

export const mainNavItems = [
  { href: '/admin',          label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/files',    label: 'Dossiers',         icon: FolderOpen },
  { href: '/admin/vehicles', label: 'Véhicules',        icon: Car },
  { href: '/admin/towing',   label: 'Remorquage',       icon: Truck },
  { href: '/admin/reports',  label: 'Rapports',         icon: BarChart3 },
];

export const secondaryNavItems = [
  { href: '/admin/management/users', label: 'Utilisateurs', icon: UserCog },
  { href: '/admin/management/yards', label: 'Yards',        icon: Warehouse },
];

export function SideNav() {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const handleLogout = async () => {
    if (auth) { await auth.signOut(); router.push('/admin/login'); }
  };

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <Link href="/admin" className="admin-sidebar-logo">
        <img src="/logo.gif" alt="SCRAP CAR AI" className="w-9 h-9 object-contain" />
        <span className="admin-sidebar-brand">SCRAP CAR AI</span>
      </Link>

      {/* Nav principale */}
      <div className="admin-sidebar-section-label">Navigation</div>
      <nav className="admin-sidebar-nav">
        {mainNavItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={cn('admin-nav-item', isActive(item.href) && 'active')}>
            <item.icon className="admin-nav-icon" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Gestion */}
      <div className="admin-sidebar-section-label" style={{ marginTop: '16px' }}>Gestion</div>
      <nav className="admin-sidebar-nav">
        {secondaryNavItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={cn('admin-nav-item', isActive(item.href) && 'active')}>
            <item.icon className="admin-nav-icon" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Déconnexion */}
      <div className="admin-sidebar-footer">
        <button className="admin-nav-item logout-btn" onClick={handleLogout}>
          <LogOut className="admin-nav-icon" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

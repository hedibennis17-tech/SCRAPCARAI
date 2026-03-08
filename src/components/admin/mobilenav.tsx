'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, Car, Truck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNav = [
  { href: '/admin',          label: 'Tableau',   icon: LayoutDashboard },
  { href: '/admin/files',    label: 'Dossiers',  icon: FolderOpen },
  { href: '/admin/vehicles', label: 'Véhicules', icon: Car },
  { href: '/admin/towing',   label: 'Remorquage',icon: Truck },
  { href: '/admin/reports',  label: 'Rapports',  icon: BarChart3 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <nav className="admin-mobile-bottom-nav">
      {mobileNav.map((item) => (
        <Link key={item.href} href={item.href}
          className={cn('admin-mobile-tab', isActive(item.href) && 'active')}>
          <item.icon className="admin-mobile-tab-icon" />
          <span className="admin-mobile-tab-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// Kept for backward compat (Sheet usage)
export function MobileNav() {
  return <MobileBottomNav />;
}

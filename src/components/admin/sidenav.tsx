
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Car,
  ShoppingCart,
  Truck,
  Settings,
  Warehouse,
  BarChart,
  UserCog,
  LogOut,
  Folder,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Logo } from '../ui/logo';
import { Button } from '../ui/button';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

export const mainNavItems = [
    { href: '/admin', label: 'Tableau de bord', icon: Home },
    { href: '/admin/clients', label: 'Clients', icon: Users },
    { href: '/admin/purchases', label: 'Achats', icon: ShoppingCart },
    { href: '/admin/vehicles', label: 'Véhicules', icon: Car },
    { href: '/admin/towing', label: 'Towing & Dispatch', icon: Truck },
    { href: '/admin/reports', label: 'Rapports', icon: BarChart },
];

export const subNavItems = [
    {
        label: 'Dossiers',
        icon: Folder,
        subItems: [
            { href: '/admin/orders', label: 'PO/DO', icon: FileText },
        ]
    },
    {
        label: 'Gestion',
        icon: Settings,
        subItems: [
            { href: '/admin/management/users', label: 'Utilisateurs', icon: UserCog },
            { href: '/admin/management/yards', label: 'Yards', icon: Warehouse },
        ]
    },
]

export function SideNav() {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/admin/login');
    }
  };

  const isLinkActive = (href?: string) => href && pathname === href;
  const isAccordionActive = (subItems: { href: string }[]) => subItems.some(sub => pathname.startsWith(sub.href));

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center justify-center border-b px-6">
            <Link href="/admin" className="flex items-center justify-center">
                <Logo size="small" />
            </Link>
        </div>
        <div className='flex flex-col flex-1 overflow-y-auto'>
            <nav className="flex-1 gap-1 p-4">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                            isLinkActive(item.href) && "bg-muted text-primary"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                ))}
                 <Accordion type="multiple" className="w-full" defaultValue={subNavItems.filter(item => isAccordionActive(item.subItems)).map(item => item.label)}>
                    {subNavItems.map((item) => (
                        <AccordionItem value={item.label} key={item.label} className="border-b-0">
                            <AccordionTrigger className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                                isAccordionActive(item.subItems) && "text-primary"
                            )}>
                                 <item.icon className="h-4 w-4" />
                                {item.label}
                            </AccordionTrigger>
                            <AccordionContent className="pl-8">
                                {item.subItems.map(subItem => (
                                    <Link
                                        key={subItem.label}
                                        href={subItem.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                            isLinkActive(subItem.href) && "text-primary"
                                        )}
                                    >
                                        <subItem.icon className="h-4 w-4" />
                                        {subItem.label}
                                    </Link>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </nav>
        </div>
        <div className="mt-auto border-t p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
        </div>
    </aside>
  );
}

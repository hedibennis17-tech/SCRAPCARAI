
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Logo } from '../ui/logo';
import { mainNavItems, subNavItems } from './sidenav';

export function MobileNav() {
  const pathname = usePathname();
  const isLinkActive = (href?: string) => href && pathname === href;
  const isAccordionActive = (subItems: { href: string }[]) => subItems.some(sub => pathname.startsWith(sub.href));

  return (
    <>
      <Link href="/admin" className="group flex items-center gap-2 text-lg font-semibold mb-4">
        <Logo size="small" />
      </Link>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid gap-2 text-lg font-medium">
          {mainNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                isLinkActive(item.href) && "bg-muted text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <Accordion type="multiple" className="w-full" defaultValue={subNavItems.filter(item => isAccordionActive(item.subItems)).map(item => item.label)}>
            {subNavItems.map((item) => (
              <AccordionItem value={item.label} key={item.label} className="border-b-0">
                <AccordionTrigger className={cn(
                  "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:no-underline",
                  isAccordionActive(item.subItems) && "text-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </AccordionTrigger>
                <AccordionContent className="pl-11">
                  {item.subItems.map(subItem => (
                    <Link
                      key={subItem.label}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                        isLinkActive(subItem.href) && "text-foreground"
                      )}
                    >
                       <subItem.icon className="h-5 w-5" />
                      {subItem.label}
                    </Link>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </nav>
      </div>
    </>
  );
}

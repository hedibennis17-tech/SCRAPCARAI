import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string; size?: 'default' | 'small' | 'large' | 'xl' }) {
  const sizes = {
    small: "w-12 h-12",
    default: "w-36 h-36",
    large: "w-48 h-48",
    xl: "w-56 h-56"
  }
  const sizeClass = sizes[size] || sizes['default'];
  
  return (
    <div className={cn("relative", className, sizeClass)}>
      <Image
        src="https://i.imgur.com/o01zhgz.png"
        alt="CarScrap Wizard AI Logo"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority
        className="object-contain"
      />
    </div>
  );
}

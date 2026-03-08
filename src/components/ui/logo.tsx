import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string; size?: 'default' | 'small' | 'large' | 'xl' }) {
  const sizes = {
    small:   { w: 72,  h: 72  },
    default: { w: 180, h: 180 },
    large:   { w: 240, h: 240 },
    xl:      { w: 280, h: 280 },
  };
  const { w, h } = sizes[size] ?? sizes.default;

  return (
    <div className={cn('relative flex-shrink-0', className)} style={{ width: w, height: h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.gif"
        alt="SCRAP CAR AI"
        width={w}
        height={h}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

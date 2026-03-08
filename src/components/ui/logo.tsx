import { cn } from '@/lib/utils';

export function Logo({ className, size = 'default' }: { className?: string; size?: 'default' | 'small' | 'large' | 'xl' }) {
  const sizes = {
    small:   { w: 44,  h: 44  },
    default: { w: 140, h: 140 },
    large:   { w: 192, h: 192 },
    xl:      { w: 224, h: 224 },
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

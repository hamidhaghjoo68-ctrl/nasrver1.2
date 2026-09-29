import { useEffect, useState } from 'react';
import { faNum } from '../lib/storage';
import { cn } from '../utils/cn';

export type LampState = 'first' | 'retry';

// چراغ تأیید: با پاسخ درست، مثل چراغ تیر برق یکدفعه روشن می‌شود
export function Lamp({ on, state = 'first', size = 34, animate = false }: { on: boolean; state?: LampState; size?: number; animate?: boolean }) {
  const gold = state === 'first';
  const glow = gold ? '#fbbf24' : '#34d399';
  const bulb = on ? (gold ? '#fde68a' : '#6ee7b7') : '#475569';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size * 1.35 }}>
      {on && (
        <span
          className={cn('pointer-events-none absolute rounded-full blur-md', animate && 'animate-lamp-on')}
          style={{ width: size * 1.1, height: size * 1.1, top: -size * 0.1, background: glow, opacity: 0.45 }}
        />
      )}
      <svg viewBox="0 0 40 54" width={size} height={size * 1.35} aria-hidden="true" className="relative">
        {on && (
          <path d="M20 20 L36 50 L4 50 Z" fill={glow} opacity={0.22} className={animate ? 'animate-lamp-on' : undefined} />
        )}
        <rect x="18.4" y="19" width="3.2" height="32" rx="1.6" fill={on ? '#94a3b8' : '#64748b'} />
        <rect x="12" y="49" width="16" height="3.4" rx="1.7" fill={on ? '#94a3b8' : '#64748b'} />
        <path d="M9 18 L20 4 L31 18 Z" fill={on ? '#cbd5e1' : '#52627a'} />
        <circle
          cx="20"
          cy="16"
          r="5.6"
          fill={bulb}
          className={cn(on && animate && 'animate-lamp-on')}
          style={on ? { filter: `drop-shadow(0 0 ${size / 4}px ${glow})` } : undefined}
        />
        {on && (
          <g stroke={glow} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" className={animate ? 'animate-lamp-on' : undefined}>
            <line x1="20" y1="2" x2="20" y2="5.5" />
            <line x1="7.5" y1="9" x2="10.2" y2="11" />
            <line x1="32.5" y1="9" x2="29.8" y2="11" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ردیف چراغ‌ها: برای هر پرسش یک چراغ
export function LampBoard({ total, lamps, kids }: { total: number; lamps: Record<number, LampState>; kids?: boolean }) {
  const lit = Object.keys(lamps).length;
  const size = total > 6 ? 24 : total > 4 ? 28 : 32;
  return (
    <div
      className={cn('flex items-center gap-2 rounded-2xl border px-3 py-2', kids ? 'border-amber-200 bg-amber-50' : 'border-amber-300/20 bg-amber-300/[0.05]')}
      role="status"
      aria-label={`چراغ‌های تأیید: ${faNum(lit)} از ${faNum(total)} روشن`}
    >
      <div className="flex flex-1 flex-wrap items-end justify-center gap-1">
        {Array.from({ length: total }, (_, k) => (
          <Lamp key={k} on={k in lamps} state={lamps[k]} size={size} animate={k in lamps} />
        ))}
      </div>
      <div className={cn('shrink-0 text-center text-[10px] font-black leading-4', kids ? 'text-amber-700' : 'text-amber-200')}>
        چراغ تأیید
        <div className="text-sm">
          {faNum(lit)}/{faNum(total)}
        </div>
      </div>
    </div>
  );
}

// درخشش کوتاه صفحه در لحظهٔ روشن شدن چراغ
export function LightFlash({ trigger, state = 'first' }: { trigger: number; state?: LampState }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(timer);
  }, [trigger]);
  if (!visible) return null;
  return (
    <div
      key={trigger}
      className="pointer-events-none fixed inset-0 z-[65] animate-flash"
      style={{ background: `radial-gradient(circle at 50% 30%, ${state === 'first' ? '#fcd34d' : '#6ee7b7'}55 0%, transparent 60%)` }}
      aria-hidden="true"
    />
  );
}

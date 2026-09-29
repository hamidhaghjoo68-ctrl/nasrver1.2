import { useCallback, useEffect, useState } from 'react';
import { Crown, RefreshCw, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { useSite } from '../lib/SiteContext';
import { faNum, type Profile } from '../lib/storage';
import { SCORE_LABELS, SCORE_WEIGHTS, scoreOf, type LeaderboardEntry, type ScoreParts } from '../lib/score';
import { getLeaderboard, setCompetition } from '../lib/service';
import { cn } from '../utils/cn';
import { Lamp } from './Lamp';
import { Btn } from './ui';

type Filter = 'all' | 'adult' | 'kids';

export function Competition({ profile, kids, onProfileChange }: { profile: Profile; kids: boolean; onProfileChange: (p: Profile) => void }) {
  const { content, mode } = useSite();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [scope, setScope] = useState<'server' | 'device'>('device');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState(profile.displayName || profile.name);
  // روی سرور، نمایش نام برای دیگران نیاز به انتخاب صریح دارد؛ در حالت محلی چیزی بیرون نمی‌رود
  const competing = mode === 'server' ? profile.competing === true : profile.competing !== false;
  const enabled = content.settings.competitionEnabled !== false;

  const load = useCallback(async () => {
    try {
      const result = await getLeaderboard(profile);
      setEntries(result.entries);
      setScope(result.scope);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [enabled, load]);

  const mine = scoreOf(profile);
  const visible = entries.filter(e => filter === 'all' || e.track === filter);
  const myRank = visible.findIndex(e => e.id === profile.id) + 1;
  const podium = visible.slice(0, 3);
  const muted = kids ? 'text-slate-500' : 'text-slate-400';
  const card = kids ? 'bg-white/90 border-sky-200 shadow-sm' : 'bg-white/[0.04] border-white/10';

  const toggleCompeting = async (next: boolean) => {
    setBusy(true); setError('');
    try {
      onProfileChange(await setCompetition(profile, next, alias));
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (!enabled) {
    return (
      <div className={cn('mx-4 mt-6 rounded-3xl border p-8 text-center', card)}>
        <Trophy size={34} className="mx-auto mb-3 opacity-60" />
        <div className="font-black">بخش رقابت فعلاً غیرفعال است</div>
        <p className={cn('mt-2 text-xs leading-6', muted)}>مدیر دانشگاه می‌تواند این بخش را از تنظیمات روشن کند.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      {/* کارت جایگاه من */}
      <div className={cn('relative overflow-hidden rounded-3xl border p-4', card)}>
        <div className="absolute -left-6 -top-6 opacity-20"><Lamp on size={78} /></div>
        <div className="flex items-center gap-3">
          <div className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-black', kids ? 'bg-orange-100 text-orange-600' : 'bg-amber-300/15 text-amber-300')}>
            {myRank > 0 ? faNum(myRank) : '—'}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('text-[11px]', muted)}>جایگاه شما در جدول</div>
            <div className="truncate text-lg font-black">{profile.displayName || profile.name}</div>
            <div className={cn('text-[11px]', muted)}>
              {competing ? `از میان ${faNum(visible.length)} شرکت‌کننده` : 'برای دیده‌شدن در جدول، شرکت در رقابت را روشن کنید'}
            </div>
          </div>
          <div className="shrink-0 text-center">
            <div className={cn('text-2xl font-black', kids ? 'text-orange-500' : 'text-amber-300')}>{faNum(mine.total)}</div>
            <div className={cn('text-[10px]', muted)}>امتیاز</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(mine.parts) as (keyof ScoreParts)[]).filter(k => mine.parts[k] > 0).map(k => (
            <span key={k} className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', kids ? 'bg-sky-50 text-slate-600' : 'bg-white/5 text-slate-300')}>
              {SCORE_LABELS[k]}: {faNum(mine.parts[k])} × {faNum(SCORE_WEIGHTS[k])}
            </span>
          ))}
        </div>
      </div>

      {/* شرکت در رقابت */}
      <div className={cn('rounded-3xl border p-4', card)}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-black">شرکت در رقابت</div>
            <p className={cn('mt-1 text-[11px] leading-6', muted)}>
              {mode === 'server'
                ? 'با روشن‌کردن، نام نمایشی و امتیاز شما برای بقیهٔ دانشجویان دیده می‌شود. موبایل و پیام‌های شما هرگز نمایش داده نمی‌شوند.'
                : 'در این حالت فقط حساب‌های همین دستگاه با هم مقایسه می‌شوند و چیزی برای دیگران فرستاده نمی‌شود.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={competing}
            aria-label="شرکت در رقابت"
            disabled={busy}
            onClick={() => toggleCompeting(!competing)}
            className={cn('relative h-7 w-12 shrink-0 rounded-full transition', competing ? 'bg-emerald-400' : kids ? 'bg-slate-300' : 'bg-white/15')}
          >
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', competing ? 'right-1' : 'right-6')} />
          </button>
        </div>
        {competing && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={alias}
              maxLength={40}
              onChange={e => setAlias(e.target.value)}
              placeholder="نام نمایشی در جدول"
              className={cn(
                'flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none',
                kids ? 'border-sky-200 bg-white text-slate-800' : 'border-white/10 bg-black/20 text-white placeholder:text-slate-500',
              )}
            />
            <Btn variant={kids ? 'kids' : 'gold'} disabled={busy || !alias.trim()} onClick={() => toggleCompeting(true)}>
              ذخیرهٔ نام نمایشی
            </Btn>
          </div>
        )}
      </div>

      {error && <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

      {/* فیلتر و به‌روزرسانی */}
      <div className="flex items-center gap-2">
        <div className={cn('grid flex-1 grid-cols-3 gap-1 rounded-2xl p-1', kids ? 'bg-white shadow-sm' : 'bg-white/5')}>
          {([['all', 'همه'], ['adult', 'بزرگسالان'], ['kids', 'کودکان']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn('rounded-xl py-2 text-xs font-black transition', filter === k ? (kids ? 'bg-orange-400 text-white' : 'bg-amber-300 text-slate-900') : muted)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void load()}
          className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', kids ? 'bg-white shadow' : 'bg-white/10')}
          title="به‌روزرسانی جدول"
          aria-label="به‌روزرسانی جدول"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* سکوی سه نفر برتر */}
      {podium.length >= 3 && (
        <div className={cn('rounded-3xl border p-4', card)}>
          <div className="compete-podium">
            {[podium[1], podium[0], podium[2]].map((e, place) => {
              const rank = place === 1 ? 1 : place === 0 ? 2 : 3;
              const height = rank === 1 ? 74 : rank === 2 ? 56 : 44;
              return (
                <div key={e.id}>
                  <Lamp on={rank === 1} state={rank === 1 ? 'first' : 'retry'} size={rank === 1 ? 40 : 30} />
                  <div className="truncate text-xs font-black">{e.name}</div>
                  <div className={cn('text-[10px]', muted)}>{faNum(e.score)}</div>
                  <div
                    className={cn(
                      'mt-1 grid place-items-center rounded-t-xl text-lg font-black',
                      rank === 1 ? 'bg-gradient-to-t from-amber-500/30 to-amber-300/60 text-amber-100' : 'bg-white/10',
                    )}
                    style={{ height }}
                  >
                    {rank === 1 ? <Crown size={20} /> : faNum(rank)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* جدول کامل */}
      <div className={cn('overflow-hidden rounded-3xl border', card)}>
        {visible.map((e, index) => {
          const me = e.id === profile.id;
          return (
            <div
              key={e.id}
              className={cn(
                'flex items-center gap-3 border-b px-4 py-3 last:border-b-0',
                kids ? 'border-sky-100' : 'border-white/5',
                me && (kids ? 'bg-orange-50' : 'bg-amber-300/10'),
              )}
            >
              <div className={cn('w-7 shrink-0 text-center text-sm font-black', index < 3 ? (kids ? 'text-orange-500' : 'text-amber-300') : muted)}>{faNum(index + 1)}</div>
              <Lamp on={index < 3} state={index === 0 ? 'first' : 'retry'} size={22} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {e.name} {me && <span className={cn('text-[10px]', muted)}>(شما)</span>}
                </div>
                <div className={cn('text-[10px]', muted)}>
                  {e.track === 'kids' ? 'کودکان' : 'بزرگسالان'} · {faNum(e.parts.lessons)} درس · {faNum(e.parts.stars)} ستاره · {faNum(e.parts.certs)} مدرک
                </div>
              </div>
              <div className={cn('shrink-0 text-sm font-black', kids ? 'text-slate-700' : 'text-amber-100')}>{faNum(e.score)}</div>
            </div>
          );
        })}
        {!visible.length && (
          <div className="p-8 text-center">
            <Users size={30} className={cn('mx-auto mb-3', muted)} />
            <div className="text-sm font-black">{loading ? 'در حال دریافت جدول…' : 'هنوز شرکت‌کننده‌ای در این دسته نیست'}</div>
            <p className={cn('mt-2 text-xs leading-6', muted)}>با کامل‌کردن درس‌ها و روشن‌کردن چراغ‌های تأیید، امتیاز شما بالا می‌رود.</p>
          </div>
        )}
      </div>

      <div className={cn('flex items-start gap-2 rounded-2xl p-3 text-[11px] leading-6', kids ? 'bg-sky-50 text-slate-500' : 'bg-white/[0.03] text-slate-400')}>
        {scope === 'server' ? <ShieldCheck size={16} className="mt-0.5 shrink-0" /> : <Sparkles size={16} className="mt-0.5 shrink-0" />}
        <span>
          {scope === 'server'
            ? 'جدول از روی پیشرفت ثبت‌شدهٔ هر حساب ساخته می‌شود و فقط نام نمایشی و امتیاز در آن دیده می‌شود.'
            : 'این جدول محلی است. برای رقابت واقعی میان همهٔ کاربران، سایت باید روی سرور اجرا شود.'}
        </span>
      </div>
    </div>
  );
}

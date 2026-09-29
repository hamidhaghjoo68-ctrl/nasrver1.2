import type { Profile } from './storage';

export interface ScoreParts {
  lessons: number;
  stars: number;
  travelers: number;
  certs: number;
  momentum: number;
  blessings: number;
  days: number;
}

export const SCORE_WEIGHTS: ScoreParts = {
  lessons: 100,
  stars: 20,
  travelers: 30,
  certs: 200,
  momentum: 5,
  blessings: 2,
  days: 10,
};

export const SCORE_LABELS: Record<keyof ScoreParts, string> = {
  lessons: 'درس‌های کامل‌شده',
  stars: 'ستاره‌ها',
  travelers: 'رهروان همراهی‌شده',
  certs: 'مدرک‌ها',
  momentum: 'بهترین مومنتوم',
  blessings: 'نعمت‌های شکرشده',
  days: 'روزهای کامل برنامه',
};

export function scoreParts(profile: Profile): ScoreParts {
  const progress = Object.values(profile.progress || {});
  return {
    lessons: progress.filter(p => p.done).length,
    stars: progress.reduce((sum, p) => sum + (p.stars || 0), 0),
    travelers: progress.filter(p => p.traveler).length,
    certs: Object.keys(profile.certs || {}).length,
    momentum: profile.bestMomentum || 0,
    blessings: (profile.blessings || []).length,
    days: Object.values(profile.daily || {}).filter(list => list.length >= 3).length,
  };
}

export function scoreOf(profile: Profile) {
  const parts = scoreParts(profile);
  const total = (Object.keys(parts) as (keyof ScoreParts)[]).reduce((sum, key) => sum + parts[key] * SCORE_WEIGHTS[key], 0);
  return { total, parts };
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  track: Profile['track'];
  score: number;
  parts: ScoreParts;
  updatedAt: number;
}

export function leaderboardEntry(profile: Profile): LeaderboardEntry {
  const { total, parts } = scoreOf(profile);
  return {
    id: profile.id,
    name: (profile.displayName || profile.name || '').trim().slice(0, 40) || 'دانشجو',
    track: profile.track,
    score: total,
    parts,
    updatedAt: profile.lastSeen || profile.createdAt || 0,
  };
}

export function sortLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => b.score - a.score || b.parts.lessons - a.parts.lessons || a.updatedAt - b.updatedAt);
}

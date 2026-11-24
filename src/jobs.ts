import type { User } from './session';
import type { IconName } from './icons';

// A "job" is one piece of field work. The app shows a person only the jobs their
// Khadamat OS permissions allow — never a list of modules.
//
// Fully native (Ameen, 24 Nov 2026): a job appears here only once it has its own
// app screen. Nothing opens a website page inside the app. Still to come, in this
// order: Camp Ops (office side) and Executive mode → payment request from a photo,
// petty cash, Documents → handover, RFID, waste visits, materials, arrivals, tasks.
export type Job = { key: string; label: string; sub: string; icon: IconName; color: string; modules: string[]; only?: (u: User) => boolean };

export const JOBS: Job[] = [
  { key: 'attendance', label: 'Attendance', sub: 'Mark today', icon: 'attendance', color: '#0B6B63', modules: ['attendance'] },
];

export function canOpen(u: User, j: Job): boolean {
  if (j.only) return j.only(u);
  if (u.isOwner) return true;
  const mods = new Set<string>([...(u.modules ?? []), ...Object.keys(u.access ?? {})]);
  return j.modules.some((m) => mods.has(m));
}
export function jobsFor(u: User): Job[] {
  return JOBS.filter((j) => canOpen(u, j));
}
/** Can this person see Sijil (company records)? Their expiring records sit quietly on Today. */
export function seesSijil(u: User): boolean {
  if (u.isOwner) return true;
  return new Set<string>([...(u.modules ?? []), ...Object.keys(u.access ?? {})]).has('sijil');
}

import type { User } from './session';

// A "job" is one piece of field work. The app shows a person only the jobs their
// Khadamat OS permissions allow — never a list of modules.
export type Job = {
  key: string; label: string; sub: string;
  kind: 'native' | 'web';
  /** web jobs: the site page that opens inside the app */
  path?: string;
  modules: string[];
  only?: (u: User) => boolean;
};

export const JOBS: Job[] = [
  { key: 'attendance', label: 'Attendance', sub: 'Mark today', kind: 'native', modules: ['attendance'] },
  { key: 'almabar', label: 'Al Mabar attendance', sub: 'Mark today', kind: 'web', path: '/almabar/', modules: ['almabar'] },
  { key: 'campops', label: 'Camp Ops', sub: 'Rounds, complaints, notes', kind: 'web', path: '/campops/', modules: ['campops'] },
  { key: 'handover', label: 'Room handover', sub: 'Handover, vacating, damage', kind: 'web', path: '/handover/', modules: ['handover', 'property'] },
  { key: 'rfid', label: 'RFID install', sub: 'Scan and fit bin tags', kind: 'web', path: '/rfid/', modules: ['rfid'] },
  { key: 'visits', label: 'Waste visits', sub: 'Site visits and task reports', kind: 'web', path: '/waste/', modules: ['waste'] },
  { key: 'cleaning', label: 'Cleaning materials', sub: 'Log what was used', kind: 'web', path: '/cleaning/', modules: ['cleaning'] },
  { key: 'maintenance', label: 'Maintenance materials', sub: 'Log what was used', kind: 'web', path: '/maintenance/', modules: ['maintenance'] },
  { key: 'payreq', label: 'Payment request', sub: 'Snap an invoice', kind: 'web', path: '/payreq/', modules: ['payreq'] },
  { key: 'pettycash', label: 'Petty cash', sub: 'Snap a bill', kind: 'web', path: '/pettycash/', modules: ['pettycash'] },
  { key: 'sijil', label: 'Documents', sub: 'Find and share a record', kind: 'web', path: '/sijil/', modules: ['sijil'] },
  { key: 'recruit', label: 'Arrivals', sub: 'Receive new workers', kind: 'web', path: '/recruit/', modules: ['recruit'] },
  { key: 'tasks', label: 'Tasks', sub: 'Assigned to you', kind: 'web', path: '/tasks/', modules: ['tasks'] },
  { key: 'exec', label: 'Dashboards', sub: 'View only', kind: 'web', path: '/exec/', modules: [], only: (u) => !!u.canExec },
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

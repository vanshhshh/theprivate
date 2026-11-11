import { Preferences } from '@capacitor/preferences';
import { useSyncExternalStore } from 'react';
import type { AirportOption } from '@/api/types';

/**
 * The flight-planning draft, shared by the planner, results and request screens. Persisted on the
 * device so nothing is lost when switching tabs or if the app is closed. Contact details are NOT
 * persisted (they are prefilled from the profile at submission time).
 */
export interface PlanDraft {
  tripType: 'ONE_WAY' | 'RETURN';
  from: AirportOption | null;
  to: AirportOption | null;
  date: string;
  time: string;
  returnDate: string;
  returnTime: string;
  passengers: number;
  category: string;
  requirements: string;
  petsOnBoard: boolean;
}

const EMPTY: PlanDraft = { tripType: 'ONE_WAY', from: null, to: null, date: '', time: '', returnDate: '', returnTime: '', passengers: 2, category: '', requirements: '', petsOnBoard: false };
const KEY = 'tp.plan.v1';
const RECENT = 'tp.airports.recent.v1';

let draft: PlanDraft = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

void Preferences.get({ key: KEY })
  .then(({ value }) => {
    if (!value) return;
    try {
      draft = { ...EMPTY, ...(JSON.parse(value) as Partial<PlanDraft>) };
    } catch {
      // Corrupt draft: start fresh.
    }
  })
  .catch(() => {})
  .finally(() => {
    hydrated = true;
    emit();
  });

/** False until the saved draft has been read (screens must not redirect before that). */
export function usePlanReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => hydrated,
  );
}

export function updatePlan(patch: Partial<PlanDraft>) {
  draft = { ...draft, ...patch };
  emit();
  void Preferences.set({ key: KEY, value: JSON.stringify(draft) });
}

export function resetPlan() {
  draft = { ...EMPTY, from: draft.from };
  emit();
  void Preferences.remove({ key: KEY });
}

export function usePlan(): PlanDraft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}

export async function recentAirports(): Promise<AirportOption[]> {
  const { value } = await Preferences.get({ key: RECENT });
  try {
    return value ? (JSON.parse(value) as AirportOption[]) : [];
  } catch {
    return [];
  }
}

export async function rememberAirport(a: AirportOption) {
  const list = [a, ...(await recentAirports()).filter((x) => x.id !== a.id)].slice(0, 6);
  await Preferences.set({ key: RECENT, value: JSON.stringify(list) });
}

/** Problems that stop a search or request, in plain words (the server validates again). */
export function planProblems(p: PlanDraft): string[] {
  const out: string[] = [];
  if (!p.from) out.push('Choose where you are flying from.');
  if (!p.to) out.push('Choose where you are flying to.');
  if (p.from && p.to && p.from.id === p.to.id) out.push('Departure and arrival must be different airports.');
  if (!p.date) out.push('Choose a departure date.');
  if (p.tripType === 'RETURN' && !p.returnDate) out.push('Choose a return date.');
  if (p.tripType === 'RETURN' && p.returnDate && p.date && p.returnDate < p.date) out.push('The return must be on or after the departure date.');
  if (p.passengers < 1 || p.passengers > 400) out.push('Passengers must be between 1 and 400.');
  return out;
}

/** The request body the server's rfqSchema expects. */
export function toRequestBody(p: PlanDraft, contact: { name: string; phone: string }) {
  const legs = [{ from: p.from!.id, to: p.to!.id, date: p.date, time: p.time || '' }];
  if (p.tripType === 'RETURN') legs.push({ from: p.to!.id, to: p.from!.id, date: p.returnDate, time: p.returnTime || '' });
  return {
    tripType: p.tripType,
    legs,
    passengers: p.passengers,
    category: p.category || '',
    requirements: p.requirements.trim() || undefined,
    petsOnBoard: p.petsOnBoard,
    contactName: contact.name.trim(),
    contactPhone: contact.phone.trim() || undefined,
  };
}

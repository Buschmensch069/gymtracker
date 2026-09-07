import type { UnitPreference } from '../db/types'
import { WEIGHT_DECIMALS, formatDecimal, roundTo } from './decimal'

const KG_PER_LB = 0.45359237

/**
 * Two stored kg weights closer together than this are the same weight. Five
 * grams — sized against what the *display* can distinguish, not against
 * double-precision noise, because the gap that actually bites is far wider
 * than float error.
 *
 * `weightKg` is the canonical unit but not always the entered one, so the
 * same physical weight reaches the table by more than one route: 60lb typed
 * here stores 27.2155422, while 60lb imported from a tool that rounded its kg
 * stores 27.216. Both render "60 lb" — identical on screen, 4.6e-4kg apart in
 * the row — and a bare `>` calls the second one a PR over the first. (Pure
 * float noise, ~1e-13, exists too but is the easy half of the problem.)
 *
 * Five grams clears the whole span a weight can drift over while still
 * *looking* the same (0.01lb ≈ 0.0045kg, the finest step either display unit
 * resolves) and stays an order of magnitude under the smallest increment real
 * equipment offers (a 0.25lb fractional plate is 0.113kg), so every genuine
 * micro-plate PR still registers.
 */
export const WEIGHT_EPSILON_KG = 0.005

/** True when `a` is meaningfully heavier than `b` — the comparison every PR/top-set check should use. */
export function isHeavierKg(a: number, b: number): boolean {
  return a - b > WEIGHT_EPSILON_KG
}

/** True when two stored weights represent the same weight. Never compare `weightKg` with `===`. */
export function isSameWeightKg(a: number, b: number): boolean {
  return Math.abs(a - b) <= WEIGHT_EPSILON_KG
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

/**
 * Convert a canonical kg weight to the display unit as a number, for the
 * places that need one (an input's value, a chart's y-value).
 *
 * The rounding is what keeps a lb round-trip stable — `kgToLb(lbToKg(100))`
 * is 99.99999999999999 — and it must stay at `WEIGHT_DECIMALS`, not the 1
 * decimal it used to be: 6.25kg displayed at 1dp is 6.3, which is then what
 * the next stepper tap or edit writes back. Display precision is storage
 * precision here, because the field round-trips through it.
 */
export function weightForDisplay(
  weightKg: number,
  unit: UnitPreference,
  decimals: number = WEIGHT_DECIMALS,
): number {
  return roundTo(unit === 'kg' ? weightKg : kgToLb(weightKg), decimals)
}

/** Convert a canonical kg weight to display text — "6.25", "80", never "80.00". */
export function formatWeight(
  weightKg: number,
  unit: UnitPreference,
  decimals: number = WEIGHT_DECIMALS,
): string {
  return formatDecimal(unit === 'kg' ? weightKg : kgToLb(weightKg), decimals)
}

/** Convert a value typed in the display unit back to canonical kg for storage. */
export function weightToKg(value: number, unit: UnitPreference): number {
  return unit === 'kg' ? value : lbToKg(value)
}

/**
 * Step size used by the weight stepper control, per unit.
 *
 * The stepper adds and subtracts this rather than snapping to a multiple of
 * it, so a fractional weight keeps its offset: 6.25 + 2.5 is 8.75, not 7.5.
 * That is the point for anyone on micro-plates — the fraction is the part
 * they went to trouble to set.
 */
export function weightStep(unit: UnitPreference): number {
  return unit === 'kg' ? 2.5 : 5
}

export function unitLabel(unit: UnitPreference): string {
  return unit
}

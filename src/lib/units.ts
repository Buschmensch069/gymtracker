import type { UnitPreference } from '../db/types'

const KG_PER_LB = 0.45359237

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

/** Convert a canonical kg weight to the display unit, rounded to 1 decimal place. */
export function weightForDisplay(weightKg: number, unit: UnitPreference): number {
  const value = unit === 'kg' ? weightKg : kgToLb(weightKg)
  return Math.round(value * 10) / 10
}

/** Convert a value typed in the display unit back to canonical kg for storage. */
export function weightToKg(value: number, unit: UnitPreference): number {
  return unit === 'kg' ? value : lbToKg(value)
}

/** Step size used by the weight stepper control, per unit. */
export function weightStep(unit: UnitPreference): number {
  return unit === 'kg' ? 2.5 : 5
}

export function unitLabel(unit: UnitPreference): string {
  return unit
}

/**
 * Parsing, rounding and formatting for the app's numeric text inputs.
 *
 * `type="number"` is banned app-wide (wrong iOS keypad, spinner UI), so every
 * numeric field is a text input, and this module is what turns typed text into
 * a number and back. Three things the obvious `parseFloat`/`toFixed` pair gets
 * wrong here:
 *
 * - **A comma is a decimal separator.** On a German keyboard — and on the iOS
 *   `inputMode="decimal"` keypad, which shows the *locale's* separator — the
 *   decimal key is ",". `parseFloat('6,25')` returns 6: it stops at the comma
 *   and throws the rest away silently. That is what "the weight field won't
 *   accept decimals" looked like from the outside. Both separators are
 *   accepted and normalised to "." here, in one place, so no caller has to
 *   remember.
 * - **Trailing zeros are noise.** A stored 80 should read "80", not "80.00",
 *   while 6.25 must keep both decimals. A fixed `toFixed(n)` cannot do both;
 *   rounding and then letting `String` drop what isn't needed can.
 * - **Scaled rounding is not exact.** `Math.round(6.005 * 100) / 100` gives
 *   6, because the product is 600.4999999999999 in binary — see `roundTo`.
 */

/** How many decimals a weight is shown (and stored) to. 1.25kg micro-plates and fractional cable stacks both fit inside two. */
export const WEIGHT_DECIMALS = 2

/** Turns any locale decimal separator into "." — "6,25" → "6.25". */
export function normalizeDecimalSeparator(raw: string): string {
  return raw.replace(/,/g, '.')
}

/**
 * Rounds to `decimals` places.
 *
 * The naive `Math.round(value * factor) / factor` is wrong for values whose
 * scaled product lands just under the .5 boundary in binary: 6.005 * 100 is
 * 600.4999999999999, which rounds *down* to 6.00. Re-reading the product at
 * 15 significant digits — comfortably inside a double's ~15-17 digits of
 * precision, so it can only discard representation noise — pulls it back onto
 * the intended 600.5 first.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** decimals
  return Math.round(Number((value * factor).toPrecision(15))) / factor
}

/**
 * Parses a numeric field's text, accepting either decimal separator. Returns
 * `null` for anything that isn't a complete number — an empty box, or a
 * half-typed "6." — because those mean "still typing", not "zero".
 */
export function parseDecimal(raw: string): number | null {
  const normalized = normalizeDecimalSeparator(raw.trim())
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * Strips a keystroke's worth of typed text down to what the field is allowed
 * to hold: digits, at most one separator (normalised to "."), and at most
 * `maxDecimals` digits after it. `maxDecimals: 0` gives an integer field.
 *
 * Capping the decimals *as they're typed* is what keeps the box honest — the
 * field can never show more precision than gets stored, so nothing silently
 * shifts under the caret on blur. A leading "-" is dropped rather than
 * preserved: no field using this accepts a negative (`min` is 0 everywhere).
 */
export function sanitizeDecimalInput(raw: string, maxDecimals: number): string {
  const normalized = normalizeDecimalSeparator(raw)
  let out = ''
  let decimalsSeen = -1 // -1 until a separator is accepted, then counts up

  for (const char of normalized) {
    if (char >= '0' && char <= '9') {
      if (decimalsSeen >= 0) {
        if (decimalsSeen === maxDecimals) continue
        decimalsSeen += 1
      }
      out += char
    } else if (char === '.' && decimalsSeen === -1 && maxDecimals > 0) {
      decimalsSeen = 0
      out += char
    }
  }

  return out
}

/**
 * Rounds to `maxDecimals` and renders without trailing zeros: 6.25 → "6.25",
 * 80 → "80", 6.5 → "6.5". `String` of an already-rounded number does exactly
 * this, which is why the rounding is separate from the formatting.
 */
export function formatDecimal(value: number, maxDecimals: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = roundTo(value, maxDecimals)
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

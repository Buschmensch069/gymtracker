import { PRIMARY_MUSCLES, type PrimaryMuscle } from '../db/types'

/**
 * One color per muscle group, used consistently across filter chips, routine
 * card dots, and the weekly-sets chart series.
 *
 * The 8 major hypertrophy-target groups get the dataviz skill's validated
 * dark-mode categorical hues (`node scripts/validate_palette.js` — passes
 * lightness/chroma/CVD-adjacent/contrast against this app's #0b0f14 surface).
 * That palette caps at 8 distinguishable series for simultaneous display
 * (the weekly-sets chart, which stacks whatever muscles survive its filter
 * chips) — per the skill's rule, anything past 8 folds into a muted
 * "Other" segment there rather than generating a 9th hue. See
 * CHART_MUSCLE_SERIES_ORDER for how the chart picks those 8.
 *
 * The remaining 5 groups (forearms, calves, core, cardio, fullBody) are
 * rarely tagged as a *primary* muscle in this app's seed data — they're
 * usually someone else's secondary muscle (see CLAUDE.md's tagging
 * convention) — so they get muted, desaturated tones instead of full
 * categorical hues. This is also exactly what CHART_OTHER_COLOR represents
 * when the chart folds an overflow muscle into "Other": these colors and
 * that fold target are visually consistent.
 */
export const MUSCLE_COLORS: Record<PrimaryMuscle, string> = {
  chest: '#3987e5',
  back: '#d95926',
  shoulders: '#199e70',
  quadriceps: '#c98500',
  hamstrings: '#d55181',
  glutes: '#008300',
  biceps: '#9085e9',
  triceps: '#e66767',
  forearms: '#8b93a3',
  calves: '#7d8a99',
  core: '#94897d',
  cardio: '#9a7d7d',
  fullBody: '#7d9a8f',
}

/** Muscles with a full categorical hue — the chart's stackable series before folding to "Other". */
export const CHART_MUSCLE_PRIORITY: PrimaryMuscle[] = [
  'chest',
  'back',
  'shoulders',
  'quadriceps',
  'hamstrings',
  'glutes',
  'biceps',
  'triceps',
]

export const CHART_MAX_MUSCLE_SERIES = CHART_MUSCLE_PRIORITY.length

/**
 * Rank order used to decide which muscles get their own stacked series in the
 * weekly-sets chart: the 8 validated hues first, then the muted remainder.
 *
 * The chart folds by *rank overflow*, not by priority membership — it takes
 * the first CHART_MAX_MUSCLE_SERIES muscles that survive its filter chips and
 * folds only the rest into "Other". That matters because the chips are
 * filter-IN: selecting just `core` must render exactly one series (core, in
 * its muted tone), never a lone unexplained grey "Other" bar. When nothing is
 * filtered and every muscle is present the two rules coincide, since the
 * priority 8 rank first.
 */
export const CHART_MUSCLE_SERIES_ORDER: PrimaryMuscle[] = [
  ...CHART_MUSCLE_PRIORITY,
  ...PRIMARY_MUSCLES.filter((muscle) => !CHART_MUSCLE_PRIORITY.includes(muscle)),
]

/** Color for the chart's folded "everything past the top 8" bucket. */
export const CHART_OTHER_COLOR = '#6b7280'
export const CHART_OTHER_LABEL = 'Other'

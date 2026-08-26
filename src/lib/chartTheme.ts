/**
 * Chart color constants — mirrors the CSS custom properties in index.css
 * (--color-surface-*, --color-accent). Recharts renders raw SVG fill/stroke
 * attributes, so these are duplicated as hex here rather than read from CSS
 * custom properties, for reliable cross-browser SVG rendering (iOS Safari
 * included). Keep in sync with index.css's @theme block if those change.
 */
export const CHART_ACCENT = '#22d3ee'
export const CHART_SURFACE_1 = '#131a23'
export const CHART_GRID = '#232b38'
export const CHART_AXIS_TEXT = '#64748b'
export const CHART_MUTED_TEXT = '#94a3b8'

export const CHART_TOOLTIP_STYLE = {
  background: '#1e2733',
  border: '1px solid #262f3d',
  borderRadius: 12,
  fontSize: 13,
  color: '#e8eaed',
}

export const CHART_AXIS_TICK = { fill: CHART_AXIS_TEXT, fontSize: 12 }

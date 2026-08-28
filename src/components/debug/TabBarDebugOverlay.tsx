import { useEffect, useState } from 'react'

/**
 * TEMPORARY diagnostic overlay for the tab bar's bottom strip.
 *
 * Delete this file, its import in AppShell.tsx, and the <TabBarDebugOverlay />
 * element once the numbers have been read off the device.
 *
 * Three candidate causes, and three probes that separate them:
 *
 * - `probe inline min()` sets `min(env(safe-area-inset-bottom), 6px)` as an
 *   INLINE style, bypassing the class and the cascade entirely. If this reads
 *   34px, iOS isn't clamping the min() and the CSS value itself is wrong.
 * - `probe .pb-home-indicator` applies the emitted utility class to a bare div
 *   with nothing competing. If the inline probe is 6px but this is 34px, the
 *   rule isn't reaching the element — dropped, or losing the cascade.
 * - `nav padBottom` is the real tab bar. If both probes are 6px and this is
 *   34px, something else on the nav is winning.
 *
 * `RULES ON NAV` then names every stylesheet rule that both matches the nav and
 * sets a bottom padding, in document order — later wins at equal specificity,
 * which is exactly how the original pt-safe/py-3 collision worked. And
 * `label→nav gap` vs `nav padBottom` answers whether the strip is the nav's
 * padding at all or something sitting below the icon row.
 */

interface Row {
  key: string
  value: string
  flag?: boolean
}

/** Walks @layer / @media / @supports nesting — Tailwind v4 puts utilities inside a layer. */
function collectStyleRules(list: CSSRuleList, out: CSSStyleRule[]): void {
  for (const rule of Array.from(list)) {
    if (rule instanceof CSSStyleRule) {
      out.push(rule)
    } else {
      const nested = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules
      if (nested) collectStyleRules(nested, out)
    }
  }
}

function allStyleRules(): CSSStyleRule[] {
  const out: CSSStyleRule[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) collectStyleRules(sheet.cssRules, out)
    } catch {
      // Cross-origin sheet — none of ours, skip.
    }
  }
  return out
}

function measure(): Row[] {
  const rows: Row[] = []
  const push = (key: string, value: string, flag = false) => rows.push({ key, value, flag })

  // --- probes: inline value, then the emitted class, on throwaway elements ---
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  const inlineMin = document.createElement('div')
  inlineMin.style.paddingBottom = 'min(env(safe-area-inset-bottom), 6px)'
  const inlineEnv = document.createElement('div')
  inlineEnv.style.paddingBottom = 'env(safe-area-inset-bottom)'
  const viaClass = document.createElement('div')
  viaClass.className = 'pb-home-indicator'
  host.append(inlineMin, inlineEnv, viaClass)
  document.body.append(host)
  const inlineMinPad = getComputedStyle(inlineMin).paddingBottom
  const inlineEnvPad = getComputedStyle(inlineEnv).paddingBottom
  const viaClassPad = getComputedStyle(viaClass).paddingBottom
  // Did the browser even keep the inline declaration, or reject it as invalid?
  const inlineMinKept = inlineMin.style.paddingBottom || '(REJECTED)'
  host.remove()

  push('inset bottom (env)', inlineEnvPad)
  push('probe inline min()', inlineMinPad, inlineMinPad !== '6px')
  push('  inline decl kept', inlineMinKept, inlineMinKept === '(REJECTED)')
  push('probe .pb-home-ind', viaClassPad, viaClassPad !== '6px')

  // --- the real tab bar ---
  const nav = document.querySelector('nav')
  if (!nav) {
    push('nav', 'NOT FOUND', true)
    return rows
  }
  const navCs = getComputedStyle(nav)
  const navRect = nav.getBoundingClientRect()
  push('nav h', String(Math.round(navRect.height * 100) / 100))
  push('nav padBottom', navCs.paddingBottom, navCs.paddingBottom !== '6px')
  push('nav borderBottom', navCs.borderBottomWidth)
  push('nav inline pad', nav.style.paddingBottom || '(none)')
  push('nav class', nav.className.replace(/^flex shrink-0 /, '…'))

  // --- is the strip padding at all, or something below the icon row? ---
  const link = nav.querySelector('a')
  const label = link?.querySelector('span')
  const icon = link?.querySelector('svg')
  if (link && label) {
    const linkRect = link.getBoundingClientRect()
    const labelRect = label.getBoundingClientRect()
    push('link h', String(Math.round(linkRect.height * 100) / 100))
    push('icon→label→link gaps', icon
      ? `${Math.round(labelRect.top - icon.getBoundingClientRect().bottom)}/${Math.round(linkRect.bottom - labelRect.bottom)}`
      : String(Math.round(linkRect.bottom - labelRect.bottom)))
    // The whole question: how much room sits under the last painted text,
    // and is it accounted for by the nav's own padding + border?
    const below = navRect.bottom - labelRect.bottom
    push('label→nav bottom', String(Math.round(below * 100) / 100), below > 30)
    push('link→nav bottom', String(Math.round((navRect.bottom - linkRect.bottom) * 100) / 100))
  }

  // --- cascade: every matching rule that sets a bottom padding, in order ---
  const matching: string[] = []
  let sawUtility = false
  for (const rule of allStyleRules()) {
    const pb = rule.style.paddingBottom || rule.style.getPropertyValue('padding-block')
    if (rule.selectorText === '.pb-home-indicator') sawUtility = true
    if (!pb) continue
    try {
      if (nav.matches(rule.selectorText)) matching.push(`${rule.selectorText} = ${pb}`)
    } catch {
      // Selector this browser can't parse — not one of ours.
    }
  }
  push('.pb-home-ind in CSS', sawUtility ? 'yes' : 'NO — NOT EMITTED', !sawUtility)
  matching.forEach((entry, i) => push(`RULE ON NAV ${i + 1}`, entry))
  if (matching.length === 0) push('RULES ON NAV', 'none match', true)
  if (matching.length > 1) push('  (last one wins)', `${matching.length} competing`, true)

  // --- ancestor chain ---
  let node: HTMLElement | null = nav.parentElement
  let depth = 0
  while (node && depth < 6) {
    const cs = getComputedStyle(node)
    if (cs.paddingBottom !== '0px' || cs.marginBottom !== '0px') {
      const tag = node.id ? `#${node.id}` : node.tagName.toLowerCase()
      push(`anc ${depth} ${tag}`, `pb=${cs.paddingBottom} mb=${cs.marginBottom}`, true)
    }
    node = node.parentElement
    depth += 1
  }

  // --- which build is live ---
  const cssHref = Array.from(document.styleSheets)
    .map((s) => s.href)
    .find((href) => href?.includes('/assets/'))
  push('css bundle', cssHref ? cssHref.split('/').pop()! : '(inline/dev)')

  return rows
}

export function TabBarDebugOverlay() {
  const [rows, setRows] = useState<Row[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const update = () => setRows(measure())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  if (hidden) return null

  return (
    <div
      onClick={() => setHidden(true)}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 4px)',
        left: 4,
        right: 4,
        zIndex: 100,
        maxHeight: '70vh',
        overflowY: 'auto',
        background: 'rgba(5,10,16,0.96)',
        border: '1px solid rgba(255,0,180,0.7)',
        borderRadius: 8,
        padding: '6px 8px',
        font: '10px/1.5 ui-monospace, SFMono-Regular, monospace',
        color: '#e8eaed',
      }}
    >
      <div style={{ fontWeight: 700, color: '#ff4fb8', marginBottom: 3 }}>
        TAB BAR DEBUG — tap to hide
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map(({ key, value, flag }) => (
            <tr key={key}>
              <td style={{ paddingRight: 8, color: '#94a3b8', whiteSpace: 'nowrap' }}>{key}</td>
              <td
                style={{
                  textAlign: 'right',
                  wordBreak: 'break-all',
                  color: flag ? '#ff4fb8' : '#e8eaed',
                  fontWeight: flag ? 700 : 400,
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

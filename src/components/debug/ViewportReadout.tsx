import { useEffect, useState } from 'react'

/**
 * TEMPORARY read-only viewport readout — round 5. Delete this file, its import
 * in AppShell.tsx, and the <ViewportReadout /> element when done.
 *
 * This exists because round 4's numbers were contaminated by round 4's probe.
 * That overlay forced `overflow: visible` on html/body/#root (default ON) so
 * its visual stripes wouldn't be clipped, and `window.innerHeight` read 852
 * under it against 793 without it. The whole "the ICB is 793 while the layout
 * viewport is 852" conclusion — and the html/body height change that followed —
 * rests on measurements taken in that perturbed state.
 *
 * The mistake was applying the unclip globally. `getBoundingClientRect()`
 * returns an element's FULL box regardless of any ancestor's overflow, so the
 * numbers never needed it; only seeing the stripes did. This readout therefore:
 *
 *   - injects no CSS and changes no overflow, anywhere;
 *   - adds only `position: fixed; visibility: hidden; width: 0` probes, which
 *     contribute nothing to layout and are removed in the same tick;
 *   - measures the percentage chain with a `position: absolute` probe inside
 *     body and reads its rect, which body's overflow clips visually but does
 *     not shrink numerically.
 *
 * Read `pct100 (abs in body)` against `dvh`. If they agree, the ICB and the
 * layout viewport are the same box and round 4's premise was an artifact.
 */

const MONO = '10px/1.4 ui-monospace, SFMono-Regular, monospace'

function px(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(Math.round(n * 100) / 100)
}

function measure(): [string, string, boolean?][] {
  const html = document.documentElement
  const body = document.body

  // Probes: fixed ones sit on the layout viewport; the absolute one chains off
  // the ICB. None of them affect layout, and none needs an overflow override.
  const make = (position: 'fixed' | 'absolute', height: string): number => {
    const el = document.createElement('div')
    el.style.cssText = `position:${position};top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${height}`
    body.append(el)
    const h = el.getBoundingClientRect().height
    el.remove()
    return h
  }

  const dvh = make('fixed', '100dvh')
  const lvh = make('fixed', '100lvh')
  const svh = make('fixed', '100svh')
  const vh = make('fixed', '100vh')
  const pct = make('absolute', '100%')

  const insetEl = document.createElement('div')
  insetEl.style.cssText =
    'position:fixed;visibility:hidden;width:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  body.append(insetEl)
  const insetCs = getComputedStyle(insetEl)
  const insetTop = insetCs.paddingTop
  const insetBottom = insetCs.paddingBottom
  insetEl.remove()

  const vv = window.visualViewport
  const rows: [string, string, boolean?][] = [
    ['innerHeight', px(window.innerHeight)],
    ['docEl.clientHeight', px(html.clientHeight)],
    ['body.clientHeight', px(body.clientHeight)],
    ['screen.height', px(window.screen?.height)],
    ['—', '—'],
    ['100dvh', px(dvh)],
    ['100lvh', px(lvh)],
    ['100svh', px(svh)],
    ['100vh', px(vh)],
    ['pct100 (abs in body)', px(pct), Math.abs(pct - dvh) > 1],
    ['—', '—'],
    ['computed html h', getComputedStyle(html).height],
    ['computed body h', getComputedStyle(body).height],
    ['docEl rect top', px(html.getBoundingClientRect().top), html.getBoundingClientRect().top !== 0],
    ['body rect top', px(body.getBoundingClientRect().top), body.getBoundingClientRect().top !== 0],
    ['—', '—'],
    ['vv h / offTop', `${px(vv?.height)} / ${px(vv?.offsetTop)}`, (vv?.offsetTop ?? 0) !== 0],
    ['inset top / bot', `${insetTop} / ${insetBottom}`],
    ['nav.standalone', String((navigator as Navigator & { standalone?: boolean }).standalone)],
    ['dm standalone', String(window.matchMedia('(display-mode: standalone)').matches)],
  ]
  return rows
}

export function ViewportReadout() {
  const [rows, setRows] = useState<[string, string, boolean?][]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const update = () => setRows(measure())
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
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
        width: 200,
        zIndex: 100,
        background: 'rgba(5,10,16,0.94)',
        border: '1px solid #ff00b4',
        borderRadius: 6,
        padding: '5px 7px',
        font: MONO,
        color: '#e8eaed',
      }}
    >
      <div style={{ color: '#ff4fb8', fontWeight: 700, marginBottom: 3 }}>
        READOUT — tap to hide
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map(([k, v, flag], i) => (
            <tr key={`${k}-${i}`}>
              <td style={{ color: '#94a3b8', whiteSpace: 'nowrap', paddingRight: 6 }}>{k}</td>
              <td
                style={{
                  textAlign: 'right',
                  color: flag ? '#ff4fb8' : '#e8eaed',
                  fontWeight: flag ? 700 : 400,
                }}
              >
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

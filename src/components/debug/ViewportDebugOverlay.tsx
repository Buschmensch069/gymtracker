import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from '../../lib/standalone'

/**
 * TEMPORARY diagnostic overlay for the standalone-mode bottom-spacing bug.
 *
 * Delete this file, its import in AppShell.tsx, and the <ViewportDebugOverlay />
 * element once the numbers have been read off a real device. It is deliberately
 * self-contained so removal is one file plus two lines.
 *
 * Everything here is measured, not assumed:
 * - `env(safe-area-inset-*)` and `100dvh/svh/lvh` are read off hidden probe
 *   elements, because there's no way to read a CSS env() value from JS directly.
 * - The chain from the bottom tab bar up to #root is walked and each ancestor's
 *   computed padding-bottom is printed, which is what actually answers "is
 *   pb-safe applied twice?" — an inset applied on both the nav and a wrapper
 *   would show up as two non-zero rows.
 * - `GAP BELOW TABBAR` is the money number: how many px sit between the bottom
 *   edge of the tab bar and the bottom of the layout viewport.
 * - Values are captured once at mount *and* live, so a stale measurement frozen
 *   during the launch animation shows up as a mount/now mismatch.
 */

interface Probe {
  insetTop: string
  insetRight: string
  insetBottom: string
  insetLeft: string
  dvh: number
  svh: number
  lvh: number
}

function measureProbes(): Probe {
  const host = document.createElement('div')
  // position:fixed keeps the probe out of flow so it cannot perturb the very
  // layout it is measuring. No containment: `contain:strict` implies size
  // containment, which is exactly the kind of thing that could skew a probe.
  host.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  const inset = document.createElement('div')
  inset.style.cssText =
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)'
  const dvh = document.createElement('div')
  dvh.style.height = '100dvh'
  const svh = document.createElement('div')
  svh.style.height = '100svh'
  const lvh = document.createElement('div')
  lvh.style.height = '100lvh'
  host.append(inset, dvh, svh, lvh)
  document.body.append(host)

  const cs = getComputedStyle(inset)
  const result: Probe = {
    insetTop: cs.paddingTop,
    insetRight: cs.paddingRight,
    insetBottom: cs.paddingBottom,
    insetLeft: cs.paddingLeft,
    dvh: dvh.getBoundingClientRect().height,
    svh: svh.getBoundingClientRect().height,
    lvh: lvh.getBoundingClientRect().height,
  }
  host.remove()
  return result
}

function px(n: number | undefined): string {
  return n === undefined ? '—' : `${Math.round(n * 100) / 100}`
}

function measure(): Record<string, string> {
  const vv = window.visualViewport
  const probe = measureProbes()
  const root = document.getElementById('root')
  const shell = root?.firstElementChild as HTMLElement | undefined
  const nav = document.querySelector('nav')
  const navRect = nav?.getBoundingClientRect()

  const out: Record<string, string> = {
    standalone: String(isStandaloneDisplay()),
    'nav.standalone': String(
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    ),
    'mm(display-mode)': String(window.matchMedia('(display-mode: standalone)').matches),
    'window.innerHeight': px(window.innerHeight),
    'docEl.clientHeight': px(document.documentElement.clientHeight),
    'vv.height': px(vv?.height),
    'vv.offsetTop': px(vv?.offsetTop),
    'vv.pageTop': px(vv?.pageTop),
    'vv.scale': px(vv?.scale),
    '100dvh': px(probe.dvh),
    '100svh': px(probe.svh),
    '100lvh': px(probe.lvh),
    'inset top': probe.insetTop,
    'inset right': probe.insetRight,
    'inset bottom': probe.insetBottom,
    'inset left': probe.insetLeft,
    '#root h': px(root?.getBoundingClientRect().height),
    'shell inline h': shell?.style.height || '(none)',
    'shell h': px(shell?.getBoundingClientRect().height),
    'tabbar top': px(navRect?.top),
    'tabbar bottom': px(navRect?.bottom),
    'tabbar h': px(navRect?.height),
    'tabbar padBottom': nav ? getComputedStyle(nav).paddingBottom : '—',
    'body scrollTop': px(document.body.scrollTop),
    'docEl scrollTop': px(document.documentElement.scrollTop),
  }

  // THE number: dead band between the tab bar and the bottom of the viewport.
  if (navRect) {
    out['GAP BELOW TABBAR'] = px(window.innerHeight - navRect.bottom)
    out['GAP vs dvh'] = px(probe.dvh - navRect.bottom)
  }

  // Walk tab bar -> #root printing each ancestor's bottom padding/margin. Two
  // non-zero rows here means the inset is being applied twice.
  if (nav) {
    let node: HTMLElement | null = nav as HTMLElement
    let depth = 0
    while (node && depth < 8) {
      const s = getComputedStyle(node)
      const tag = node.id ? `#${node.id}` : node.tagName.toLowerCase()
      const pb = s.paddingBottom
      const mb = s.marginBottom
      if (pb !== '0px' || mb !== '0px') {
        out[`chain ${depth} ${tag}`] = `pb=${pb} mb=${mb}`
      }
      node = node.parentElement
      depth += 1
    }
  }

  return out
}

function sameValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every((key) => a[key] === b[key])
}

interface Snapshot {
  live: Record<string, string>
  mount: Record<string, string>
}

export function ViewportDebugOverlay() {
  const [{ live, mount }, setSnapshot] = useState<Snapshot>(() => ({ live: {}, mount: {} }))
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // Measuring needs a committed layout, so it has to happen in an effect
    // rather than during render. The mount snapshot is kept alongside the live
    // one so a launch-time transient frozen into the layout shows up as a
    // mount/now mismatch instead of being invisible.
    const first = measure()
    setSnapshot({ live: first, mount: first })
    const update = () =>
      setSnapshot((prev) => {
        const next = measure()
        return sameValues(prev.live, next) ? prev : { live: next, mount: prev.mount }
      })

    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    const interval = setInterval(update, 500)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      clearInterval(interval)
    }
  }, [])

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 4px)',
          left: 4,
          zIndex: 100,
          background: 'rgba(220,40,120,0.9)',
          color: '#fff',
          font: '600 10px ui-monospace, monospace',
          padding: '3px 7px',
          borderRadius: 6,
          border: 'none',
        }}
      >
        dbg
      </button>
    )
  }

  return (
    <>
      {/* Magenta band = the actual env(safe-area-inset-bottom) region.
          Cyan hairline = the true bottom of the layout viewport.
          If the dead band under the tab bar matches the magenta band, the
          inset is the cause; if it sits below the cyan line, the viewport
          height is. */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'env(safe-area-inset-bottom)',
          background: 'rgba(255,0,180,0.45)',
          zIndex: 99,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: '#22d3ee',
          zIndex: 99,
          pointerEvents: 'none',
        }}
      />

      <div
        onClick={() => setCollapsed(true)}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 4px)',
          left: 4,
          zIndex: 100,
          maxHeight: '62vh',
          overflowY: 'auto',
          background: 'rgba(5,10,16,0.94)',
          border: '1px solid rgba(255,0,180,0.7)',
          borderRadius: 8,
          padding: '6px 8px',
          font: '10px/1.45 ui-monospace, SFMono-Regular, monospace',
          color: '#e8eaed',
          minWidth: 208,
        }}
      >
        <div style={{ fontWeight: 700, color: '#ff4fb8', marginBottom: 3 }}>
          VIEWPORT DEBUG — tap to hide
        </div>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(live).map(([key, value]) => {
              const mountValue = mount[key]
              const drifted = mountValue !== undefined && mountValue !== value
              const isGap = key.startsWith('GAP')
              return (
                <tr key={key}>
                  <td style={{ paddingRight: 8, color: isGap ? '#ff4fb8' : '#94a3b8' }}>
                    {key}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: isGap ? '#ff4fb8' : '#e8eaed',
                      fontWeight: isGap ? 700 : 400,
                    }}
                  >
                    {value}
                    {drifted && (
                      <span style={{ color: '#fbbf24' }}> (mount {mountValue})</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

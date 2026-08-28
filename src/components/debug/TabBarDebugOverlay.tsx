import { useEffect, useState } from 'react'

/**
 * TEMPORARY diagnostic overlay for the dark strip below the tab bar.
 *
 * Delete this file, its import in AppShell.tsx, and the <TabBarDebugOverlay />
 * element once the numbers have been read off the device.
 *
 * The tab bar itself is now measured correct (padding 6px, height ~67, bottom
 * edge flush with innerHeight), so the strip is not the nav's box. The question
 * this round is whether the strip is inside the layout viewport at all.
 *
 * The decisive test is visual, not numeric: html, body and #root are painted
 * three different colours, so one screenshot says which box the strip belongs
 * to. A magenta hairline is pinned at `position:fixed; bottom:0`, which is by
 * definition the bottom edge of the layout viewport — anything below that line
 * is outside it and no amount of padding or flex work inside the app can reach
 * it.
 *
 * Leading hypothesis from the numbers already collected: the previous overlay
 * reported 100dvh = innerHeight = #root height = 793 while 100lvh = 852. If the
 * visible screen really is 852 tall, then `#root { height: 100dvh }` leaves 59
 * unpainted px at the bottom showing the canvas background — which is dark, and
 * would look exactly like a reserved strip. Note the first overlay's "GAP BELOW
 * TABBAR" was computed as `innerHeight - navRect.bottom` and so was structurally
 * blind to a gap that lives *below* innerHeight; it reported 0 and I read that
 * as "no dead band". That is the measurement error that sent the last two
 * rounds after the padding.
 */

interface Row {
  key: string
  value: string
  flag?: boolean
}

/** html / body / #root each get a distinct colour so the strip can be attributed by eye. */
const PAINT = `
  html { background: #b91c1c !important; }
  body { background: #65a30d !important; }
  #root { background: #0b0f14 !important; }
`

function px(n: number | undefined | null): string {
  return n === undefined || n === null ? '—' : String(Math.round(n * 100) / 100)
}

function measure(): Row[] {
  const rows: Row[] = []
  const push = (key: string, value: string, flag = false) => rows.push({ key, value, flag })

  // --- the meta tag, read live from the DOM rather than from the repo ---
  const meta = document.querySelector('meta[name="viewport"]')
  const content = meta?.getAttribute('content') ?? '(NO META)'
  push('viewport-fit=cover', content.includes('viewport-fit=cover') ? 'YES' : 'MISSING', !content.includes('viewport-fit=cover'))

  // --- probes: viewport units and the real bottom edge ---
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  const mk = (h: string) => {
    const d = document.createElement('div')
    d.style.height = h
    host.append(d)
    return d
  }
  const dvh = mk('100dvh')
  const svh = mk('100svh')
  const lvh = mk('100lvh')
  const inset = document.createElement('div')
  inset.style.cssText = 'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  host.append(inset)
  document.body.append(host)
  const insetCs = getComputedStyle(inset)
  const dvhH = dvh.getBoundingClientRect().height
  const svhH = svh.getBoundingClientRect().height
  const lvhH = lvh.getBoundingClientRect().height
  const insetTop = insetCs.paddingTop
  const insetBottom = insetCs.paddingBottom
  host.remove()

  const nav = document.querySelector('nav')
  const navBottom = nav?.getBoundingClientRect().bottom
  const root = document.getElementById('root')
  const rootRect = root?.getBoundingClientRect()

  // A fixed bottom:0 element sits on the layout viewport's bottom edge by
  // definition. This is the line the strip is measured against.
  const edge = document.createElement('div')
  edge.style.cssText = 'position:fixed;left:0;bottom:0;height:1px;width:1px;visibility:hidden'
  document.body.append(edge)
  const edgeBottom = edge.getBoundingClientRect().bottom
  edge.remove()

  push('nav rect.bottom', px(navBottom))
  push('window.innerHeight', px(window.innerHeight))
  push('docEl.clientHeight', px(document.documentElement.clientHeight))
  push('fixed bottom:0 edge', px(edgeBottom))
  push('#root rect top/bot', `${px(rootRect?.top)} / ${px(rootRect?.bottom)}`)
  push('body rect height', px(document.body.getBoundingClientRect().height))
  push('docEl rect height', px(document.documentElement.getBoundingClientRect().height))

  push('100dvh', px(dvhH))
  push('100svh', px(svhH))
  push('100lvh', px(lvhH), lvhH !== dvhH)
  push('lvh − dvh', px(lvhH - dvhH), lvhH - dvhH > 1)

  push('screen.height', px(window.screen?.height))
  push('screen.availHeight', px(window.screen?.availHeight))

  const vv = window.visualViewport
  push('vv h / offTop / pgTop', `${px(vv?.height)} / ${px(vv?.offsetTop)} / ${px(vv?.pageTop)}`)

  push('inset top / bottom', `${insetTop} / ${insetBottom}`)

  // --- the answers ---
  if (navBottom !== undefined) {
    push('nav→viewport bottom', px(edgeBottom - navBottom), edgeBottom - navBottom > 1)
  }
  push('viewport→screen bot', px(lvhH - edgeBottom), lvhH - edgeBottom > 1)
  push('#root→viewport bot', px(edgeBottom - (rootRect?.bottom ?? 0)), (edgeBottom - (rootRect?.bottom ?? 0)) > 1)

  return rows
}

export function TabBarDebugOverlay() {
  const [rows, setRows] = useState<Row[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = PAINT
    document.head.append(style)

    const update = () => setRows(measure())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      style.remove()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  if (hidden) return null

  return (
    <>
      {/* Bottom edge of the layout viewport. Anything below this line is
          outside the page entirely — unreachable from CSS inside the app. */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: '#ff00b4',
          zIndex: 101,
          pointerEvents: 'none',
        }}
      />
      <div
        onClick={() => setHidden(true)}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 4px)',
          left: 4,
          right: 4,
          zIndex: 100,
          maxHeight: '68vh',
          overflowY: 'auto',
          background: 'rgba(5,10,16,0.96)',
          border: '1px solid rgba(255,0,180,0.7)',
          borderRadius: 8,
          padding: '6px 8px',
          font: '10px/1.5 ui-monospace, SFMono-Regular, monospace',
          color: '#e8eaed',
        }}
      >
        <div style={{ fontWeight: 700, color: '#ff4fb8', marginBottom: 2 }}>
          VIEWPORT DEBUG — tap to hide
        </div>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>
          strip RED = outside body · GREEN = body outside #root · DARK = inside #root ·
          below the magenta line = outside the viewport
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
    </>
  )
}

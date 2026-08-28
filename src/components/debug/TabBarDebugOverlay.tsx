import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * TEMPORARY diagnostic probe — round 4. Delete this file, its import in
 * AppShell.tsx, and the <TabBarDebugOverlay /> element once read off device.
 *
 * Where the last three rounds went wrong, so this one doesn't repeat it:
 *
 *   Rounds 1-3 assumed the strip was padding, then the tab bar's box, then that
 *   #root was 59px short of an 852px containing block. The last one is dead:
 *   docEl.clientHeight, body rect, docEl rect and 100svh all measure 793. Every
 *   *box* in the document is 793 tall. Only 100lvh and screen.height say 852.
 *
 * So the strip is not any element's box. Two things remain unexplained and this
 * probe tests exactly those two, nothing else:
 *
 * 1. GEOMETRY — where do the viewport units actually LAND on the physical
 *    screen? getBoundingClientRect() is viewport-relative, so it structurally
 *    cannot answer this: it reports top:0 for a thing painted under the status
 *    bar and top:0 for a thing painted below it. Only a photograph can tell
 *    them apart. Hence six full-height coloured stripes down the left edge, one
 *    per height expression. Read where each one's colour STOPS relative to the
 *    two magenta hairlines (fixed top:0 and fixed bottom:0 — the layout
 *    viewport's true edges by definition).
 *
 * 2. PAINT — round 3's screenshot showed GREEN (body) outside every box while
 *    html was painted RED. Per CSS Backgrounds 3 §2.11.2 the body background
 *    propagates to the canvas ONLY if html's own background is transparent.
 *    html's was not. So either the html rule never applied, or WebKit is
 *    propagating regardless. PAINT_MODES separates those — tap [PAINT] to
 *    cycle:
 *      mode 0  html RED    body GREEN  — reproduces the round-3 baseline
 *      mode 1  html RED    body NONE   — strip red => canvas is html's own
 *      mode 2  html NONE   body GREEN  — strip green => ordinary propagation
 *      mode 3  html BLUE   body NONE   — third colour, rules out a stale style
 *    Mode 0 green together with mode 1 red would mean propagation happens
 *    despite an opaque html — i.e. the paint is a WebKit behaviour and not a
 *    layout bug at all, and there is no dead band to fix, only a wrong colour.
 *
 * The readout also prints the computed html/body background-color, so "the rule
 * never applied" can be told apart from "the rule applied and was ignored".
 *
 * TWO TRAPS THIS PROBE HAS TO AVOID, both of which would fake a null result:
 *
 *   a. CLIPPING. AppShell's root div, #root and body are all overflow:hidden at
 *      793. An 852px 100lvh stripe rendered inside any of them is clipped to
 *      793 — it would *look* like lvh === 793 and send round 5 down another
 *      wrong path. So the stripes are portalled to document.body (escaping
 *      AppShell's and #root's clip), and [UNCLIP] forces overflow:visible on
 *      html/body/#root. Photograph with UNCLIP ON; if a stripe changes length
 *      when you toggle it, that stripe was being clipped, which is itself the
 *      answer.
 *
 *   b. Reading a stripe's length off getBoundingClientRect() alone. A clipped
 *      element still reports its full unclipped rect, and an element painted
 *      under the status bar reports the same top:0 as one painted below it.
 *      The numbers and the photograph answer different halves of this; neither
 *      is sufficient alone.
 */

interface Row {
  key: string
  value: string
  flag?: boolean
}

/** One stripe per height expression. Distinct hues, readable over red/green/dark. */
const STRIPES: { label: string; color: string; css: string; fixed?: boolean }[] = [
  { label: 'abs100', color: '#22d3ee', css: '100%' },
  { label: 'lvh', color: '#f97316', css: '100lvh' },
  { label: 'dvh', color: '#ffffff', css: '100dvh' },
  { label: 'svh', color: '#a855f7', css: '100svh' },
  { label: 'vh', color: '#eab308', css: '100vh' },
  { label: 'fix100', color: '#ec4899', css: '100%', fixed: true },
]

const RED = '#b91c1c'
const GREEN = '#65a30d'
const BLUE = '#1d4ed8'
const ROOT_DARK = '#0b0f14'

const PAINT_MODES: { name: string; css: string }[] = [
  {
    name: '0 html RED / body GREEN',
    css: `html{background:${RED} !important}body{background:${GREEN} !important}#root{background:${ROOT_DARK} !important}`,
  },
  {
    name: '1 html RED / body NONE',
    css: `html{background:${RED} !important}body{background:transparent !important}#root{background:${ROOT_DARK} !important}`,
  },
  {
    name: '2 html NONE / body GREEN',
    css: `html{background:transparent !important}body{background:${GREEN} !important}#root{background:${ROOT_DARK} !important}`,
  },
  {
    name: '3 html BLUE / body NONE',
    css: `html{background:${BLUE} !important}body{background:transparent !important}#root{background:transparent !important}`,
  },
]

function px(n: number | undefined | null): string {
  return n === undefined || n === null ? '—' : String(Math.round(n * 100) / 100)
}

function measure(): Row[] {
  const rows: Row[] = []
  const push = (key: string, value: string, flag = false) => rows.push({ key, value, flag })

  const html = document.documentElement
  const body = document.body
  const htmlRect = html.getBoundingClientRect()
  const bodyRect = body.getBoundingClientRect()

  // --- the displacement question, asked directly ---
  push('docEl rect top/bot', `${px(htmlRect.top)} / ${px(htmlRect.bottom)}`, htmlRect.top !== 0)
  push('body rect top/bot', `${px(bodyRect.top)} / ${px(bodyRect.bottom)}`, bodyRect.top !== 0)
  push('scrollX / scrollY', `${px(window.scrollX)} / ${px(window.scrollY)}`, window.scrollY !== 0)
  push('docEl scrollTop', px(html.scrollTop), html.scrollTop !== 0)
  push('body scrollTop', px(body.scrollTop), body.scrollTop !== 0)
  push('docEl scrollHeight', px(html.scrollHeight))
  push('body scrollHeight', px(body.scrollHeight))

  // --- did the paint rules actually apply? ---
  push('computed html bg', getComputedStyle(html).backgroundColor)
  push('computed body bg', getComputedStyle(body).backgroundColor)

  // --- the visual viewport, which round 3 never reported ---
  const vv = window.visualViewport
  push('vv height', px(vv?.height))
  push('vv offsetTop', px(vv?.offsetTop), (vv?.offsetTop ?? 0) !== 0)
  push('vv pageTop', px(vv?.pageTop), (vv?.pageTop ?? 0) !== 0)
  push('vv scale', px(vv?.scale), (vv?.scale ?? 1) !== 1)

  // --- where each stripe actually terminates, in viewport coords ---
  for (const { label } of STRIPES) {
    const el = document.querySelector(`[data-probe="${label}"]`)
    const r = el?.getBoundingClientRect()
    push(`stripe ${label}`, r ? `${px(r.top)} to ${px(r.bottom)} (h ${px(r.height)})` : '—')
  }

  push('window.innerHeight', px(window.innerHeight))
  push('docEl.clientHeight', px(html.clientHeight))
  push('screen.height', px(window.screen?.height))
  push('nav.standalone', String((navigator as Navigator & { standalone?: boolean }).standalone))
  push('dm: standalone', String(window.matchMedia('(display-mode: standalone)').matches))
  push('dm: fullscreen', String(window.matchMedia('(display-mode: fullscreen)').matches))
  push('dm: browser', String(window.matchMedia('(display-mode: browser)').matches))

  const insetProbe = document.createElement('div')
  insetProbe.style.cssText =
    'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
  document.body.append(insetProbe)
  const cs = getComputedStyle(insetProbe)
  push('inset top / bottom', `${cs.paddingTop} / ${cs.paddingBottom}`)
  insetProbe.remove()

  return rows
}

export function TabBarDebugOverlay() {
  const [rows, setRows] = useState<Row[]>([])
  const [mode, setMode] = useState(0)
  const [unclip, setUnclip] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent =
      PAINT_MODES[mode].css +
      (unclip
        ? 'html,body,#root{overflow:visible !important}'
        : '')
    document.head.append(style)
    return () => style.remove()
  }, [mode, unclip])

  useEffect(() => {
    // Two frames, so the stripes are laid out before they are measured.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRows(measure())),
    )
    const update = () => setRows(measure())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [mode, unclip])

  if (hidden) return null

  // Portalled to <body> so AppShell's root div and #root — both overflow:hidden
  // at 793 — cannot clip an 852px stripe and fake a null result. See trap (a).
  const stripes = createPortal(
    <>
      {STRIPES.map(({ label, color, css, fixed }, i) => (
        <div
          key={label}
          data-probe={label}
          style={{
            position: fixed ? 'fixed' : 'absolute',
            top: 0,
            left: i * 9,
            width: 7,
            height: css,
            background: color,
            zIndex: 90,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* True edges of the layout viewport. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: '#ff00b4',
          zIndex: 101,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: '#ff00b4',
          zIndex: 101,
          pointerEvents: 'none',
        }}
      />
    </>,
    document.body,
  )

  return (
    <>
      {stripes}
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 4px)',
          left: 60,
          right: 4,
          zIndex: 100,
          maxHeight: '72vh',
          overflowY: 'auto',
          background: 'rgba(5,10,16,0.96)',
          border: '1px solid rgba(255,0,180,0.7)',
          borderRadius: 8,
          padding: '6px 8px',
          font: '10px/1.45 ui-monospace, SFMono-Regular, monospace',
          color: '#e8eaed',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <button
            onClick={() => setMode((m) => (m + 1) % PAINT_MODES.length)}
            style={{
              flex: 1,
              background: '#ff00b4',
              color: '#000',
              border: 0,
              borderRadius: 4,
              padding: '4px 6px',
              fontWeight: 700,
              font: 'inherit',
            }}
          >
            PAINT: {PAINT_MODES[mode].name}
          </button>
          <button
            onClick={() => setUnclip((u) => !u)}
            style={{
              background: unclip ? '#22c55e' : '#334155',
              color: unclip ? '#000' : '#fff',
              border: 0,
              borderRadius: 4,
              padding: '4px 8px',
              fontWeight: 700,
              font: 'inherit',
            }}
          >
            {unclip ? 'UNCLIP ON' : 'UNCLIP OFF'}
          </button>
          <button
            onClick={() => setHidden(true)}
            style={{
              background: '#334155',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              padding: '4px 8px',
              font: 'inherit',
            }}
          >
            X
          </button>
        </div>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>
          stripes L to R: {STRIPES.map((s) => s.label).join(' / ')}
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

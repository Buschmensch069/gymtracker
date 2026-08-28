/**
 * Rest-timer alarm, synthesised with Web Audio rather than shipping an audio
 * asset — it's three sine beeps, and an oscillator is smaller than any file.
 *
 * Two iOS constraints shape this:
 *
 * 1. An AudioContext starts suspended and can only be resumed from inside a
 *    user gesture. `primeAlarm()` exists to be called from the tap that starts
 *    a rest timer (completing a set), so the context is already running by the
 *    time the timer fires with no gesture available.
 * 2. Nothing here survives the screen locking or the app backgrounding — iOS
 *    suspends Web Audio outright at that point. The alarm is only ever heard
 *    if the app is still foregrounded, which is what the wake lock is for.
 *    See CLAUDE.md "Rest Timer" for the full ceiling.
 *
 * The alarm is also inaudible with the ring switch on silent, which is why the
 * timer pairs it with a full-screen visual flash rather than relying on sound.
 */

const BEEP_COUNT = 3
const BEEP_FREQUENCY_HZ = 880
const BEEP_DURATION_S = 0.16
const BEEP_GAP_S = 0.22
const PEAK_GAIN = 0.55

type AudioContextConstructor = typeof AudioContext

function getAudioContextCtor(): AudioContextConstructor | undefined {
  const w = window as Window & { webkitAudioContext?: AudioContextConstructor }
  return window.AudioContext ?? w.webkitAudioContext
}

let context: AudioContext | undefined

/**
 * Create/resume the AudioContext. MUST be called synchronously from a user
 * gesture handler (the set-completion tap) or iOS leaves it suspended and the
 * later alarm is silent.
 */
export function primeAlarm(): void {
  const Ctor = getAudioContextCtor()
  if (!Ctor) return
  context ??= new Ctor()
  if (context.state === 'suspended') void context.resume()
}

/** Play the alarm. Safe to call when unsupported or still suspended — it just makes no sound. */
export function playAlarm(): void {
  const Ctor = getAudioContextCtor()
  if (!Ctor) return
  context ??= new Ctor()
  // Best-effort: if the context never got primed by a gesture this resolves too
  // late to help, but it costs nothing and recovers the case where iOS
  // auto-suspended a context that was primed earlier in the session.
  if (context.state === 'suspended') void context.resume()

  const start = context.currentTime
  for (let i = 0; i < BEEP_COUNT; i++) {
    const at = start + i * (BEEP_DURATION_S + BEEP_GAP_S)
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(BEEP_FREQUENCY_HZ, at)
    // Ramp rather than switching the gain — a hard start/stop on a sine clicks.
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + 0.01)
    gain.gain.linearRampToValueAtTime(0, at + BEEP_DURATION_S)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(at)
    oscillator.stop(at + BEEP_DURATION_S + 0.02)
  }
}

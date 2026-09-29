/**
 * Audible + haptic confirmation for scans, so warehouse staff can keep their
 * eyes on the device instead of the screen. Short high beep = success,
 * two-tone = warning (e.g. wrong warehouse), low buzz = not found / error.
 * Fails silently where audio or vibration isn't available.
 */
type Kind = 'ok' | 'warn' | 'error';

let ctx: AudioContext | null = null;

const tone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
};

export function scanFeedback(kind: Kind) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      ctx = ctx || new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      if (kind === 'ok') tone(1320, 0, 0.12);
      else if (kind === 'warn') { tone(880, 0, 0.1); tone(660, 0.12, 0.12); }
      else tone(220, 0, 0.3, 'square');
    }
  } catch {
    /* audio not available */
  }
  try {
    navigator.vibrate?.(kind === 'ok' ? 60 : kind === 'warn' ? [60, 60, 60] : [200, 80, 200]);
  } catch {
    /* vibration not available */
  }
}

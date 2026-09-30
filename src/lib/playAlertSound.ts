// A two-tone beep generated with the Web Audio API — no audio file to ship,
// no licensing to worry about. Used to alert staff to a new incoming order
// without requiring any server-side push infrastructure.
export function playAlertSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const playTone = (startTime: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    };
    playTone(ctx.currentTime);
    playTone(ctx.currentTime + 0.35);
  } catch {
    // Web Audio unavailable or blocked by the browser — the visual alert
    // (see OrdersView) still shows regardless.
  }
}

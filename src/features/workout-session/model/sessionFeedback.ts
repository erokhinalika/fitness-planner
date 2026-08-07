function playCircuitTone(audioContext: AudioContext, frequency: number, durationMs: number, volume = 0.22) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  const start = audioContext.currentTime;
  oscillator.start(start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  oscillator.stop(start + durationMs / 1000 + 0.02);
}

export function playRoundCompleteSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 880, 180);
  window.setTimeout(() => playCircuitTone(audioContext, 660, 240), 220);
}

export function playWorkoutCompleteSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 880, 160);
  window.setTimeout(() => playCircuitTone(audioContext, 880, 160), 200);
  window.setTimeout(() => playCircuitTone(audioContext, 660, 280), 420);
}

export function playRestEndSound(audioContext: AudioContext) {
  playCircuitTone(audioContext, 620, 120);
}

export function vibrate(pattern: VibratePattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

// Every sound the vault makes, built from plain WebAudio oscillators —
// no audio files, no network, nothing to load. A soft tick while the
// alarm climbs, a chime for gold, a low buzz for being spotted, a sting
// for the getaway. Muted until the player presses a key or clicks, as
// browsers ask.
export function makeSfx() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, seconds, type, volume, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime + when);
    oscillator.stop(ctx.currentTime + when + seconds);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    coin() {
      tone(1320, 0.12, 'sine', 0.12);
      tone(1760, 0.18, 'sine', 0.1, 0.08);
    },
    diamond() {
      tone(1046, 0.15, 'sine', 0.14);
      tone(1318, 0.15, 'sine', 0.14, 0.1);
      tone(1568, 0.3, 'sine', 0.14, 0.2);
    },
    spotted() {
      tone(220, 0.25, 'sawtooth', 0.08);
    },
    alarmTick() {
      tone(880, 0.06, 'square', 0.04);
    },
    tool() {
      tone(660, 0.1, 'triangle', 0.1);
      tone(990, 0.14, 'triangle', 0.08, 0.07);
    },
    caught() {
      tone(180, 0.4, 'sawtooth', 0.14);
      tone(120, 0.5, 'sawtooth', 0.14, 0.15);
    },
    win() {
      [523, 659, 784, 1046].forEach((frequency, index) => tone(frequency, 0.25, 'sine', 0.12, index * 0.12));
    },
  };
}

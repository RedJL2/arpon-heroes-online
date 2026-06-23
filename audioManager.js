(() => {
  const savedMuted = localStorage.getItem("arpon-muted") === "true";
  let muted = savedMuted;
  let context = null;

  const patterns = {
    select: [[260, 0.035, 0.025]],
    wall: [[130, 0.055, 0.04], [95, 0.07, 0.035]],
    dice: [[210, 0.045, 0.025], [270, 0.045, 0.025], [340, 0.065, 0.035]],
    attack: [[150, 0.055, 0.045], [95, 0.11, 0.05]],
    damage: [[85, 0.14, 0.06]],
    turnStart: [[220, 0.065, 0.035], [330, 0.08, 0.04]],
    turnEnd: [[260, 0.065, 0.035], [175, 0.09, 0.035]],
    victory: [[220, 0.1, 0.035], [330, 0.1, 0.04], [440, 0.18, 0.05]],
  };

  function audioContext() {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") context.resume();
    return context;
  }

  function tone(frequency, duration, volume, delay) {
    if (muted) return;
    const ctx = audioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    if (muted || !patterns[name]) return;
    let delay = 0;
    patterns[name].forEach(([frequency, duration, volume]) => {
      tone(frequency, duration, volume, delay);
      delay += duration * 0.72;
    });
  }

  function setMuted(value) {
    muted = Boolean(value);
    localStorage.setItem("arpon-muted", String(muted));
    return muted;
  }

  window.ArponAudio = {
    play,
    isMuted: () => muted,
    setMuted,
    toggle: () => setMuted(!muted),
  };
})();

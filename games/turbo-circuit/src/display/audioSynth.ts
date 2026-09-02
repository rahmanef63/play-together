export class TurboAudioSynth {
  #ctx: AudioContext | null = null;
  #engine: OscillatorNode | null = null;
  #engineGain: GainNode | null = null;
  #enabled = true;
  async unlock() {
    if (typeof AudioContext === "undefined") return;
    try {
      this.#ctx ??= new AudioContext({ latencyHint: "interactive" });
      if (this.#ctx.state === "suspended") await this.#ctx.resume().catch(() => undefined);
    } catch {
      this.#ctx = null;
    }
  }
  get enabled() {
    return this.#enabled;
  }
  async setEnabled(enabled: boolean) {
    this.#enabled = enabled;
    if (enabled) await this.unlock();
    else this.stopEngine();
  }
  updateEngine(speedRatio: number, active: boolean) {
    if (!this.#enabled || !this.#ctx || this.#ctx.state !== "running") return;
    if (!active) {
      this.#engineGain?.gain.setTargetAtTime(0.0001, this.#ctx.currentTime, 0.08);
      return;
    }
    this.#startEngine();
    if (!this.#engine || !this.#engineGain) return;
    const ratio = Math.max(0, Math.min(1.35, Math.abs(speedRatio))),
      now = this.#ctx.currentTime;
    this.#engine.frequency.setTargetAtTime(45 + ratio * 150, now, 0.05);
    this.#engineGain.gain.setTargetAtTime(0.025 + Math.min(0.052, ratio * 0.04), now, 0.05);
  }
  countdown(final = false) {
    this.#sweep(
      final ? "triangle" : "sine",
      final ? 880 : 440,
      final ? 1100 : 440,
      final ? 0.55 : 0.28,
      0.16,
    );
  }
  coin() {
    this.#sequence([988, 1319, 1760], 0.07, 0.24, 0.1, "sine");
  }
  itemBox() {
    this.#sequence([523, 659, 784, 1047], 0.05, 0.14, 0.1, "triangle");
  }
  rouletteTick() {
    this.#sweep("square", 760, 860, 0.035, 0.055);
  }
  boost() {
    this.#sweep("sawtooth", 220, 880, 0.46, 0.16, true);
  }
  pulseFire() {
    this.#sweep("square", 300, 620, 0.23, 0.12, true);
  }
  mineDrop() {
    this.#sweep("triangle", 260, 105, 0.3, 0.12);
  }
  crash() {
    this.#noise(0.16, 0.13, 650);
    this.#sweep("square", 145, 48, 0.34, 0.2);
  }
  wallHit() {
    this.#noise(0.09, 0.09, 1050);
    this.#sweep("square", 180, 95, 0.12, 0.1);
  }
  spin() {
    this.#sequence([330, 270, 205], 0.055, 0.13, 0.085, "square");
  }
  wrongWay() {
    this.#sequence([790, 545], 0.12, 0.14, 0.16, "sawtooth");
  }
  driftSpark(superTier: boolean) {
    this.#sweep("triangle", superTier ? 1200 : 880, superTier ? 1800 : 1320, 0.17, 0.11, true);
  }
  slipstream() {
    this.#sweep("sine", 260, 650, 0.42, 0.13, true);
  }
  scrape() {
    this.#noise(0.11, 0.045, 2200);
    this.#sweep("triangle", 360, 220, 0.22, 0.04);
  }
  rescue() {
    this.#sequence([440, 554, 659, 880], 0.07, 0.18, 0.09, "sine");
  }
  finish() {
    this.#sequence([523, 659, 784, 1047, 1319], 0.09, 0.32, 0.12, "triangle");
  }
  stopEngine() {
    if (this.#engine) {
      try {
        this.#engine.stop();
      } catch {}
      this.#engine.disconnect();
    }
    this.#engine = null;
    this.#engineGain = null;
  }
  async dispose() {
    this.stopEngine();
    const ctx = this.#ctx;
    this.#ctx = null;
    if (ctx && ctx.state !== "closed") await ctx.close().catch(() => undefined);
  }
  #startEngine() {
    if (this.#engine || !this.#ctx) return;
    const oscillator = this.#ctx.createOscillator(),
      filter = this.#ctx.createBiquadFilter(),
      gain = this.#ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(45, this.#ctx.currentTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(340, this.#ctx.currentTime);
    gain.gain.setValueAtTime(0.025, this.#ctx.currentTime);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.#ctx.destination);
    oscillator.start();
    this.#engine = oscillator;
    this.#engineGain = gain;
  }
  #sequence(
    frequencies: number[],
    spacing: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) {
    if (!this.#ready()) return;
    frequencies.forEach((frequency, index) => {
      const start = (this.#ctx?.currentTime ?? 0) + index * spacing;
      this.#tone(type, frequency, frequency, duration, volume, start, false);
    });
  }
  #sweep(
    type: OscillatorType,
    start: number,
    end: number,
    duration: number,
    volume: number,
    exponential = false,
  ) {
    if (!this.#ready()) return;
    this.#tone(type, start, end, duration, volume, this.#ctx?.currentTime ?? 0, exponential);
  }
  #tone(
    type: OscillatorType,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    volume: number,
    startAt: number,
    exponential: boolean,
  ) {
    if (!this.#ctx) return;
    const oscillator = this.#ctx.createOscillator(),
      gain = this.#ctx.createGain(),
      stopAt = startAt + duration;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startAt);
    if (exponential)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), stopAt);
    else oscillator.frequency.linearRampToValueAtTime(endFrequency, stopAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
    oscillator.connect(gain);
    gain.connect(this.#ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt);
  }
  #noise(duration: number, volume: number, lowpass: number) {
    if (!this.#ready() || !this.#ctx) return;
    const count = Math.max(64, Math.floor(this.#ctx.sampleRate * duration)),
      buffer = this.#ctx.createBuffer(1, count, this.#ctx.sampleRate),
      data = buffer.getChannelData(0);
    for (let index = 0; index < count; index++)
      data[index] = (Math.random() * 2 - 1) * (1 - index / count);
    const source = this.#ctx.createBufferSource(),
      filter = this.#ctx.createBiquadFilter(),
      gain = this.#ctx.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#ctx.destination);
    source.start();
  }
  #ready() {
    return Boolean(this.#enabled && this.#ctx && this.#ctx.state === "running");
  }
}

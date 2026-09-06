export function playNoise(
  context: AudioContext,
  duration: number,
  volume: number,
  lowpass: number,
) {
  const count = Math.max(64, Math.floor(context.sampleRate * duration)),
    buffer = context.createBuffer(1, count, context.sampleRate),
    data = buffer.getChannelData(0);
  for (let index = 0; index < count; index++)
    data[index] = (Math.random() * 2 - 1) * (1 - index / count);
  const source = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    gain = context.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
}

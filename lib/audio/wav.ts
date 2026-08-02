const TARGET_SAMPLE_RATE = 16000;

export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i) & 0xff);
  };
  const writeUint32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };
  const writeUint16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };

  // RIFF header
  writeString("RIFF");
  writeUint32(bufferSize - 8);
  writeString("WAVE");

  // fmt chunk
  writeString("fmt ");
  writeUint32(16);
  writeUint16(1); // PCM
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(sampleRate * blockAlign);
  writeUint16(blockAlign);
  writeUint16(16);

  // data chunk
  writeString("data");
  writeUint32(dataSize);

  // 16-bit PCM samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export async function audioBlobToWav(blob: Blob): Promise<Blob> {
  const AudioCtx: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const OfflineCtx: typeof OfflineAudioContext | undefined =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!AudioCtx || !OfflineCtx) throw new Error("audio_context_unavailable");

  const arrayBuf = await blob.arrayBuffer();
  const ctx = new AudioCtx();
  const audioBuffer = await ctx.decodeAudioData(arrayBuf);
  ctx.close();

  const length = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineCtx(1, length, TARGET_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();

  const samples = rendered.getChannelData(0);
  return new Blob([encodeWav(samples, TARGET_SAMPLE_RATE)], { type: "audio/wav" });
}

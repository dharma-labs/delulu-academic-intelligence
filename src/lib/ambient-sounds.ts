'use client';

/**
 * Ambient sound utilities using Web Audio API.
 * No audio files needed — all sounds are generated procedurally.
 */

export interface AmbientSound {
  stop: () => void;
  setVolume: (v: number) => void;
}

const BUFFER_SIZE = 2 * 44100; // 2 seconds of audio

/**
 * Creates a brown-noise-based rain sound.
 * Uses a lowpass filter to shape white noise into rain-like brown noise,
 * with slow random volume modulation for a natural pattering effect.
 */
export function createRainSound(audioContext: AudioContext): AmbientSound {
  const bufferSize = BUFFER_SIZE;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Lowpass filter to create brown/rain-like character
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 1;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.3;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start();

  // Slow volume modulation for natural rain pattering
  let modInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
    const now = audioContext.currentTime;
    const target = 0.2 + Math.random() * 0.2;
    gainNode.gain.linearRampToValueAtTime(target, now + 0.8);
  }, 800);

  return {
    stop() {
      if (modInterval) clearInterval(modInterval);
      modInterval = null;
      try { source.stop(); } catch { /* already stopped */ }
    },
    setVolume(v: number) {
      const now = audioContext.currentTime;
      gainNode.gain.linearRampToValueAtTime(v, now + 0.1);
    },
  };
}

/**
 * Creates white noise via AudioContext buffer source with random samples.
 */
export function createWhiteNoise(audioContext: AudioContext): AmbientSound {
  const bufferSize = BUFFER_SIZE;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.3;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start();

  return {
    stop() {
      try { source.stop(); } catch { /* already stopped */ }
    },
    setVolume(v: number) {
      const now = audioContext.currentTime;
      gainNode.gain.linearRampToValueAtTime(v, now + 0.1);
    },
  };
}

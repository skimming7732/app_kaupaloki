// Prepare audio during the submit gesture so it can play after the save completes.
export const prepareSuccessSound = () => {
  if (!window.AudioContext) return () => {};

  try {
    const audio = new AudioContext();
    void audio.resume().catch(() => {});
    const close = () => { void audio.close().catch(() => {}); };

    let finished = false;
    return (success: boolean) => {
      if (finished) return;
      finished = true;
      if (!success || audio.state !== 'running') {
        close();
        return;
      }

      try {
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        const start = audio.currentTime;
        tone.frequency.setValueAtTime(523.25, start);
        tone.frequency.setValueAtTime(659.25, start + 0.09);
        volume.gain.setValueAtTime(0, start);
        volume.gain.linearRampToValueAtTime(0.045, start + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        tone.connect(volume).connect(audio.destination);
        tone.onended = close;
        tone.start(start);
        tone.stop(start + 0.26);
      } catch {
        close();
      }
    };
  } catch {
    return () => {};
  }
};

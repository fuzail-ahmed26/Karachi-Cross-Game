import { useEffect, useRef, useCallback } from 'react';

export function useEngineSound(isPlaying: boolean, isMuted: boolean = false) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hornTimeoutRef = useRef<number | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  useEffect(() => {
    if (isPlaying && !isMuted) {
      if (!audioCtxRef.current) {
         audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
         ctx.resume().catch(e => console.warn('Could not resume audio:', e));
      }

      const scheduleHorn = () => {
         if (!audioCtxRef.current) return;
         if (audioCtxRef.current.state !== 'running') {
            hornTimeoutRef.current = window.setTimeout(scheduleHorn, 1000);
            return;
         }

         const osc1 = audioCtxRef.current.createOscillator();
         const osc2 = audioCtxRef.current.createOscillator();
         const gain = audioCtxRef.current.createGain();
         
         // Car horn is typically a dissonant chord (e.g. minor third) with sawtooth waves
         osc1.type = 'sawtooth';
         osc2.type = 'sawtooth';
         
         // Randomize horn pitch slightly to simulate different vehicles
         const baseFreq = 300 + Math.random() * 150;
         osc1.frequency.value = baseFreq; 
         osc2.frequency.value = baseFreq * 1.15; // minor third-ish
         
         const filter = audioCtxRef.current.createBiquadFilter();
         filter.type = 'lowpass';
         filter.frequency.value = 2000; // soften the harshness

         osc1.connect(gain);
         osc2.connect(gain);
         gain.connect(filter);
         filter.connect(audioCtxRef.current.destination);
         
         const now = audioCtxRef.current.currentTime;
         const volume = 0.05 + Math.random() * 0.05; // Randomize volume slightly
         
         gain.gain.setValueAtTime(0, now);
         gain.gain.linearRampToValueAtTime(volume, now + 0.05);
         gain.gain.setValueAtTime(volume, now + 0.3);
         gain.gain.linearRampToValueAtTime(0, now + 0.4);
         
         osc1.start(now);
         osc2.start(now);
         osc1.stop(now + 0.4);
         osc2.stop(now + 0.4);
         
         // Schedule next honk anywhere from 1 to 4 seconds later
         hornTimeoutRef.current = window.setTimeout(scheduleHorn, 1000 + Math.random() * 3000);
      };

      scheduleHorn();

    } else {
       // Stop audio gracefully
       if (hornTimeoutRef.current) {
          clearTimeout(hornTimeoutRef.current);
          hornTimeoutRef.current = null;
       }
    }

    return () => {
       if (hornTimeoutRef.current) {
          clearTimeout(hornTimeoutRef.current);
       }
    };
  }, [isPlaying, isMuted]);

  return { initAudio };
}

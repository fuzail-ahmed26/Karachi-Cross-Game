import { useEffect, useRef, useState } from 'react';
import { Engine } from './Engine';
import { GameState } from './types';

export function useEngine(onPlayAudio: (text: string) => void) {
  const engineRef = useRef<Engine | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    let lastUiUpdate = 0;
    
    engineRef.current = new Engine((newState) => {
      // Throttle UI state updates to 15fps to avoid React thrashing
      // We'll render the canvas from the raw ref.current.state at 60fps
      const now = performance.now();
      if (now - lastUiUpdate > 66) { // ~15fps
         setState(newState);
         lastUiUpdate = now;
      }
    }, onPlayAudio);

    setState(engineRef.current.state);

    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      
      const eng = engineRef.current;
      
      if (!eng.state.hasStarted && e.code === 'Space') {
         eng.start();
         return;
      }
      if (eng.state.isGameOver && e.code === 'Space') {
         eng.restart();
         return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          eng.movePlayer(0, 1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          eng.movePlayer(0, -1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          eng.movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          eng.movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { state, engine: engineRef.current };
}

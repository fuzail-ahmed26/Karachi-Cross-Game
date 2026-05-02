import React, { useState, useEffect, useRef } from 'react';
import { useEngine } from './useEngine';
import { GameCanvas } from './GameCanvas';
import { useEngineSound } from './useEngineSound';

import { Volume2, VolumeX, Moon, Sun } from 'lucide-react';

export const KarachiRoad = () => {
   const [speechSupported, setSpeechSupported] = useState(false);
   const speechSupportedRef = useRef(false);
   const [isMuted, setIsMuted] = useState(false);
   const [isNightMode, setIsNightMode] = useState(false);
   const isMutedRef = useRef(false);

   useEffect(() => {
     if (typeof window !== 'undefined' && window.speechSynthesis) {
        setSpeechSupported(true);
        speechSupportedRef.current = true;
     }
   }, []);

   useEffect(() => {
     isMutedRef.current = isMuted;
     if (isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
     }
   }, [isMuted]);

   const handlePlayAudio = (text: string) => {
      if (speechSupportedRef.current && !isMutedRef.current) {
         window.speechSynthesis.cancel(); 
         const utterance = new SpeechSynthesisUtterance(text);
         utterance.lang = 'hi-IN'; 
         window.speechSynthesis.speak(utterance);
      }
   };

   const { state, engine } = useEngine(handlePlayAudio);
   
   const { initAudio } = useEngineSound(state ? (state.hasStarted && !state.isGameOver) : false, isMuted);

   // Add a global click/keydown listener for audio init just in case
   useEffect(() => {
     const handleInteraction = () => {
       initAudio();
     };
     window.addEventListener('click', handleInteraction, { once: true });
     window.addEventListener('keydown', handleInteraction, { once: true });
     return () => {
       window.removeEventListener('click', handleInteraction);
       window.removeEventListener('keydown', handleInteraction);
     }
   }, [initAudio]);

   if (!state || !engine) return <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] text-white">Loading...</div>;

   const currentLevel = Math.floor(state.player.y / 10) + 1;

   return (
      <div className="relative flex-1 w-full h-full bg-[#111827] overflow-hidden group">
         
         {/* Top HUD */}
         <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-none bg-gradient-to-b from-black/80 to-transparent pt-8 pb-12">
            
            {/* Left: Score */}
            <div className="flex flex-col">
               <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Score</span>
               <span className="text-white text-5xl font-black tabular-nums drop-shadow-md">
                  {state.player.score.toString().padStart(5, '0')}
               </span>
               
               {state.player.combo > 0 && (
                  <div className={`mt-2 flex items-center gap-2 border border-emerald-500/50 bg-emerald-500/10 px-3 py-0.5 rounded-full w-fit transition-all ${state.comboActive ? 'scale-110' : 'scale-100'}`}>
                     <span className="text-emerald-400 font-bold text-xs tracking-tight italic uppercase">{state.player.combo + 1}X COMBO</span>
                  </div>
               )}
            </div>

            {/* Right: Level & High Score & Mute Button */}
            <div className="flex flex-col items-end gap-3 pointer-events-auto">
               <div className="flex gap-2">
                  <button 
                     onClick={() => setIsNightMode(!isNightMode)}
                     className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                     {isNightMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                  </button>
                  <button 
                     onClick={() => setIsMuted(!isMuted)}
                     className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                     {isMuted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
                  </button>
               </div>
               <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col items-end shadow-xl">
                  <span className="text-emerald-500/80 text-[10px] font-black uppercase tracking-widest">Level {currentLevel.toString().padStart(2, '0')}</span>
                  <span className="text-white text-xl font-black uppercase tracking-tight">Zone {currentLevel}</span>
                  <div className="h-px w-full bg-white/10 my-2"></div>
                  <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">High Score <span className="text-white">{state.player.highScore.toString().padStart(5, '0')}</span></span>
               </div>
            </div>
         </div>

         {/* Audio / Subtitle Instruction Overlay */}
         <div className={`absolute top-32 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md pointer-events-none transition-all duration-300 ${state.message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            {state.message && (
               <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl text-center">
                  <p className="text-xl font-bold tracking-wide mb-1 text-white">
                     {state.message.ur}
                  </p>
                  <p className="text-xs font-semibold text-emerald-500 tracking-widest uppercase">
                     {state.message.en}
                  </p>
               </div>
            )}
         </div>

         {/* Start/Restart Overlay */}
         {(!state.hasStarted || state.isGameOver) && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center pointer-events-auto">
               <div className="max-w-xl w-full flex flex-col items-center">
                  
                  <div 
                     className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-8 cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                     onClick={() => {
                        initAudio();
                        state.isGameOver ? engine.restart() : engine.start()
                     }}
                  >
                     <span className="text-black font-black text-xs uppercase tracking-widest">Space</span>
                  </div>

                  <h1 className="text-white text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase">
                     {state.isGameOver ? 'Game Over' : 'Karachi Cross'}
                  </h1>
                  
                  {state.isGameOver ? (
                     <div className="mb-8">
                        <p className="text-red-500 font-bold text-sm uppercase tracking-widest mb-2">Collision Detected</p>
                        <p className="text-zinc-300 text-xl font-medium">Final Score: <span className="text-white font-bold">{state.player.score}</span></p>
                     </div>
                  ) : (
                     <p className="text-zinc-400 text-lg font-medium max-w-sm mb-12">
                        Get Ready! Press Space to navigate the hazardous streets.
                     </p>
                  )}

                  {!state.hasStarted && (
                     <div className="flex flex-col gap-6 mt-6 max-w-sm w-full bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 text-left justify-center">
                           <div className="flex gap-1">
                              <kbd className="bg-zinc-800 text-white font-mono text-sm px-2 py-1 rounded shadow">W</kbd>
                              <kbd className="bg-zinc-800 text-white font-mono text-sm px-2 py-1 rounded shadow">A</kbd>
                              <kbd className="bg-zinc-800 text-white font-mono text-sm px-2 py-1 rounded shadow">S</kbd>
                              <kbd className="bg-zinc-800 text-white font-mono text-sm px-2 py-1 rounded shadow">D</kbd>
                           </div>
                           <span className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Move Player</span>
                        </div>
                     </div>
                  )}

               </div>
            </div>
         )}

         {/* Canvas Layer */}
         <div className="w-full h-full relative z-0 flex rounded-none overflow-hidden">
            <GameCanvas engine={engine} isNightMode={isNightMode} />
         </div>

         {/* Mobile Controls Overlay */}
         {state.hasStarted && !state.isGameOver && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 md:hidden pointer-events-auto grid grid-cols-3 gap-2">
               <div />
               <button onClick={() => engine.movePlayer(0, 1)} className="bg-black/60 border border-white/10 backdrop-blur-md w-16 h-16 flex items-center justify-center rounded-2xl active:bg-white/20 text-white shadow-xl transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
               </button>
               <div />
               <button onClick={() => engine.movePlayer(-1, 0)} className="bg-black/60 border border-white/10 backdrop-blur-md w-16 h-16 flex items-center justify-center rounded-2xl active:bg-white/20 text-white shadow-xl transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
               </button>
               <button onClick={() => engine.movePlayer(0, -1)} className="bg-black/60 border border-white/10 backdrop-blur-md w-16 h-16 flex items-center justify-center rounded-2xl active:bg-white/20 text-white shadow-xl transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
               </button>
               <button onClick={() => engine.movePlayer(1, 0)} className="bg-black/60 border border-white/10 backdrop-blur-md w-16 h-16 flex items-center justify-center rounded-2xl active:bg-white/20 text-white shadow-xl transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
               </button>
            </div>
         )}
      </div>
   );
};

import React, { useEffect, useRef } from 'react';
import { Engine } from './Engine';
import { GRID_COLS, TILE_SIZE, VISIBLE_ROWS } from './constants';

interface GameCanvasProps {
  engine: Engine;
  isNightMode: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, isNightMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const render = () => {
      const state = engine.state;
      if (!state) return;

      // Clear
      ctx.fillStyle = '#0f172a'; // dark slate base
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Add subtle grid to the background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += TILE_SIZE) {
         ctx.beginPath();
         ctx.moveTo(i, 0);
         ctx.lineTo(i, canvas.height);
         ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += TILE_SIZE) {
         ctx.beginPath();
         ctx.moveTo(0, i);
         ctx.lineTo(canvas.width, i);
         ctx.stroke();
      }
      
      // Calculate layout
      // Center the grid horizontally
      const offsetX = (canvas.width - (GRID_COLS * TILE_SIZE)) / 2;
      
      // Camera translation: Y=0 is near bottom, player moves up (Y grows)
      const playerScreenYOffset = 3; 
      const camY = state.cameraY;
      
      const bottomYPadding = 2; 

      const getScreenY = (gridY: number) => {
         return canvas.height - ((gridY - camY + bottomYPadding) * TILE_SIZE);
      };

      // Draw Lanes
      for (const lane of state.lanes) {
         const drawY = getScreenY(lane.y);
         
         // Don't draw if off screen
         if (drawY > canvas.height + TILE_SIZE || drawY < -TILE_SIZE) continue;

          if (lane.type === 'SAFE') {
            const grad = ctx.createLinearGradient(0, drawY, 0, drawY + TILE_SIZE);
            grad.addColorStop(0, '#52525b'); 
            grad.addColorStop(1, '#3f3f46'); 
            ctx.fillStyle = grad;
            ctx.fillRect(0, drawY, canvas.width, TILE_SIZE);
            
            // Pavement bottom accent (curb)
            ctx.fillStyle = '#27272a';
            ctx.fillRect(0, drawY + TILE_SIZE - 4, canvas.width, 4);
            
            // Zebra Crossings / Pavement blocks
            ctx.fillStyle = '#e4e4e7';
            const pavementTilesWide = Math.ceil(canvas.width / TILE_SIZE);
            const extraOffset = offsetX % TILE_SIZE; // Keep pattern aligned
            for(let i= -2; i < pavementTilesWide + 2; i++){
                ctx.fillRect(extraOffset + i*TILE_SIZE + TILE_SIZE * 0.25, drawY + TILE_SIZE * 0.1, TILE_SIZE * 0.5, TILE_SIZE * 0.8 - 4);
            }
         } else if (lane.type === 'ROAD') {
            ctx.fillStyle = isNightMode ? '#18181b' : '#fbbf24'; 
            ctx.fillRect(0, drawY, canvas.width, TILE_SIZE);
            
            // Draw road edges
            ctx.fillStyle = isNightMode ? '#09090b' : '#d97706';
            ctx.fillRect(0, drawY, canvas.width, 4);
            ctx.fillRect(0, drawY + TILE_SIZE - 4, canvas.width, 4);
            
            // Draw lane lines
            ctx.strokeStyle = isNightMode ? '#ffffff' : '#000000';
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.moveTo(0, drawY + TILE_SIZE / 2);
            ctx.lineTo(canvas.width, drawY + TILE_SIZE / 2);
            ctx.stroke();
            ctx.setLineDash([]);
         }

         // Draw Obstacles (vehicles or beggars)
         for (const obs of lane.obstacles) {
               const ox = offsetX + obs.x * TILE_SIZE;
               const oy = drawY;
               const owidth = obs.width * TILE_SIZE;
               const oheight = TILE_SIZE;

               // Just use colored rects and text for vehicles
               let color = '#ef4444';
               if (obs.type === 'RICKSHAW') { color = '#f59e0b'; }
               else if (obs.type === 'BUS') { color = '#3b82f6'; }
               else if (obs.type === 'TRUCK') { color = '#8b5cf6'; }
               else if (obs.type === 'BIKE') { color = '#a1a1aa'; }

               // Vehicle body
               const margin = 8;
               ctx.save();
               ctx.translate(ox, oy + margin);
               const isRight = obs.direction === 1;

               if (obs.type === 'RICKSHAW') {
                   // Rickshaw Drawing
                   ctx.fillStyle = '#fef08a'; // Yellow top
                   ctx.fillRect(0, 0, owidth, oheight - margin * 2);
                   ctx.fillStyle = '#15803d'; // Green bottom
                   ctx.fillRect(0, (oheight - margin * 2) * 0.6, owidth, (oheight - margin * 2) * 0.4);
                   
                   // Cabin / windshield
                   ctx.fillStyle = 'rgba(0,0,0,0.6)';
                   if (isRight) {
                       ctx.fillRect(owidth * 0.5, 2, owidth * 0.4, oheight - margin * 2 - 4);
                   } else {
                       ctx.fillRect(owidth * 0.1, 2, owidth * 0.4, oheight - margin * 2 - 4);
                   }

                   // Wheels
                   ctx.fillStyle = '#111827';
                   ctx.fillRect(isRight ? owidth - 10 : 2, -2, 8, 4);
                   ctx.fillRect(isRight ? owidth - 10 : 2, oheight - margin * 2 - 2, 8, 4);
               } else if (obs.type === 'BIKE') {
                   // Bike Drawing
                   const innerHeight = oheight - margin * 2;
                   
                   // Wheels
                   ctx.fillStyle = '#111827'; // Dark tires
                   ctx.beginPath();
                   ctx.arc(owidth * 0.2, innerHeight / 2 + 4, 6, 0, Math.PI * 2);
                   ctx.fill();
                   
                   ctx.beginPath();
                   ctx.arc(owidth * 0.8, innerHeight / 2 + 4, 6, 0, Math.PI * 2);
                   ctx.fill();

                   // Body frame
                   ctx.strokeStyle = color;
                   ctx.lineWidth = 4;
                   ctx.beginPath();
                   ctx.moveTo(owidth * 0.2, innerHeight / 2 + 4);
                   ctx.lineTo(owidth * 0.45, innerHeight / 2 - 2);
                   ctx.lineTo(owidth * 0.8, innerHeight / 2 + 4);
                   ctx.stroke();

                   // Tank / Center structure
                   ctx.fillStyle = color;
                   ctx.fillRect(owidth * 0.4, innerHeight / 2 - 6, 8, 8);

                   // Front handles
                   ctx.strokeStyle = '#9ca3af'; // silver
                   ctx.lineWidth = 2;
                   ctx.beginPath();
                   if (isRight) {
                       ctx.moveTo(owidth * 0.8, innerHeight / 2 + 4);
                       ctx.lineTo(owidth * 0.7, innerHeight / 2 - 12);
                   } else {
                       ctx.moveTo(owidth * 0.2, innerHeight / 2 + 4);
                       ctx.lineTo(owidth * 0.3, innerHeight / 2 - 12);
                   }
                   ctx.stroke();

                   // Rider (human shape leaning forward slightly)
                   ctx.fillStyle = '#3b82f6'; // Blue shirt
                   ctx.beginPath();
                   ctx.ellipse(owidth * 0.5, innerHeight / 2 - 8, 8, 6, isRight ? Math.PI/6 : -Math.PI/6, 0, Math.PI * 2);
                   ctx.fill();
                   
                   // Helmet
                   ctx.fillStyle = '#dc2626'; // red helmet
                   ctx.beginPath();
                   ctx.arc(owidth * 0.5, innerHeight / 2 - 14, 5, 0, Math.PI * 2);
                   ctx.fill();
                   
               } else if (obs.type === 'BEGGAR') {
                   // Beggar
                   ctx.fillStyle = '#78350f'; // Skin color (dark)
                   ctx.beginPath();
                   ctx.arc(owidth * 0.5, (oheight - margin * 2) / 2 - 12, 6, 0, Math.PI * 2);
                   ctx.fill();

                   // Ragged clothes
                   ctx.fillStyle = '#52525b'; // Zinc 600
                   ctx.beginPath();
                   ctx.roundRect(owidth * 0.5 - 8, (oheight - margin * 2) / 2 - 4, 16, 18, 4);
                   ctx.fill();

                   // Hand extended (begging)
                   ctx.fillStyle = '#78350f'; 
                   ctx.beginPath();
                   if (isRight) {
                      ctx.roundRect(owidth * 0.5 + 4, (oheight - margin * 2) / 2 - 2, 10, 4, 2);
                   } else {
                      ctx.roundRect(owidth * 0.5 - 14, (oheight - margin * 2) / 2 - 2, 10, 4, 2);
                   }
                   ctx.fill();
               } else {
                   // CAR, BUS, TRUCK Standard Blocky
                   ctx.shadowColor = color;
                   ctx.shadowBlur = 10;
                   ctx.fillStyle = color;
                   ctx.beginPath();
                   ctx.roundRect(0, 0, owidth, oheight - margin * 2, 6);
                   ctx.fill();
                   ctx.shadowBlur = 0;

                   ctx.fillStyle = 'rgba(0,0,0,0.3)';
                   ctx.fillRect(owidth/2 - 2, 0, 4, oheight - margin * 2);

                   // Windshield
                   ctx.fillStyle = 'rgba(0,0,0,0.5)';
                   if (isRight) {
                       ctx.fillRect(owidth * 0.7, 2, owidth * 0.2, oheight - margin * 2 - 4);
                       ctx.fillRect(owidth * 0.1, 2, owidth * 0.15, oheight - margin * 2 - 4);
                   } else {
                       ctx.fillRect(owidth * 0.1, 2, owidth * 0.2, oheight - margin * 2 - 4);
                       ctx.fillRect(owidth * 0.75, 2, owidth * 0.15, oheight - margin * 2 - 4);
                   }
               }
               ctx.restore();

               // Headlights based on direction
               if (isNightMode && obs.type !== 'BEGGAR') {
                  if (obs.direction === 1) { // right
                     const gradient = ctx.createLinearGradient(ox + owidth, oy + oheight/2, ox + owidth + 80, oy + oheight/2);
                     gradient.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
                     gradient.addColorStop(1, 'rgba(253, 224, 71, 0)');
                     
                     ctx.fillStyle = gradient;
                     ctx.beginPath();
                     ctx.moveTo(ox + owidth - 2, oy + margin + 2);
                     ctx.lineTo(ox + owidth + 80, oy - 25);
                     ctx.lineTo(ox + owidth + 80, oy + margin + 6);
                     ctx.fill();

                     ctx.beginPath();
                     ctx.moveTo(ox + owidth - 2, oy + oheight - margin - 2);
                     ctx.lineTo(ox + owidth + 80, oy + oheight + 25);
                     ctx.lineTo(ox + owidth + 80, oy + oheight - margin - 6);
                     ctx.fill();

                     ctx.shadowColor = '#fef08a';
                     ctx.shadowBlur = 10;
                     ctx.fillStyle = '#fef08a';
                     ctx.fillRect(ox + owidth - 4, oy + margin + 2, 4, 6);
                     ctx.fillRect(ox + owidth - 4, oy + oheight - margin - 8, 4, 6);
                     ctx.shadowBlur = 0;
                  } else { // left
                     const gradient = ctx.createLinearGradient(ox, oy + oheight/2, ox - 80, oy + oheight/2);
                     gradient.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
                     gradient.addColorStop(1, 'rgba(253, 224, 71, 0)');

                     ctx.fillStyle = gradient;
                     ctx.beginPath();
                     ctx.moveTo(ox + 2, oy + margin + 2);
                     ctx.lineTo(ox - 80, oy - 25);
                     ctx.lineTo(ox - 80, oy + margin + 6);
                     ctx.fill();

                     ctx.beginPath();
                     ctx.moveTo(ox + 2, oy + oheight - margin - 2);
                     ctx.lineTo(ox - 80, oy + oheight + 25);
                     ctx.lineTo(ox - 80, oy + oheight - margin - 6);
                     ctx.fill();

                     ctx.shadowColor = '#fef08a';
                     ctx.shadowBlur = 10;
                     ctx.fillStyle = '#fef08a';
                     ctx.fillRect(ox, oy + margin + 2, 4, 6);
                     ctx.fillRect(ox, oy + oheight - margin - 8, 4, 6);
                     ctx.shadowBlur = 0;
                  }
               }
            }
      }

      // Draw Player
      const px = offsetX + state.player.x * TILE_SIZE;
      const py = getScreenY(state.player.y);
      const isMovingOffset = state.player.moving ? 6 : 0;
      const pCenterX = px + TILE_SIZE / 2;
      const pCenterY = py + TILE_SIZE / 2 - isMovingOffset;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (state.isGameOver) {
         ctx.font = '36px Arial';
         ctx.fillText('💀', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      } else {
         // Player - Human in Shalwar Kameez
         const skinColor = '#d4a373';
         const clothesColor = '#f8fafc'; // light grey/white shalwar kameez
         
         ctx.save();
         ctx.translate(pCenterX, pCenterY);
         
         // Shadow
         ctx.fillStyle = 'rgba(0,0,0,0.5)';
         ctx.beginPath();
         ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
         ctx.fill();

         // Legs (Shalwar - Baggy pants)
         ctx.fillStyle = clothesColor;
         ctx.beginPath();
         if (state.player.moving) {
            ctx.roundRect(-10, 4, 8, 12, 3); // left leg forward
            ctx.roundRect(4, 2, 8, 12, 3);   // right leg back
         } else {
            ctx.roundRect(-8, 4, 7, 12, 3); // left leg
            ctx.roundRect(2, 4, 7, 12, 3);  // right leg
         }
         ctx.fill();

         // Torso (Kameez - long shirt)
         ctx.beginPath();
         ctx.roundRect(-12, -10, 24, 18, 5);
         ctx.fill();

         // Arms
         ctx.fillStyle = clothesColor;
         if (state.player.moving) {
            // swing arms
            ctx.beginPath();
            ctx.roundRect(-16, -10, 6, 14, 3);
            ctx.roundRect(12, -10, 6, 14, 3);
            ctx.fill();
         } else {
            ctx.beginPath();
            ctx.roundRect(-14, -8, 5, 12, 3);
            ctx.roundRect(10, -8, 5, 12, 3);
            ctx.fill();
         }

         // Head
         ctx.fillStyle = skinColor;
         ctx.beginPath();
         ctx.arc(0, -16, 7, 0, Math.PI * 2);
         ctx.fill();

         // Hair (Dark)
         ctx.fillStyle = '#111827';
         ctx.beginPath();
         ctx.arc(0, -17, 7, Math.PI, Math.PI * 2);
         ctx.fill();

         ctx.restore();
      }

      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [engine, isNightMode]);

  return (
    <canvas 
      ref={canvasRef}
      width={1000}
      height={800}
      className="w-full h-full object-cover max-w-full max-h-full"
    />
  );
};

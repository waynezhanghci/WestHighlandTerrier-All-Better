import React, { useEffect, useState } from 'react';
import { GameState } from '../types';

interface GameUIProps {
  gameState: GameState;
}

// Mini-component for floating hearts
const ScoreHeartEffect = () => {
    const [hearts, setHearts] = useState<{id: number, left: number}[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const id = Date.now();
            // Random horizontal position around the text
            const left = Math.random() * 60; // 0 to 60px roughly
            setHearts(prev => [...prev.slice(-4), { id, left }]);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none">
            {hearts.map(h => (
                <div 
                    key={h.id}
                    className="absolute text-pink-500 animate-[floatUpFade_2s_ease-out_forwards]"
                    style={{ 
                        left: `${h.left}%`,
                        top: '-10px',
                    }}
                >
                    {/* CSS Pixel Heart */}
                     <div className="w-3 h-3 grid grid-cols-5 grid-rows-4 gap-0 scale-75">
                         <div className="col-start-2 bg-pink-500"/><div className="col-start-4 bg-pink-500"/>
                         <div className="col-span-5 row-start-2 bg-pink-500 h-full"/>
                         <div className="col-start-2 col-span-3 row-start-3 bg-pink-500"/>
                         <div className="col-start-3 row-start-4 bg-pink-500"/>
                     </div>
                </div>
            ))}
            <style>{`
                @keyframes floatUpFade {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export const GameUI: React.FC<GameUIProps> = ({ 
  gameState, 
}) => {
  return (
    <>
        {/* TOP LEFT: Score Board */}
        <div className="absolute top-4 left-4 z-50 pointer-events-none">
            <div className="relative flex flex-col items-center justify-center min-w-[100px] whitespace-nowrap bg-yellow-50/90 backdrop-blur rounded-xl border-4 border-yellow-400 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] p-2 px-4">
                <ScoreHeartEffect />
                <span className="text-[10px] text-yellow-700 uppercase tracking-widest font-bold z-10 mb-1">HAPPY</span>
                <span className="text-3xl font-black text-slate-800 z-10 leading-none">
                    {gameState.score >= 99999 ? (
                        <span className="text-xl text-pink-600">Forever Love!</span>
                    ) : (
                        gameState.score
                    )}
                </span>
            </div>
        </div>
    </>
  );
};
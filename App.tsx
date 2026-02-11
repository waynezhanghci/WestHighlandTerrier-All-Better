import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { GameState, DogState, ToyType } from './types';

export default function App() {
  const [score, setScore] = useState(0);
  const [dogState, setDogState] = useState<DogState>(DogState.IDLE);

  const gameState: GameState = {
    score,
    dogState,
    currentToy: ToyType.BALL // Default placeholder, logic now handled in canvas scenes
  };

  return (
    <div 
      className="w-screen h-screen overflow-hidden bg-sky-400 select-none"
      style={{ fontFamily: '"Press Start 2P", cursive' }}
    >
      <GameCanvas 
        score={score}
        setScore={setScore}
        dogState={dogState}
        setDogState={setDogState}
      />
      
      <GameUI 
        gameState={gameState}
      />
    </div>
  );
}
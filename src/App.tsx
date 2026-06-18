import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import { generatePuzzle } from './utils/puzzle';
import type { RoundResult } from './types';

export interface RoundData {
  target: number;
  numbers: number[];
  solution: string;
}

function makeRounds(): RoundData[] {
  return [generatePuzzle(), generatePuzzle(), generatePuzzle()];
}

type Screen = 'home' | 'game' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [playerRounds, setPlayerRounds] = useState<RoundResult[]>([]);
  const [cpuRounds, setCpuRounds] = useState<RoundResult[]>([]);
  const [winner, setWinner] = useState<'player' | 'cpu'>('player');

  function startGame() {
    setRounds(makeRounds());
    setPlayerRounds([]);
    setCpuRounds([]);
    setScreen('game');
  }

  function handleGameEnd(
    finalPlayerRounds: RoundResult[],
    finalCpuRounds: RoundResult[],
    finalWinner: 'player' | 'cpu'
  ) {
    setPlayerRounds(finalPlayerRounds);
    setCpuRounds(finalCpuRounds);
    setWinner(finalWinner);
    setScreen('result');
  }

  if (screen === 'home') {
    return <HomeScreen onStart={startGame} />;
  }

  if (screen === 'result') {
    return (
      <ResultScreen
        winner={winner}
        playerRounds={playerRounds}
        cpuRounds={cpuRounds}
        roundSolutions={rounds.map((r) => `${r.solution} = ${r.target}`)}
        onClose={() => setScreen('home')}
      />
    );
  }

  return (
    <GameScreen
      rounds={rounds}
      onGameEnd={handleGameEnd}
    />
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import type { Operator, RoundResult, Tile, InputState } from '../types';
import {
  buildInitialInputState,
  performStep,
  undoStep,
  resetInputState,
  isSolved,
  cpuSolve,
} from '../utils/puzzle';
import type { RoundData } from '../App';

// CPU takes 8–18 seconds per round (avg ~13s)
const CPU_DELAY_MS = () => 8000 + Math.random() * 10000;

interface Props {
  rounds: RoundData[];
  onGameEnd: (
    playerRounds: RoundResult[],
    cpuRounds: RoundResult[],
    winner: 'player' | 'cpu'
  ) => void;
}

// Per-player state for one game
interface PlayerState {
  round: number;       // which round (0-2) this player is currently on
  results: RoundResult[];
  startTime: number;   // when current round started
  done: boolean;       // finished all rounds or triggered end
}

export default function GameScreen({ rounds, onGameEnd }: Props) {
  // Player input state (changes each round)
  const [inputState, setInputState] = useState<InputState>(() =>
    buildInitialInputState(rounds[0].numbers)
  );
  const [shake, setShake] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Per-player tracking
  const playerRef = useRef<PlayerState>({
    round: 0,
    results: [],
    startTime: Date.now(),
    done: false,
  });
  const cpuRef = useRef<PlayerState>({
    round: 0,
    results: [],
    startTime: Date.now(),
    done: false,
  });

  // Force re-renders when cpu state changes
  const [cpuResults, setCpuResults] = useState<RoundResult[]>([]);
  const [playerResults, setPlayerResults] = useState<RoundResult[]>([]);
  const [playerRound, setPlayerRound] = useState(0);

  const gameEndedRef = useRef(false);

  // Check if the game should end and call onGameEnd
  const checkEnd = useCallback(() => {
    if (gameEndedRef.current) return;
    const p = playerRef.current;
    const c = cpuRef.current;
    const pSolved = p.results.filter((r) => r.solved).length;
    const cSolved = c.results.filter((r) => r.solved).length;

    // Game ends when either has 3 wins, or both finished all 3 rounds
    const pDone = p.round >= 3;
    const cDone = c.round >= 3;

    if (pSolved >= 3 || cSolved >= 3 || (pDone && cDone)) {
      gameEndedRef.current = true;
      // Pad shorter results with nulls
      const fullP = padResults(p.results, rounds.length);
      const fullC = padResults(c.results, rounds.length);
      const winner = pSolved >= cSolved ? 'player' : 'cpu';
      onGameEnd(fullP, fullC, winner);
    }
  }, [onGameEnd, rounds.length]);

  function padResults(results: RoundResult[], len: number): RoundResult[] {
    const copy = [...results];
    while (copy.length < len) copy.push({ timeSeconds: null, solved: false });
    return copy;
  }

  // Timer for player's current round
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - playerRef.current.startTime;
      setElapsedMs(elapsed);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Launch CPU solver for a given round
  const launchCpu = useCallback((roundIdx: number) => {
    if (roundIdx >= rounds.length) return;
    const { numbers, target } = rounds[roundIdx];
    const startTime = Date.now();
    cpuRef.current.startTime = startTime;

    cpuSolve(numbers, target, CPU_DELAY_MS()).then((sol) => {
      if (gameEndedRef.current) return;
      if (cpuRef.current.round !== roundIdx) return; // already moved on

      const elapsed = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
      const result: RoundResult = { timeSeconds: sol ? elapsed : null, solved: !!sol };
      cpuRef.current.results = [...cpuRef.current.results, result];
      cpuRef.current.round = roundIdx + 1;
      setCpuResults([...cpuRef.current.results]);
      checkEnd();

      // CPU advances to next round immediately
      if (sol && cpuRef.current.round < rounds.length) {
        launchCpu(cpuRef.current.round);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, checkEnd]);

  // Start CPU for round 0 on mount
  useEffect(() => {
    launchCpu(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Player advances to next round
  function advancePlayerRound(newResults: RoundResult[]) {
    const nextRound = playerRef.current.round + 1;
    playerRef.current.results = newResults;
    playerRef.current.round = nextRound;
    playerRef.current.startTime = Date.now();

    setPlayerResults([...newResults]);
    setPlayerRound(nextRound);
    setElapsedMs(0);

    if (nextRound < rounds.length) {
      setInputState(buildInitialInputState(rounds[nextRound].numbers));
    }

    checkEnd();
  }

  // Handle tile selection
  function handleTileClick(tile: Tile) {
    const s = inputState;

    // Phase 1: no first tile selected yet → select as first
    if (!s.selectedFirst) {
      setInputState({ ...s, selectedFirst: tile });
      return;
    }

    // Phase 2: first tile selected, no op yet
    // Clicking same tile → deselect
    if (s.selectedFirst.id === tile.id) {
      setInputState({ ...s, selectedFirst: null });
      return;
    }

    // Clicking different tile without op → swap first selection
    if (!s.selectedOp) {
      setInputState({ ...s, selectedFirst: tile });
      return;
    }

    // Phase 3: first tile + op selected → this is the second tile, perform operation
    if (s.selectedFirst.id === tile.id) return; // same tile, ignore

    const res = performStep(s, tile);
    if (!res) {
      triggerShake();
      return;
    }

    const solved = isSolved(res.newState, rounds[playerRef.current.round].target);

    // Auto-select the result tile so the user can immediately pick the next operator
    const newState: InputState = {
      ...res.newState,
      selectedFirst: !solved && res.newState.tiles.length > 1 ? res.step.result : null,
      selectedOp: null,
    };
    setInputState(newState);

    if (solved) {
      const elapsed = parseFloat(((Date.now() - playerRef.current.startTime) / 1000).toFixed(1));
      const newResults = [...playerRef.current.results, { timeSeconds: elapsed, solved: true }];
      advancePlayerRound(newResults);
    }
  }

  function handleOpClick(op: Operator) {
    if (!inputState.selectedFirst) return;
    // Toggle op selection
    if (inputState.selectedOp === op) {
      setInputState({ ...inputState, selectedOp: null });
    } else {
      setInputState({ ...inputState, selectedOp: op });
    }
  }

  function handleUndo() {
    setInputState(undoStep(inputState));
  }

  function handleReset() {
    setInputState(resetInputState(rounds[playerRef.current.round].numbers));
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const currentRoundIdx = playerRef.current.round;
  const isGameOver = currentRoundIdx >= rounds.length;
  const { target } = isGameOver ? rounds[rounds.length - 1] : rounds[currentRoundIdx];
  const { tiles, selectedFirst, selectedOp } = inputState;

  // Determine input phase for UI hints
  const phase: 'pick-first' | 'pick-op' | 'pick-second' =
    !selectedFirst ? 'pick-first' :
    !selectedOp ? 'pick-op' : 'pick-second';

  function renderScoreCard(label: string, results: RoundResult[], isPlayer: boolean) {
    const isCurrentlyThinking = !isPlayer && cpuRef.current.round < rounds.length;
    return (
      <div className={`rounded-2xl p-3 flex-1 ${isPlayer ? 'bg-blue-50 border border-blue-100' : 'bg-slate-100 border border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm">
            {isPlayer ? '🙂' : '🤖'}
          </div>
          <span className="font-semibold text-slate-700 text-xs">{label}</span>
          {isCurrentlyThinking && (
            <span className="ml-auto text-[10px] text-blue-400 animate-pulse">思考中</span>
          )}
        </div>
        {[0, 1, 2].map((i) => {
          const r = results[i];
          return (
            <div key={i} className="flex items-center text-xs text-slate-600 mb-0.5">
              <span className="w-4 text-slate-400">{i + 1}.</span>
              {r && r.solved ? (
                <span className="font-semibold text-slate-800">
                  {r.timeSeconds} <span className="font-normal text-slate-400">秒</span>
                </span>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Hint text based on phase
  function phaseHint() {
    if (isGameOver) return '完了！';
    if (phase === 'pick-first') return '計算する数字を選んでください';
    if (phase === 'pick-op') return '演算子を選んでください';
    return `${selectedFirst!.label} ${selectedOp} ? ← 2つ目の数字を選んでください`;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white px-4 pt-4 pb-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-xs">ラウンド {Math.min(currentRoundIdx + 1, 3)} / 3</span>
        <span className="text-slate-600 font-semibold tabular-nums text-sm">
          {elapsedSec} <span className="text-slate-400 font-normal text-xs">秒</span>
        </span>
      </div>

      {/* Score cards */}
      <div className="flex gap-3 mb-5">
        {renderScoreCard('あなた', playerResults, true)}
        {renderScoreCard('CPU', cpuResults, false)}
      </div>

      {/* Target */}
      <div className="flex flex-col items-center mb-5">
        <div className={`text-6xl font-black text-slate-800 tracking-tight leading-none mb-3 ${shake ? 'animate-shake text-red-500' : ''}`}>
          {target}
        </div>
        <p className="text-xs text-slate-400 text-center min-h-[16px]">{phaseHint()}</p>
      </div>

      {/* Tiles */}
      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-2 text-center">残りの数字</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {tiles.map((tile) => {
            const isFirst = selectedFirst?.id === tile.id;
            const isSecondPhase = phase === 'pick-second';
            const isSelectableSecond = isSecondPhase && !isFirst;
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className={`
                  min-w-[72px] px-3 py-4 rounded-2xl text-xl font-bold border-2 transition-all duration-150
                  ${isFirst
                    ? 'bg-blue-500 border-blue-500 text-white scale-105 shadow-md'
                    : isSelectableSecond
                    ? 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50 active:scale-95 shadow-sm'
                    : phase === 'pick-first'
                    ? 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50 active:scale-95 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                  }
                `}
              >
                <span className="block text-center">{tile.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Operators */}
      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-2 text-center">演算子</p>
        <div className="grid grid-cols-4 gap-3">
          {(['+', '-', '×', '÷'] as Operator[]).map((op) => {
            const active = selectedOp === op;
            const enabled = phase === 'pick-op' || phase === 'pick-second';
            return (
              <button
                key={op}
                onClick={() => handleOpClick(op)}
                disabled={!enabled}
                className={`
                  h-14 rounded-full text-xl font-semibold transition-all duration-150
                  ${active
                    ? 'bg-blue-500 text-white scale-105 shadow-md'
                    : enabled
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                {op}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-semibold py-3 rounded-2xl text-sm transition-all duration-150"
        >
          <RotateCcw size={16} />
          リセット
        </button>
        <button
          onClick={handleUndo}
          disabled={inputState.steps.length === 0 && !inputState.selectedFirst}
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-semibold py-3 rounded-2xl text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 size={16} />
          戻す
        </button>
      </div>
    </div>
  );
}

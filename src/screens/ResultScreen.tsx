import type { RoundResult } from '../types';

interface Props {
  winner: 'player' | 'cpu';
  playerRounds: RoundResult[];
  cpuRounds: RoundResult[];
  roundSolutions: string[];
  onClose: () => void;
}

export default function ResultScreen({ winner, playerRounds, cpuRounds, roundSolutions, onClose }: Props) {
  const isWin = winner === 'player';

  return (
    <div className="flex flex-col min-h-screen bg-white px-4 pt-6 pb-8 relative overflow-hidden">
      {/* Confetti-like decorative elements */}
      {isWin && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm opacity-60"
              style={{
                background: ['#93c5fd', '#bfdbfe', '#60a5fa', '#dbeafe'][i % 4],
                left: `${(i * 13 + 5) % 100}%`,
                top: `${(i * 17 + 3) % 60}%`,
                transform: `rotate(${i * 25}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Score cards */}
      <div className="flex gap-3 mb-8 relative z-10">
        <div className={`rounded-2xl p-4 flex-1 ${isWin ? 'bg-blue-100 border border-blue-200' : 'bg-slate-100 border border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">🙂</div>
            <span className="font-semibold text-slate-700 text-sm">あなた</span>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center text-sm mb-1">
              <span className="w-5 text-slate-400">{i + 1}.</span>
              {playerRounds[i] ? (
                <span className="font-semibold text-slate-800">{playerRounds[i].timeSeconds} <span className="font-normal text-slate-500 text-xs">秒</span></span>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          ))}
        </div>

        <div className={`rounded-2xl p-4 flex-1 ${!isWin ? 'bg-slate-200 border border-slate-300' : 'bg-slate-100 border border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">🤖</div>
            <span className="font-semibold text-slate-700 text-sm">CPU</span>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center text-sm mb-1">
              <span className="w-5 text-slate-400">{i + 1}.</span>
              {cpuRounds[i] ? (
                <span className="font-semibold text-slate-800">{cpuRounds[i].timeSeconds} <span className="font-normal text-slate-500 text-xs">秒</span></span>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="text-center mb-8 relative z-10">
        <p className="text-3xl font-black text-slate-800">
          {isWin ? 'あなたの勝利！' : 'CPUの勝利'}
        </p>
      </div>

      {/* Solutions */}
      <div className="bg-slate-50 rounded-2xl p-5 mb-8 relative z-10">
        <h3 className="font-bold text-slate-700 mb-4 text-sm">解答例</h3>
        <div className="space-y-3">
          {roundSolutions.map((sol, i) => (
            <div key={i} className="flex items-baseline gap-2 text-sm">
              <span className="text-slate-400 w-4">{i + 1}.</span>
              <span className="font-semibold text-slate-800">{sol}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 relative z-10 mt-auto">
        <button
          onClick={onClose}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-base transition-all duration-150"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

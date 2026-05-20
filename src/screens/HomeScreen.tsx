interface Props {
  onStart: () => void;
}

export default function HomeScreen({ onStart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 px-6">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight text-slate-800 mb-2">
          make <span className="text-blue-500">n</span>
        </h1>
        <p className="text-slate-500 text-sm">計算パズルバトル</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-sm mb-10">
        <h2 className="font-bold text-slate-700 mb-4 text-base">遊び方</h2>
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>ランダムな<strong>1桁の数字4つ</strong>と<strong>2桁の目標数字</strong>が与えられます</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>4つの数字を<strong>すべて使って</strong>、四則演算で目標の数字を作ります</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>3ラウンド行い、先に<strong>3問正解</strong>した方が勝ち！</span>
          </li>
        </ol>
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-sm bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg transition-all duration-150 shadow-md"
      >
        CPUと対戦する
      </button>
    </div>
  );
}

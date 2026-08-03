import { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, Difficulty, DIFFICULTIES } from './utils/gameTypes';
import { HighScore, getHighScores, saveHighScore } from './utils/highscores';
import { playGameOver, playStart, playCountdown } from './utils/sounds';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>(getHighScores());
  const [showHighScores, setShowHighScores] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const gameOverTriggered = useRef(false);

  const config = DIFFICULTIES[difficulty];

  const accuracy = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 0;
  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  const startGame = useCallback(() => {
    setCountdown(3);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTotalClicks(0);
    setReactionTimes([]);
    setCombo(0);
    gameOverTriggered.current = false;

    playCountdown();
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playCountdown();
      } else {
        clearInterval(interval);
        setCountdown(0);
        setIsPlaying(true);
        setGameState('playing');
        setTimeLeft(config.gameDuration);
        playStart();
      }
    }, 700);
  }, [config.gameDuration]);

  const handleScoreUpdate = useCallback((
    newScore: number,
    newHits: number,
    newMisses: number,
    newTotalClicks: number,
    newReactionTimes: number[]
  ) => {
    setScore(newScore);
    setHits(newHits);
    setMisses(newMisses);
    setTotalClicks(newTotalClicks);
    setReactionTimes(newReactionTimes);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setTimeLeft(time);
  }, []);

  const handleGameOver = useCallback(() => {
    if (gameOverTriggered.current) return;
    gameOverTriggered.current = true;
    setIsPlaying(false);
    setGameState('gameover');
    playGameOver();
  }, []);

  // Save high score when game is over
  useEffect(() => {
    if (gameState === 'gameover' && score > 0) {
      const entry: HighScore = {
        score,
        accuracy,
        avgReaction,
        date: new Date().toLocaleDateString(),
        difficulty: config.label,
      };
      const updated = saveHighScore(entry);
      setHighScores(updated);
    }
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComboUpdate = useCallback((newCombo: number) => {
    setCombo(newCombo);
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'playing' || gameState === 'paused') {
          togglePause();
        }
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (gameState === 'menu' && !countdown) {
          e.preventDefault();
          startGame();
        } else if (gameState === 'gameover') {
          e.preventDefault();
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, togglePause, startGame, countdown]);

  const formatTime = (t: number) => {
    const s = Math.ceil(t);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0c0c14] select-none font-sans">
      {/* Game Canvas - always rendered for smooth transitions */}
      <GameCanvas
        config={config}
        isPaused={gameState === 'paused'}
        isPlaying={isPlaying}
        onScoreUpdate={handleScoreUpdate}
        onTimeUpdate={handleTimeUpdate}
        onGameOver={handleGameOver}
        onComboUpdate={handleComboUpdate}
      />

      {/* HUD - during gameplay */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm">
            {/* Score */}
            <div className="flex items-center gap-4">
              <div className="text-white">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Score</div>
                <div className="text-2xl font-bold tabular-nums leading-tight">{score}</div>
              </div>
              {combo >= 3 && (
                <div className={`px-2 py-0.5 rounded text-sm font-bold animate-pulse ${
                  combo >= 10 ? 'bg-yellow-500/30 text-yellow-300' :
                  combo >= 5 ? 'bg-green-500/30 text-green-300' :
                  'bg-blue-500/30 text-blue-300'
                }`}>
                  🔥 x{combo}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className={`text-3xl font-bold tabular-nums ${
                timeLeft <= 5 ? 'text-red-400 animate-pulse' :
                timeLeft <= 10 ? 'text-yellow-400' :
                'text-white'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-right text-white">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Accuracy</div>
                <div className="text-lg font-bold tabular-nums leading-tight">{accuracy}%</div>
              </div>
              <div className="text-right text-white">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Avg RT</div>
                <div className="text-lg font-bold tabular-nums leading-tight">{avgReaction}ms</div>
              </div>
              <button
                className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                onClick={togglePause}
              >
                {gameState === 'paused' ? '▶' : '⏸'}
              </button>
            </div>
          </div>
          
          {/* Time bar */}
          <div className="h-1 bg-black/30">
            <div
              className={`h-full transition-all duration-100 ${
                timeLeft <= 5 ? 'bg-red-500' :
                timeLeft <= 10 ? 'bg-yellow-500' :
                'bg-cyan-400'
              }`}
              style={{ width: `${(timeLeft / config.gameDuration) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Countdown */}
      {countdown > 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="text-[120px] font-black text-white animate-ping opacity-90" key={countdown}>
              {countdown}
            </div>
            <div className="text-white/60 text-xl mt-4">Get Ready!</div>
          </div>
        </div>
      )}

      {/* START SCREEN */}
      {gameState === 'menu' && countdown === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c14] via-[#13132a] to-[#0c0c14]" />
          
          {/* Animated background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative z-10 text-center px-6 max-w-lg w-full">
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/30 mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-tight">
                AIM BLITZ
              </h1>
              <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">Test Your Reflexes</p>
            </div>

            {/* Difficulty selector */}
            <div className="mb-8">
              <div className="text-white/50 text-xs uppercase tracking-widest mb-3 font-semibold">Difficulty</div>
              <div className="flex gap-2 justify-center">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                      difficulty === d
                        ? d === 'easy' ? 'bg-green-500/20 text-green-300 ring-2 ring-green-500/40 shadow-lg shadow-green-500/20'
                        : d === 'normal' ? 'bg-yellow-500/20 text-yellow-300 ring-2 ring-yellow-500/40 shadow-lg shadow-yellow-500/20'
                        : 'bg-red-500/20 text-red-300 ring-2 ring-red-500/40 shadow-lg shadow-red-500/20'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {d === 'easy' ? '⭐' : d === 'normal' ? '⭐⭐' : '⭐⭐⭐'} {DIFFICULTIES[d].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-white/30 text-xs">
                {config.gameDuration}s • Targets: {config.minRadius}-{config.maxRadius}px •
                Spawn: {config.spawnInterval}s
              </div>
            </div>

            {/* Play button */}
            <button
              onClick={startGame}
              className="group relative w-full max-w-xs mx-auto block px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-lg uppercase tracking-wider shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span className="relative z-10">Start Game</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>

            <div className="mt-4 text-white/30 text-xs">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50 font-mono">SPACE</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50 font-mono">ENTER</kbd> to start
            </div>

            {/* High Scores toggle */}
            <button
              onClick={() => setShowHighScores(!showHighScores)}
              className="mt-6 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              🏆 {showHighScores ? 'Hide' : 'Show'} High Scores
            </button>

            {showHighScores && (
              <div className="mt-4 bg-white/5 rounded-xl p-4 max-h-60 overflow-y-auto backdrop-blur-sm border border-white/10">
                {highScores.length === 0 ? (
                  <div className="text-white/30 text-sm py-4">No scores yet. Play a game!</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-xs uppercase tracking-wider">
                        <th className="text-left pb-2">#</th>
                        <th className="text-left pb-2">Score</th>
                        <th className="text-left pb-2">Acc%</th>
                        <th className="text-left pb-2">RT</th>
                        <th className="text-left pb-2">Diff</th>
                        <th className="text-right pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highScores.map((hs, i) => (
                        <tr key={i} className={`text-white/70 ${i === 0 ? 'text-yellow-300' : ''}`}>
                          <td className="py-1">{i === 0 ? '👑' : i + 1}</td>
                          <td className="py-1 font-bold tabular-nums">{hs.score}</td>
                          <td className="py-1 tabular-nums">{hs.accuracy}%</td>
                          <td className="py-1 tabular-nums">{hs.avgReaction}ms</td>
                          <td className="py-1">{hs.difficulty}</td>
                          <td className="py-1 text-right text-white/40">{hs.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Controls info */}
            <div className="mt-6 flex justify-center gap-6 text-white/25 text-xs">
              <span>🖱️ Click targets</span>
              <span>⌨️ ESC to pause</span>
              <span>📱 Touch support</span>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center px-6 max-w-md w-full animate-[fadeIn_0.3s_ease-out]">
            <div className="text-6xl mb-4">
              {accuracy >= 80 ? '🏆' : accuracy >= 50 ? '🎯' : '💪'}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">
              {accuracy >= 80 ? 'AMAZING!' : accuracy >= 50 ? 'NICE WORK!' : 'KEEP TRYING!'}
            </h2>
            <p className="text-white/40 text-sm mb-6 uppercase tracking-wider">{config.label} Mode</p>

            {/* Score card */}
            <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10 backdrop-blur-sm">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
                {score}
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider mb-4">Final Score</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl font-bold text-white tabular-nums">{accuracy}%</div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Accuracy</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl font-bold text-white tabular-nums">{avgReaction}ms</div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Avg Reaction</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-400 tabular-nums">{hits}</div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Hits</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-400 tabular-nums">{misses}</div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Misses</div>
                </div>
              </div>

              {reactionTimes.length > 0 && (
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div>
                    <span className="text-white/40">Best: </span>
                    <span className="text-green-400 font-bold tabular-nums">{Math.round(Math.min(...reactionTimes))}ms</span>
                  </div>
                  <div>
                    <span className="text-white/40">Worst: </span>
                    <span className="text-red-400 font-bold tabular-nums">{Math.round(Math.max(...reactionTimes))}ms</span>
                  </div>
                </div>
              )}

              {highScores.length > 0 && highScores[0].score === score && (
                <div className="mt-4 px-3 py-1.5 bg-yellow-500/20 rounded-lg inline-block">
                  <span className="text-yellow-300 font-bold text-sm">👑 New High Score!</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={startGame}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  setGameState('menu');
                  setIsPlaying(false);
                }}
                className="px-6 py-3 rounded-xl bg-white/10 text-white/70 font-bold uppercase tracking-wider hover:bg-white/20 hover:text-white transition-all duration-200"
              >
                Menu
              </button>
            </div>

            <div className="mt-3 text-white/30 text-xs">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50 font-mono">ENTER</kbd> to play again
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { ShieldCheck, Lock, Key, AlertTriangle, Fingerprint, Terminal, ArrowRight, RefreshCw, Server, ShieldAlert, CheckCircle, Database, Skull, MousePointer2, Trophy, Bug, Siren, Code, Cpu, Eye, Zap, Globe, Network, XCircle, Activity, Wifi } from 'lucide-react';

// --- GAME STATE TYPES ---
type GameState = 'intro' | 'playing' | 'victory' | 'failed';
type LevelType = 'entropy' | 'matching' | 'maze' | 'phishing' | 'sequence' | 'code' | 'neural' | 'ddos' | 'ports';

interface LevelConfig {
  id: LevelType;
  title: string;
  description: string;
  hint: string;
}

const LEVELS: LevelConfig[] = [
  { id: 'entropy', title: 'Entropy Injection', description: 'Override the brute-force attack with superior entropy.', hint: 'Target: 128 bits. Use symbols and length > 16.' },
  { id: 'matching', title: 'Checksum Alignment', description: 'Re-align the data blocks before the corruption spreads.', hint: 'Blocks fade over time. Memorize the hex values.' },
  { id: 'maze', title: 'Air-Gap Routing', description: 'Route the payload to Cold Storage. Avoid the Hunter Bot.', hint: 'The Hunter moves when you move. It cannot pass through red zones.' },
  { id: 'phishing', title: 'Packet Inspection', description: 'Filter out malicious request headers.', hint: 'Watch for homoglyphs (e.g. g0ogle.com).' },
  { id: 'code', title: 'Zero-Day Patch', description: 'Audit the source code for critical vulnerabilities.', hint: 'Look for injection flaws and hardcoded secrets.' },
  { id: 'sequence', title: '2FA Handshake', description: 'Synchronize with the rolling authentication token.', hint: 'Pattern speed increases with each success.' },
  { id: 'neural', title: 'Neural Alignment', description: 'Stabilize the TinyBERT Attention Mechanism.', hint: 'Balance Query/Key/Value weights to sum to 1.0.' },
  { id: 'ddos', title: 'DDoS Mitigation', description: 'Scrub malicious traffic from the live stream.', hint: 'Block Skulls/Bots. Allow Users. Speed increases.' },
  { id: 'ports', title: 'Port Hardening', description: 'Close vulnerable network ports exposed to the public.', hint: 'Click the glowing green ports to secure them. Don\'t let the bar fill.' },
];

export const SecurityGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [hardMode, setHardMode] = useState(false);

  const handleLevelComplete = (points: number) => {
    setScore(prev => prev + (hardMode ? points * 1.5 : points));
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
    } else {
      setGameState('victory');
    }
  };

  const handleLevelFail = () => {
    setGameState('failed');
  };

  const resetGame = () => {
    setGameState('playing');
    setCurrentLevelIdx(0);
    setScore(0);
  };

  if (gameState === 'intro') return <IntroScreen onStart={() => setGameState('playing')} hardMode={hardMode} setHardMode={setHardMode} />;
  if (gameState === 'victory') return <VictoryScreen score={score} onRestart={resetGame} hardMode={hardMode} />;
  if (gameState === 'failed') return <FailScreen level={LEVELS[currentLevelIdx]} onRetry={resetGame} />;

  const currentLevel = LEVELS[currentLevelIdx];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 p-4">
       {/* HUD */}
       <div className="flex items-center justify-between mb-8 bg-slate-900/80 p-4 rounded-2xl border border-white/5 backdrop-blur-md relative overflow-hidden">
           <div className={`absolute top-0 left-0 w-1 h-full ${hardMode ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
           <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-bold font-mono text-lg ${hardMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                   0{currentLevelIdx + 1}
               </div>
               <div>
                   <h2 className="text-white font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                       {currentLevel.title}
                       {hardMode && <span className="text-[9px] bg-red-500 text-white px-1 rounded">HARD</span>}
                   </h2>
                   <div className={`text-xs font-mono flex items-center gap-2 ${hardMode ? 'text-red-400' : 'text-emerald-400'}`}>
                       <Terminal size={10} /> {currentLevel.description}
                   </div>
               </div>
           </div>
           <div className="text-right">
               <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">System Integrity</div>
               <div className={`text-2xl font-mono ${hardMode ? 'text-red-400' : 'text-emerald-400'}`}>{Math.floor(score).toString().padStart(4, '0')}</div>
           </div>
       </div>

       {/* Level Container */}
       <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative min-h-[450px] flex flex-col">
           <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
           
           <div className="flex-1 p-6 md:p-10 relative z-10 flex flex-col justify-center">
               {currentLevel.id === 'entropy' && <LevelEntropy onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'matching' && <LevelMatching onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'maze' && <LevelMaze onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'phishing' && <LevelPhishing onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'code' && <LevelCode onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'sequence' && <LevelSequence onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'neural' && <LevelNeural onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'ddos' && <LevelDDoS onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
               {currentLevel.id === 'ports' && <LevelPorts onComplete={handleLevelComplete} onFail={handleLevelFail} hardMode={hardMode} />}
           </div>

           {/* Hint Footer */}
           {!hardMode && (
               <div className="bg-slate-950 p-4 border-t border-white/5 flex items-center gap-3 text-xs text-slate-500 font-mono">
                   <Bug size={12} className="text-emerald-500" />
                   <span>DEBUG_HINT: {currentLevel.hint}</span>
               </div>
           )}
       </div>
    </div>
  );
};

// --- SCREENS ---

const IntroScreen = ({ onStart, hardMode, setHardMode }: { onStart: () => void, hardMode: boolean, setHardMode: (v: boolean) => void }) => (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative group">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <Siren size={48} className="text-red-500 relative z-10 group-hover:scale-110 transition-transform" />
        </div>
        <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-4">INTRUSION DETECTED</h1>
            <p className="text-slate-400 text-lg leading-relaxed font-mono">
                Advanced Persistent Threat (APT) group detected.<br/>
                Initiate counter-offensive measures immediately.
            </p>
        </div>
        
        <div className="flex justify-center gap-4">
            <button 
                onClick={() => setHardMode(false)}
                className={`px-6 py-3 rounded-xl border flex items-center gap-2 transition-all ${!hardMode ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
                <ShieldCheck size={18} /> STANDARD
            </button>
            <button 
                onClick={() => setHardMode(true)}
                className={`px-6 py-3 rounded-xl border flex items-center gap-2 transition-all ${hardMode ? 'bg-red-500/20 border-red-500 text-red-400 ring-2 ring-red-500/20' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
                <Skull size={18} /> HARDCORE
            </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-lg mx-auto py-8">
            <div className="p-4 bg-slate-900 rounded-xl border border-white/5">{LEVELS.length} Levels</div>
            <div className="p-4 bg-slate-900 rounded-xl border border-white/5">AI Hunter</div>
            <div className="p-4 bg-slate-900 rounded-xl border border-white/5">Perma-Fail</div>
        </div>
        
        <Button size="lg" onClick={onStart} className={`px-12 py-4 text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] ${hardMode ? 'bg-red-600 hover:bg-red-500 shadow-red-500/40' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            INITIATE LOCKDOWN
        </Button>
    </div>
);

const VictoryScreen = ({ score, onRestart, hardMode }: { score: number, onRestart: () => void, hardMode: boolean }) => (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-8 animate-in zoom-in-95">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${hardMode ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Trophy size={48} />
        </div>
        <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">SYSTEM HARDENED</h1>
            <p className={`${hardMode ? 'text-amber-400' : 'text-emerald-400'} font-mono text-xl`}>
                {hardMode ? 'ELITE OPERATOR STATUS' : 'THREAT ELIMINATED'}
            </p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 text-left space-y-6 max-w-lg mx-auto">
            <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Terminal size={16}/> POST-INCIDENT REPORT
            </h3>
            <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between items-center text-slate-300">
                    <span>FINAL SCORE</span>
                    <span className="text-white font-bold">{Math.floor(score)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                    <span>DIFFICULTY</span>
                    <span className={hardMode ? "text-red-400" : "text-emerald-400"}>{hardMode ? 'HARDCORE' : 'STANDARD'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                    <span>NEURAL ALIGNMENT</span>
                    <span className="text-emerald-400">OPTIMIZED</span>
                </div>
            </div>
        </div>
        <Button onClick={onRestart} variant="secondary">Run New Simulation</Button>
    </div>
);

const FailScreen = ({ level, onRetry }: { level: LevelConfig, onRetry: () => void }) => (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Skull size={48} className="text-red-400" />
        </div>
        <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">SYSTEM COMPROMISED</h1>
            <p className="text-red-400 font-mono">ROOT ACCESS LOST AT: {level.title.toUpperCase()}</p>
        </div>
        <p className="text-slate-400">
            The attacker exploited a weakness in your protocol. Data exfiltration detected.
        </p>
        <Button onClick={onRetry} variant="danger" className="px-8">REBOOT KERNEL</Button>
    </div>
);

// --- LEVELS ---

const LevelEntropy = ({ onComplete, onFail, hardMode }: any) => {
    const [length, setLength] = useState(8);
    const [symbols, setSymbols] = useState(false);
    const [timeLeft, setTimeLeft] = useState(hardMode ? 10 : 20);
    
    // Calculation
    const pool = 26 + 26 + 10 + (symbols ? 32 : 0);
    const bits = Math.floor(length * Math.log2(pool));
    const targetBits = hardMode ? 128 : 100;
    const isSecure = bits >= targetBits;

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timer); onFail(); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = () => {
        if (isSecure) onComplete(100 + timeLeft * 10);
        else onFail();
    };

    return (
        <div className="space-y-8 max-w-md mx-auto w-full">
            <div className="text-center space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500 mb-2">
                    <span>REQ: {targetBits} BITS</span>
                    <span className="text-red-400 animate-pulse">{timeLeft}s REMAINING</span>
                </div>
                <div className={`text-4xl font-black font-mono transition-colors duration-300 ${isSecure ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bits} BITS
                </div>
            </div>

            <div className="space-y-6 bg-slate-950 p-6 rounded-xl border border-white/5">
                <div>
                    <label className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>KEY LENGTH</span>
                        <span>{length} CHARS</span>
                    </label>
                    <input 
                        type="range" min="4" max="32" value={length} 
                        onChange={e => setLength(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                </div>
                
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500" />
                    <span className="font-bold text-sm text-slate-300 font-mono">INJECT_SYMBOLS</span>
                </label>

                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${isSecure ? 'bg-emerald-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min(100, (bits/targetBits)*100)}%` }}
                    ></div>
                </div>
            </div>

            <Button onClick={handleSubmit} className="w-full h-12 font-mono tracking-widest" variant={isSecure ? 'primary' : 'secondary'}>
                {isSecure ? 'PATCH_VULNERABILITY' : 'ENTROPY_TOO_LOW'}
            </Button>
        </div>
    );
};

const LevelMatching = ({ onComplete, onFail, hardMode }: any) => {
    const [timeLeft, setTimeLeft] = useState(hardMode ? 10 : 15);
    const [matches, setMatches] = useState(0);

    const targets = ['0xA4', '0xB2', '0xC9'];
    const [options, setOptions] = useState<string[]>([]);

    useEffect(() => {
        const base = ['0xA4', '0xFF', '0xB2', '0x00', '0xC9', '0xD1'];
        if (hardMode) base.push('0xE1', '0x88', '0x1A');
        setOptions(base.sort(() => Math.random() - 0.5));

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timer); onFail(); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClick = (val: string) => {
        if (targets.includes(val)) {
            setMatches(m => {
                const newM = m + 1;
                if (newM >= 3) onComplete(150 + timeLeft * 10);
                return newM;
            });
        } else {
            // Penalty
            setTimeLeft(t => Math.max(0, t - (hardMode ? 5 : 3)));
        }
    };

    return (
        <div className="text-center space-y-8">
            <div className="flex justify-between items-center max-w-md mx-auto">
                 <div className="text-xs font-bold text-slate-500 uppercase font-mono">Corruption Spread</div>
                 <div className="text-2xl font-mono text-red-400 font-bold">{timeLeft}s</div>
            </div>

            <div className="flex justify-center gap-4">
                 {targets.map((t, i) => (
                     <div key={i} className={`w-16 h-16 rounded-sm border-2 flex items-center justify-center font-mono font-bold text-xl transition-all ${i < matches ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 bg-slate-900 text-slate-600 border-dashed'}`}>
                         {i < matches ? 'OK' : 'ERR'}
                     </div>
                 ))}
            </div>

            <p className="text-slate-400 text-sm font-mono">SELECT_VALID_CHECKSUMS</p>

            <div className={`grid gap-4 max-w-sm mx-auto ${hardMode ? 'grid-cols-3' : 'grid-cols-3'}`}>
                {options.map((opt, i) => (
                    <button 
                        key={i}
                        onClick={(e) => { handleClick(opt); (e.target as HTMLButtonElement).disabled = true; (e.target as HTMLButtonElement).style.opacity = '0'; }}
                        className="p-4 bg-slate-800 rounded-sm border border-white/5 hover:bg-emerald-600 hover:text-white transition-all font-mono disabled:cursor-default"
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const LevelMaze = ({ onComplete, onFail, hardMode }: any) => {
    // 0 = Empty, 1 = Wall, 2 = Cloud (Death), 3 = Start, 4 = Goal
    // 4x4 Grid for increased difficulty
    const GRID_SIZE = 4;
    const [pos, setPos] = useState(0); 
    const [hunterPos, setHunterPos] = useState(2); // Hunter starts at top right
    
    // 4x4 Grid Layout (Indices 0-15)
    // S  .  H  C
    // .  C  .  .
    // .  .  C  .
    // C  .  .  G
    const initialGrid = [
        'START', 'SAFE', 'SAFE', 'CLOUD',
        'SAFE', 'CLOUD', 'SAFE', 'SAFE',
        'SAFE', 'SAFE', 'CLOUD', 'SAFE',
        'CLOUD', 'SAFE', 'SAFE', 'GOAL'
    ];

    const [grid] = useState(initialGrid);

    // AI Logic for Hunter
    const moveHunter = (playerIdx: number, currentHunterIdx: number) => {
        const pRow = Math.floor(playerIdx / GRID_SIZE);
        const pCol = playerIdx % GRID_SIZE;
        const hRow = Math.floor(currentHunterIdx / GRID_SIZE);
        const hCol = currentHunterIdx % GRID_SIZE;

        // Generate Candidates (Up, Down, Left, Right)
        const candidates = [
            { r: hRow - 1, c: hCol },
            { r: hRow + 1, c: hCol },
            { r: hRow, c: hCol - 1 },
            { r: hRow, c: hCol + 1 }
        ];

        // Filter valid candidates (In bounds AND not a hazard)
        const validMoves = candidates.filter(({r, c}) => {
            // Check bounds
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            
            // Check hazards (Collision Detection)
            const idx = r * GRID_SIZE + c;
            if (grid[idx] === 'CLOUD') return false;
            
            return true;
        });

        // If trapped, stay put
        if (validMoves.length === 0) return currentHunterIdx;

        // Greedy Sort: Choose move that minimizes distance to player
        validMoves.sort((a, b) => {
            const distA = Math.abs(a.r - pRow) + Math.abs(a.c - pCol);
            const distB = Math.abs(b.r - pRow) + Math.abs(b.c - pCol);
            return distA - distB;
        });

        // Return flattened index of best move
        return validMoves[0].r * GRID_SIZE + validMoves[0].c;
    };
    
    const move = (idx: number) => {
        if (grid[idx] === 'CLOUD') {
            onFail();
            return;
        }
        
        if (grid[idx] === 'GOAL') {
            onComplete(200);
            return;
        }

        // Move Player
        setPos(idx);

        // Move Hunter
        const nextHunter = moveHunter(idx, hunterPos);
        setHunterPos(nextHunter);

        // Collision Check
        if (nextHunter === idx) {
            setTimeout(onFail, 200); // Allow animation frame
        }
    };

    return (
        <div className="text-center space-y-6">
            <div className="space-y-2">
                <h3 className="font-bold text-white font-mono uppercase">Route Payload</h3>
                <p className="text-slate-400 text-xs font-mono">AVOID PUBLIC NODES AND HUNTER BOT</p>
            </div>

            <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto">
                {grid.map((cell, i) => {
                    const isPlayer = pos === i;
                    const isHunter = hunterPos === i;
                    const isCloud = cell === 'CLOUD';
                    const isGoal = cell === 'GOAL';
                    
                    // Logic for valid moves (Up/Down/Left/Right)
                    // Check rows/cols to prevent wrapping
                    const currentRow = Math.floor(pos / GRID_SIZE);
                    const targetRow = Math.floor(i / GRID_SIZE);
                    const diff = Math.abs(pos - i);
                    
                    const isAdjacent = (diff === 1 && currentRow === targetRow) || diff === GRID_SIZE;
                    const canMove = isAdjacent; 

                    return (
                        <button
                            key={i}
                            disabled={!canMove && !isPlayer}
                            onClick={() => move(i)}
                            className={`h-16 rounded-lg flex items-center justify-center border transition-all duration-300 relative
                                ${isPlayer ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-20 scale-110' : ''}
                                ${isGoal ? 'bg-indigo-900/30 border-indigo-500/50' : ''}
                                ${isCloud ? 'bg-red-900/10 border-red-500/10' : ''}
                                ${!isPlayer && !isGoal && !isCloud ? 'bg-slate-900 border-slate-800' : ''}
                            `}
                        >
                            {isPlayer && <Database className="text-white animate-bounce w-5 h-5" />}
                            {isHunter && !isPlayer && <Skull className="text-red-500 w-6 h-6 animate-pulse absolute z-10" />}
                            {!isPlayer && isGoal && <Server className="text-indigo-500 w-5 h-5" />}
                            {!isPlayer && isCloud && <ShieldAlert className="text-red-500/20 w-4 h-4" />}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const LevelPhishing = ({ onComplete, onFail, hardMode }: any) => {
    const options = [
        { label: 'Security Audit', domain: 'security-check-bastion.net', safe: false, method: 'GET /verify?token=' },
        { label: 'Vault Sync', domain: 'api.bastion.os', safe: true, method: 'POST /v1/sync' },
        { label: 'Password Reset', domain: 'support-portal-help.com', safe: false, method: 'POST /reset' },
        { label: 'Billing Update', domain: 'bastion-payments.os.net', safe: false, method: 'GET /invoice' },
    ];

    // Homoglyph attack in hard mode
    if (hardMode) {
        options.push({ label: 'System Alert', domain: 'api.basti0n.os', safe: false, method: 'POST /alert' });
    }

    const check = (safe: boolean) => {
        if (safe) onComplete(150);
        else onFail();
    };

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center">
                <ShieldAlert size={40} className="mx-auto text-amber-400 mb-4" />
                <h3 className="text-xl font-bold text-white font-mono uppercase">Incoming Packet</h3>
                <p className="text-slate-400 text-sm">Identify the legitimate handshake.</p>
            </div>

            <div className="space-y-3">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => check(opt.safe)}
                        className="w-full p-4 bg-black border border-slate-800 hover:border-emerald-500/50 rounded-sm transition-all group text-left font-mono"
                    >
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="text-indigo-400">{opt.method}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-bold text-white text-sm">{opt.label}</div>
                                <div className="text-xs text-slate-600 group-hover:text-emerald-300 transition-colors">Host: {opt.domain}</div>
                            </div>
                            <Code className="text-slate-700 group-hover:text-white" size={16} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const LevelCode = ({ onComplete, onFail, hardMode }: any) => {
    const snippets = [
        { id: 1, code: 'const user = db.query(`SELECT * FROM users WHERE id = ${id}`);', safe: false }, // SQLi
        { id: 2, code: 'const hash = crypto.pbkdf2Sync(password, salt, 100000, 64);', safe: true },
        { id: 3, code: 'if (password === "admin123") { grantAccess(); }', safe: false }, // Hardcoded
        { id: 4, code: 'return <div dangerouslySetInnerHTML={{__html: userInput}} />', safe: false } // XSS
    ];

    const handleSelect = (safe: boolean) => {
        if (safe) onComplete(200);
        else onFail();
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div className="text-center">
                <h3 className="font-bold text-white font-mono uppercase">Source Code Audit</h3>
                <p className="text-slate-400 text-xs font-mono">SELECT THE SECURE IMPLEMENTATION</p>
            </div>
            
            <div className="space-y-3">
                {snippets.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSelect(s.safe)}
                        className="w-full text-left p-4 bg-[#0d1117] border border-slate-800 rounded-lg hover:border-indigo-500 group transition-all font-mono text-xs overflow-x-auto"
                    >
                        <div className="flex gap-4">
                            <span className="text-slate-600 select-none">{i+1}</span>
                            <code className="text-slate-300 group-hover:text-white">
                                {s.code}
                            </code>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const LevelSequence = ({ onComplete, onFail, hardMode }: any) => {
    // Simon Says
    const [sequence, setSequence] = useState<number[]>([]);
    const [userStep, setUserStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [flash, setFlash] = useState<number | null>(null);

    useEffect(() => {
        // Start game with sequence of 3 (or 5 in hard mode)
        const len = hardMode ? 5 : 4;
        const seq = Array.from({length: len}, () => Math.floor(Math.random() * 4));
        setSequence(seq);
        playSequence(seq);
    }, []);

    const playSequence = async (seq: number[]) => {
        setPlaying(true);
        // Speed increases in hardmode
        const delay = hardMode ? 300 : 500; 
        
        for (let i = 0; i < seq.length; i++) {
            await new Promise(r => setTimeout(r, 200));
            setFlash(seq[i]);
            await new Promise(r => setTimeout(r, delay));
            setFlash(null);
        }
        setPlaying(false);
    };

    const handleTap = (idx: number) => {
        if (playing) return;
        
        // Visual feedback
        setFlash(idx);
        setTimeout(() => setFlash(null), 200);

        if (idx === sequence[userStep]) {
            const nextStep = userStep + 1;
            setUserStep(nextStep);
            if (nextStep >= sequence.length) {
                setTimeout(() => onComplete(300), 500);
            }
        } else {
            onFail();
        }
    };

    return (
        <div className="text-center space-y-8">
            <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Fingerprint className="text-emerald-400" />
                    <h3 className="font-bold text-white font-mono uppercase">2FA Synchronization</h3>
                </div>
                <p className="text-slate-400 text-xs font-mono">
                    {playing ? 'RECEIVING_TOKEN_PATTERN...' : 'INPUT_VERIFICATION_CODE'}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-[300px] mx-auto">
                {[0, 1, 2, 3].map(i => (
                    <button
                        key={i}
                        disabled={playing}
                        onClick={() => handleTap(i)}
                        className={`h-32 rounded-lg border-2 transition-all duration-100 ${
                            flash === i 
                                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.6)] scale-95' 
                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                        }`}
                    >
                    </button>
                ))}
            </div>
        </div>
    );
};

const LevelNeural = ({ onComplete, onFail, hardMode }: any) => {
    // "TinyBERT" Simulation: Balance Weights to sum to Target
    // 3 Sliders (Q, K, V). Sum must match Target +/- tolerance.
    const [q, setQ] = useState(50);
    const [k, setK] = useState(50);
    const [v, setV] = useState(50);
    const [target, setTarget] = useState(150); // Sum of 150 (approx 50 each)
    const [drift, setDrift] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        // Random Target every run
        setTarget(Math.floor(Math.random() * 100) + 100); 
        
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 0) { clearInterval(timer); verify(); return 0; }
                return t - 1;
            });
            // Drift mechanic
            if (hardMode) setDrift(Math.sin(Date.now() / 500) * 10);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const verify = () => {
        const sum = q + k + v + drift;
        const diff = Math.abs(sum - target);
        if (diff < 15) onComplete(400);
        else onFail();
    };

    const currentSum = q + k + v + drift;
    const error = Math.abs(currentSum - target);
    const isAligned = error < 15;

    return (
        <div className="space-y-8 max-w-md mx-auto">
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Cpu className="text-violet-400" />
                    <h3 className="font-bold text-white font-mono uppercase">Neural Alignment</h3>
                </div>
                <p className="text-slate-400 text-xs font-mono">
                    OPTIMIZE ATTENTION WEIGHTS (TinyBERT)
                </p>
            </div>

            <div className="bg-black/40 p-6 rounded-xl border border-white/10 relative overflow-hidden">
                {/* Visualizer */}
                <div className="h-24 flex items-end justify-center gap-1 mb-6 border-b border-white/5 pb-6">
                    {[q, k, v].map((val, i) => (
                        <div key={i} className="w-8 bg-indigo-500/50 transition-all duration-300 rounded-t" style={{height: `${Math.min(100, val)}%`}}></div>
                    ))}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/30 border-t border-dashed border-red-400" style={{top: `${100 - (target/3)}%`}}></div>
                </div>

                <div className="space-y-4">
                    <input type="range" min="0" max="100" value={q} onChange={e => setQ(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                    <input type="range" min="0" max="100" value={k} onChange={e => setK(parseInt(e.target.value))} className="w-full accent-violet-500" />
                    <input type="range" min="0" max="100" value={v} onChange={e => setV(parseInt(e.target.value))} className="w-full accent-emerald-500" />
                </div>
            </div>

            <div className="text-center">
                <div className={`text-2xl font-black font-mono transition-colors ${isAligned ? 'text-emerald-400' : 'text-red-400'}`}>
                    LOSS: {error.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-2">AUTO-COMMIT IN {timeLeft}s</div>
            </div>
            
            <Button onClick={verify} className="w-full" disabled={!isAligned}>
                <Zap size={16} /> COMMIT WEIGHTS
            </Button>
        </div>
    );
};

const LevelDDoS = ({ onComplete, onFail, hardMode }: any) => {
    // Traffic mitigation game. Identify and block bots.
    const [queue, setQueue] = useState<{id: number, type: 'user'|'bot', ip: string}[]>([]);
    const [processed, setProcessed] = useState(0);
    const target = 15;
    
    useEffect(() => {
        // Generate initial batch
        const batch = Array.from({length: 5}, (_, i) => genPacket(i));
        setQueue(batch);
    }, []);

    const genPacket = (id: number) => ({
        id,
        type: Math.random() > 0.6 ? 'bot' as const : 'user' as const,
        ip: Math.random() > 0.5 ? `192.168.1.${Math.floor(Math.random()*255)}` : `10.0.0.${Math.floor(Math.random()*255)}`
    });

    const handleAction = (action: 'allow' | 'block') => {
        if (queue.length === 0) return;
        const current = queue[0];
        
        // Logic: Allow User, Block Bot
        const correct = (current.type === 'user' && action === 'allow') || (current.type === 'bot' && action === 'block');
        
        if (!correct) {
            // Critical Failure if you allow a bot
            if (current.type === 'bot' && action === 'allow') onFail();
            // Penalty for blocking user
            else setProcessed(p => Math.max(0, p - 1));
        } else {
            setProcessed(p => {
                const next = p + 1;
                if (next >= target) onComplete(500);
                return next;
            });
        }

        // Next
        setQueue(prev => {
            const next = prev.slice(1);
            if (next.length < 3) next.push(genPacket(Date.now() + Math.random()));
            return next;
        });
    };

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="text-center">
                <Globe className="mx-auto text-indigo-400 mb-2" size={32} />
                <h3 className="font-bold text-white text-xl">DDoS Scrubber</h3>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all" style={{width: `${(processed/target)*100}%`}}></div>
                </div>
            </div>

            <div className="h-40 relative flex items-center justify-center">
                {queue.slice(0, 3).map((p, i) => (
                    <div 
                        key={p.id}
                        className={`absolute w-64 p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between
                            ${i === 0 ? 'scale-100 z-20 bg-slate-900 border-white/20 translate-y-0 opacity-100' : ''}
                            ${i === 1 ? 'scale-90 z-10 bg-slate-950 border-white/10 translate-y-4 opacity-50' : ''}
                            ${i === 2 ? 'scale-80 z-0 bg-black border-white/5 translate-y-8 opacity-20' : ''}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            {p.type === 'bot' ? <Skull className="text-red-500" /> : <Network className="text-emerald-500" />}
                            <div className="font-mono text-sm">
                                <div className="text-slate-400 text-xs">SRC_IP</div>
                                <div className="text-white">{p.ip}</div>
                            </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${p.type === 'bot' ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                            {p.type === 'bot' ? 'HIGH_RATE' : 'NORMAL'}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button variant="danger" onClick={() => handleAction('block')} className="h-16 text-lg">
                    <XCircle className="mr-2" /> BLOCK
                </Button>
                <Button onClick={() => handleAction('allow')} className="bg-emerald-600 hover:bg-emerald-500 h-16 text-lg">
                    <CheckCircle className="mr-2" /> ALLOW
                </Button>
            </div>
        </div>
    );
};

const LevelPorts = ({ onComplete, onFail, hardMode }: any) => {
    // Whac-a-mole style port closing
    // Ports turn green (open), click to close (red)
    // Bar fills up if ports are open
    const [ports, setPorts] = useState<boolean[]>(Array(9).fill(false)); // false=closed, true=open
    const [risk, setRisk] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        // Game Loop
        const interval = setInterval(() => {
            setRisk(r => {
                const openCount = ports.filter(p => p).length;
                const nextRisk = r + (openCount * (hardMode ? 1.5 : 0.8));
                if (nextRisk >= 100) {
                    clearInterval(interval);
                    onFail();
                }
                return nextRisk;
            });

            setTimeLeft(t => {
                if (t <= 0) {
                    clearInterval(interval);
                    onComplete(600);
                    return 0;
                }
                return t - 0.1;
            });

            // Randomly open ports
            if (Math.random() > 0.7) {
                setPorts(curr => {
                    const next = [...curr];
                    const idx = Math.floor(Math.random() * 9);
                    next[idx] = true;
                    return next;
                });
            }
        }, 100);

        return () => clearInterval(interval);
    }, [ports]);

    const closePort = (idx: number) => {
        setPorts(curr => {
            const next = [...curr];
            next[idx] = false;
            return next;
        });
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-white font-bold text-xl flex items-center gap-2"><Activity className="text-emerald-400" /> Port Hardening</h3>
                    <p className="text-slate-400 text-xs">Close ports before data exfiltration.</p>
                </div>
                <div className="text-2xl font-mono text-white">{Math.ceil(timeLeft)}s</div>
            </div>

            {/* Risk Bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>Exfiltration Risk</span>
                    <span className={risk > 80 ? 'text-red-500 animate-pulse' : 'text-slate-500'}>{Math.floor(risk)}%</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                    <div 
                        className={`h-full transition-all duration-100 ${risk > 80 ? 'bg-red-500' : risk > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{width: `${Math.min(100, risk)}%`}}
                    ></div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-3">
                {ports.map((isOpen, i) => (
                    <button
                        key={i}
                        onClick={() => closePort(i)}
                        className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200
                            ${isOpen 
                                ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse' 
                                : 'bg-slate-900 border-slate-800'
                            }
                        `}
                    >
                        {isOpen ? <Wifi size={32} className="text-emerald-400" /> : <Lock size={24} className="text-slate-700" />}
                        <span className="text-[10px] font-mono mt-2 text-slate-500">{8000 + i}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

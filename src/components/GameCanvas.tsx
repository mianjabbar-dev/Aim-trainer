import { useRef, useEffect, useCallback } from 'react';
import { Target, FloatingText, DifficultyConfig, TARGET_COLORS } from '../utils/gameTypes';
import { Particle, createHitParticles, createMissParticles, updateParticles, renderParticles } from '../utils/particles';
import { playHit, playMiss, playCombo } from '../utils/sounds';

interface GameCanvasProps {
  config: DifficultyConfig;
  isPaused: boolean;
  isPlaying: boolean;
  onScoreUpdate: (score: number, hits: number, misses: number, totalClicks: number, reactionTimes: number[]) => void;
  onTimeUpdate: (timeLeft: number) => void;
  onGameOver: () => void;
  onComboUpdate: (combo: number) => void;
}

export default function GameCanvas({
  config,
  isPaused,
  isPlaying,
  onScoreUpdate,
  onTimeUpdate,
  onGameOver,
  onComboUpdate,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    targets: [] as Target[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    score: 0,
    hits: 0,
    misses: 0,
    totalClicks: 0,
    combo: 0,
    maxCombo: 0,
    reactionTimes: [] as number[],
    lastSpawn: 0,
    gameTime: 0,
    shakeX: 0,
    shakeY: 0,
    shakeIntensity: 0,
    nextId: 0,
    lastTime: 0,
    bgPulse: 0,
    crosshairTrail: [] as { x: number; y: number; age: number }[],
    mouseX: 0,
    mouseY: 0,
  });

  const spawnTarget = useCallback((canvasW: number, canvasH: number) => {
    const s = stateRef.current;
    if (s.targets.length >= config.maxTargets) return;
    
    const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
    const margin = radius + 20;
    const topMargin = 60 + radius;
    
    let x: number, y: number;
    let attempts = 0;
    do {
      x = margin + Math.random() * (canvasW - margin * 2);
      y = topMargin + Math.random() * (canvasH - topMargin - margin);
      attempts++;
    } while (
      attempts < 20 &&
      s.targets.some(t => {
        const dx = t.x - x;
        const dy = t.y - y;
        return Math.sqrt(dx * dx + dy * dy) < t.radius + radius + 10;
      })
    );
    
    const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];
    const points = Math.max(10, Math.round(50 - radius));
    
    s.targets.push({
      id: s.nextId++,
      x, y, radius,
      spawnTime: s.gameTime,
      lifespan: config.targetLifespan,
      color,
      hit: false,
      scale: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      points,
    });
  }, [config]);

  const handleClick = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isPaused || !isPlaying) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const s = stateRef.current;
    s.totalClicks++;
    
    // Check targets in reverse (topmost first)
    let hitTarget: Target | null = null;
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i];
      if (t.hit) continue;
      const dx = t.x - x;
      const dy = t.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= t.radius * t.scale) {
        hitTarget = t;
        break;
      }
    }
    
    if (hitTarget) {
      hitTarget.hit = true;
      s.hits++;
      s.combo++;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      
      const reactionTime = (s.gameTime - hitTarget.spawnTime) * 1000;
      s.reactionTimes.push(reactionTime);
      
      // Score calculation: base points + combo bonus + speed bonus
      const speedBonus = Math.max(0, Math.round((1 - reactionTime / (config.targetLifespan * 1000)) * 20));
      const comboBonus = Math.min(s.combo * 5, 50);
      const points = hitTarget.points + speedBonus + comboBonus;
      s.score += points;
      
      // Screen shake
      s.shakeIntensity = 6;
      
      // Background pulse
      s.bgPulse = 0.3;
      
      // Particles
      s.particles.push(...createHitParticles(hitTarget.x, hitTarget.y, hitTarget.color));
      
      // Floating text
      const comboText = s.combo >= 3 ? ` x${s.combo}` : '';
      s.floatingTexts.push({
        id: s.nextId++,
        x: hitTarget.x,
        y: hitTarget.y - hitTarget.radius - 10,
        text: `+${points}${comboText}`,
        color: s.combo >= 5 ? '#ffcc00' : s.combo >= 3 ? '#33ff66' : '#fff',
        life: 0.8,
        maxLife: 0.8,
      });
      
      // Sound
      if (s.combo >= 5 && s.combo % 5 === 0) {
        playCombo();
      } else {
        playHit();
      }
      
      onComboUpdate(s.combo);
    } else {
      s.misses++;
      s.combo = 0;
      s.shakeIntensity = 3;
      s.particles.push(...createMissParticles(x, y));
      
      // Miss penalty
      s.score = Math.max(0, s.score - 5);
      s.floatingTexts.push({
        id: s.nextId++,
        x, y: y - 20,
        text: '-5',
        color: '#ff4444',
        life: 0.5,
        maxLife: 0.5,
      });
      
      playMiss();
      onComboUpdate(0);
    }
    
    onScoreUpdate(s.score, s.hits, s.misses, s.totalClicks, [...s.reactionTimes]);
  }, [isPaused, isPlaying, config, onScoreUpdate, onComboUpdate]);

  // Mouse/touch event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleClick(e.clientX, e.clientY);
    };
    
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleClick(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouseX = e.clientX - rect.left;
      stateRef.current.mouseY = e.clientY - rect.top;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        stateRef.current.mouseX = e.touches[0].clientX - rect.left;
        stateRef.current.mouseY = e.touches[0].clientY - rect.top;
      }
    };
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleClick]);

  // Reset game state when isPlaying transitions to true
  useEffect(() => {
    if (isPlaying) {
      const s = stateRef.current;
      s.targets = [];
      s.particles = [];
      s.floatingTexts = [];
      s.score = 0;
      s.hits = 0;
      s.misses = 0;
      s.totalClicks = 0;
      s.combo = 0;
      s.maxCombo = 0;
      s.reactionTimes = [];
      s.lastSpawn = 0;
      s.gameTime = 0;
      s.shakeX = 0;
      s.shakeY = 0;
      s.shakeIntensity = 0;
      s.lastTime = 0;
      s.bgPulse = 0;
      s.crosshairTrail = [];
    }
  }, [isPlaying]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let animId: number;
    
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const loop = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const s = stateRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      
      // Delta time
      if (s.lastTime === 0) s.lastTime = timestamp;
      const dt = Math.min((timestamp - s.lastTime) / 1000, 0.05);
      s.lastTime = timestamp;
      
      if (isPlaying && !isPaused) {
        s.gameTime += dt;
        
        const timeLeft = Math.max(0, config.gameDuration - s.gameTime);
        onTimeUpdate(timeLeft);
        
        if (timeLeft <= 0) {
          onGameOver();
          animId = requestAnimationFrame(loop);
          return;
        }
        
        // Spawn targets
        if (s.gameTime - s.lastSpawn >= config.spawnInterval) {
          spawnTarget(w, h);
          s.lastSpawn = s.gameTime;
        }
        
        // Update targets
        s.targets = s.targets.filter(t => {
          if (t.hit) return false;
          const age = s.gameTime - t.spawnTime;
          if (age >= t.lifespan) {
            // Missed - target expired
            s.combo = 0;
            onComboUpdate(0);
            return false;
          }
          // Scale in animation
          t.scale = Math.min(1, age * 6);
          // Pulse
          t.pulsePhase += dt * 3;
          return true;
        });
        
        // Update particles
        s.particles = updateParticles(s.particles, dt);
        
        // Update floating texts
        s.floatingTexts = s.floatingTexts
          .map(ft => ({ ...ft, y: ft.y - 60 * dt, life: ft.life - dt }))
          .filter(ft => ft.life > 0);
        
        // Screen shake decay
        if (s.shakeIntensity > 0) {
          s.shakeX = (Math.random() - 0.5) * s.shakeIntensity * 2;
          s.shakeY = (Math.random() - 0.5) * s.shakeIntensity * 2;
          s.shakeIntensity *= 1 - dt * 12;
          if (s.shakeIntensity < 0.1) {
            s.shakeIntensity = 0;
            s.shakeX = 0;
            s.shakeY = 0;
          }
        }
        
        // BG pulse decay
        s.bgPulse *= 1 - dt * 5;
      }
      
      // -- RENDER --
      ctx.save();
      ctx.translate(s.shakeX, s.shakeY);
      
      // Background
      const bgBrightness = Math.round(12 + s.bgPulse * 20);
      ctx.fillStyle = `rgb(${bgBrightness}, ${bgBrightness}, ${Math.round(bgBrightness * 1.4)})`;
      ctx.fillRect(-10, -10, w + 20, h + 20);
      
      // Grid pattern
      ctx.strokeStyle = `rgba(100, 120, 255, ${0.04 + s.bgPulse * 0.1})`;
      ctx.lineWidth = 0.5;
      const gridSize = 50;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      
      // Render targets
      for (const t of s.targets) {
        const age = s.gameTime - t.spawnTime;
        const lifeRatio = age / t.lifespan;
        const pulse = 1 + Math.sin(t.pulsePhase) * 0.05;
        const r = t.radius * t.scale * pulse;
        
        // Warning ring when about to expire
        if (lifeRatio > 0.6) {
          const urgency = (lifeRatio - 0.6) / 0.4;
          ctx.strokeStyle = `rgba(255, 60, 60, ${urgency * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, r + 8 + Math.sin(s.gameTime * 10) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Outer glow
        const gradient = ctx.createRadialGradient(t.x, t.y, r * 0.3, t.x, t.y, r * 1.5);
        gradient.addColorStop(0, t.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Main circle
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner rings
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullseye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(t.x, t.y, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        
        // Timer arc
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - lifeRatio));
        ctx.stroke();
        
        // Points label
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.max(10, r * 0.35)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t.points}`, t.x, t.y);
      }
      
      // Render particles
      renderParticles(ctx, s.particles);
      
      // Render floating texts
      for (const ft of s.floatingTexts) {
        const alpha = ft.life / ft.maxLife;
        const scale = 1 + (1 - alpha) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${Math.round(18 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      
      // Crosshair (desktop only, follows mouse)
      if (isPlaying && !isPaused && s.mouseX > 0 && s.mouseY > 0) {
        const cx = s.mouseX;
        const cy = s.mouseY;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        
        // Outer circle
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cross
        const gap = 6;
        const len = 20;
        ctx.beginPath();
        ctx.moveTo(cx - len, cy); ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + len, cy);
        ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + len);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Pause overlay
      if (isPaused && isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', w / 2, h / 2 - 20);
        ctx.font = '18px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Press ESC or P to resume', w / 2, h / 2 + 30);
      }
      
      ctx.restore();
      
      animId = requestAnimationFrame(loop);
    };
    
    animId = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [config, isPaused, isPlaying, spawnTarget, onTimeUpdate, onGameOver, onComboUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: isPlaying && !isPaused ? 'none' : 'default', touchAction: 'none' }}
    />
  );
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'circle' | 'ring' | 'spark';
}

export function createHitParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  // Burst particles
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
    const speed = 150 + Math.random() * 250;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.4 + Math.random() * 0.3,
      size: 3 + Math.random() * 5,
      color,
      type: 'circle',
    });
  }
  // Sparks
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 300;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.2,
      maxLife: 0.2 + Math.random() * 0.2,
      size: 2 + Math.random() * 2,
      color: '#fff',
      type: 'spark',
    });
  }
  // Ring
  particles.push({
    x, y,
    vx: 0, vy: 0,
    life: 0.35,
    maxLife: 0.35,
    size: 10,
    color,
    type: 'ring',
  });
  return particles;
}

export function createMissParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 80;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.3 + Math.random() * 0.2,
      size: 2 + Math.random() * 3,
      color: '#ff4444',
      type: 'circle',
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * (1 - dt * 3),
      vy: p.vy * (1 - dt * 3) + (p.type !== 'ring' ? 200 * dt : 0),
      life: p.life - dt,
      size: p.type === 'ring' ? p.size + 300 * dt : p.size,
    }))
    .filter(p => p.life > 0);
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;

    if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.5);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

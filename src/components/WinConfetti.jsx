import { useEffect, useRef, useState } from 'react';

export default function WinConfetti({ active, particleCount = 60, duration = 2500 }) {
  const canvasRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (active) {
      setIsAnimating(true);
    }
  }, [active]);

  useEffect(() => {
    if (!isAnimating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = ['#8cf2ff', '#ff8fc5', '#ffd166', '#12f5dc', '#c084fc'];
    
    class Particle {
      constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.1; // top-center burst
        this.size = Math.random() * 8 + 4;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 15 + 5;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        
        // Gravity and drift
        this.gravity = 0.5;
        this.drift = (Math.random() - 0.5) * 2;
        
        // Rotation
        this.angle = Math.random() * 360;
        this.spin = (Math.random() - 0.5) * 10;
        
        this.isCircle = Math.random() > 0.5;
      }
      
      update() {
        this.vy += this.gravity;
        this.vx += this.drift;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spin;
      }
      
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.fillStyle = this.color;
        
        if (this.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        
        ctx.restore();
      }
    }

    let particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let animationFrameId;
    const startTime = Date.now();

    const render = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const opacity = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;
        ctx.globalAlpha = opacity;
        particles.forEach(p => {
          p.update();
          p.draw();
        });
        ctx.globalAlpha = 1;
        animationFrameId = requestAnimationFrame(render);
      } else {
        setIsAnimating(false);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAnimating, particleCount, duration]);

  if (!isAnimating) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';

export default function BrandReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const precisionRef = useRef<HTMLDivElement>(null);
  const powerRef = useRef<HTMLDivElement>(null);
  const monogramRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const lightSweepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Starfield/Speed lines canvas effect
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars/speed lines
    const stars: Array<{ x: number; y: number; z: number; speed: number }> = [];
    const numStars = 200;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1000,
        speed: 2 + Math.random() * 3,
      });
    }

    let animationSpeed = 10; // Start fast
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!ctx) return;
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Clear with slight fade for trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      const speedMultiplier = Math.max(0, animationSpeed);
      stars.forEach((star) => {
        // Move star toward viewer
        star.z -= speedMultiplier * (deltaTime / 16);

        // Reset if star passed viewer (check before calculations to prevent negative values)
        if (star.z <= 0) {
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
          star.z = 1000;
        }

        // Ensure z is positive for calculations
        const safeZ = Math.max(0.1, star.z);

        // Calculate position
        const x = (star.x - canvas.width / 2) * (600 / safeZ) + canvas.width / 2;
        const y = (star.y - canvas.height / 2) * (600 / safeZ) + canvas.height / 2;
        const size = Math.max(0, (1 - safeZ / 1000) * 2);

        // Only draw if size is valid and position is within canvas bounds
        if (size > 0 && x >= -50 && x <= canvas.width + 50 && y >= -50 && y <= canvas.height + 50) {
          // Draw star
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();

          // Draw speed line
          const prevZ = Math.max(0.1, safeZ + speedMultiplier * 10);
          const prevX = (star.x - canvas.width / 2) * (600 / prevZ) + canvas.width / 2;
          const prevY = (star.y - canvas.height / 2) * (600 / prevZ) + canvas.height / 2;
          
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, 0.3 * (1 - safeZ / 1000)))})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });

      requestAnimationFrame(animate);
    };

    // GSAP Timeline
    const tl = gsap.timeline({ defaults: { ease: 'none' } });

    // Set initial states
    gsap.set([speedRef.current, precisionRef.current, powerRef.current], {
      opacity: 0,
      scale: 0.8,
      filter: 'blur(10px)',
    });

    gsap.set(monogramRef.current, {
      opacity: 0,
      scale: 0,
      filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.6))',
    });

    gsap.set(wordmarkRef.current, {
      opacity: 0,
      scale: 2,
    });

    gsap.set(lightSweepRef.current, {
      x: '-100%',
    });

    // Scene 1: The Build (0s - 5s)
    // Animate words appearing - each word: 0.6s appear + 0.7s hold + 0.4s fade = 1.7s × 3 = 5.1s (close enough)
    tl.to(speedRef.current, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.6,
      ease: 'power2.out',
    })
      .to(speedRef.current, {
        opacity: 0,
        duration: 0.4,
      }, '+=0.7')
      .to(precisionRef.current, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.6,
        ease: 'power2.out',
      })
      .to(precisionRef.current, {
        opacity: 0,
        duration: 0.4,
      }, '+=0.7')
      .to(powerRef.current, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.6,
        ease: 'power2.out',
      })
      .to(powerRef.current, {
        opacity: 0,
        duration: 0.4,
      }, '+=0.7');

    // Scene 2: The Monogram (5s - 10s)
    tl.to(monogramRef.current, {
      opacity: 1,
      scale: 1.1,
      duration: 0.5,
      ease: 'power2.out',
    })
      .to(monogramRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.inOut',
      })
      // Breathing glow effect - longer to fill 5s
      .to(monogramRef.current, {
        filter: 'drop-shadow(0 0 25px rgba(255, 255, 255, 0.9))',
        duration: 1.5,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1,
      })
      // Heartbeat snap
      .to(monogramRef.current, {
        scale: 1.15,
        duration: 0.1,
        ease: 'power2.out',
      })
      .to(monogramRef.current, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.inOut',
      }, '+=0.35');

    // Scene 3: The Reveal (10s - 15s)
    tl.to(monogramRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: 'power2.in',
    })
      .to(wordmarkRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1.0,
        ease: 'power2.out',
      }, '-=0.1')
      // Metallic light sweep
      .to(lightSweepRef.current, {
        x: '200%',
        duration: 1.5,
        ease: 'power2.inOut',
      }, '-=0.7')
      // Slow down starfield gradually
      .to({}, {
        duration: 2.0,
        onUpdate: function() {
          animationSpeed = gsap.utils.interpolate(10, 0, this.progress());
        },
      }, '-=1.0');

    // Start animation
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#050505] flex items-center justify-center"
    >
      {/* Canvas Starfield Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#050505' }}
      />

      {/* Scene 1: Words */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          ref={speedRef}
          className="absolute text-6xl md:text-8xl font-bold text-white tracking-wider"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          SPEED
        </div>
        <div
          ref={precisionRef}
          className="absolute text-6xl md:text-8xl font-bold text-white tracking-wider"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          PRECISION
        </div>
        <div
          ref={powerRef}
          className="absolute text-6xl md:text-8xl font-bold text-white tracking-wider"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          POWER
        </div>
      </div>

      {/* Scene 2: Monogram */}
      <div
        ref={monogramRef}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <div className="relative">
          <Image
            src="/PG_logo.png"
            alt="Powerglide Monogram"
            width={200}
            height={200}
            className="w-32 h-32 md:w-48 md:h-48 object-contain"
            priority
          />
        </div>
      </div>

      {/* Scene 3: Wordmark with Light Sweep */}
      <div
        ref={wordmarkRef}
        className="absolute inset-0 flex items-center justify-center z-30"
      >
        <div className="relative overflow-hidden">
          <Image
            src="/Powerglide_wordmark.png"
            alt="Powerglide"
            width={600}
            height={200}
            className="w-64 md:w-96 h-auto object-contain"
            priority
            style={{
              position: 'relative',
              zIndex: 1,
            }}
          />
          {/* Metallic Light Sweep Overlay */}
          <div
            ref={lightSweepRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%)',
              width: '50%',
              height: '100%',
              mixBlendMode: 'overlay',
              zIndex: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}





'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    life: number;
}

export default function Sparkles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const mouse = useRef({ x: 0, y: 0 });
    const isActive = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            // Constrain to mobile container size
            const container = canvas.parentElement?.closest('.mobile-container');
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            } else {
                canvas.width = Math.min(window.innerWidth, 428);
                canvas.height = window.innerHeight;
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current = { x: e.clientX, y: e.clientY };
            isActive.current = true;

            // Create particles on move
            for (let i = 0; i < 3; i++) {
                createParticle(e.clientX, e.clientY);
            }
        };

        const createParticle = (x: number, y: number) => {
            const colors = ['#FFD700', '#FF69B4', '#00BFFF', '#7B68EE'];
            const particle: Particle = {
                x,
                y,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * 2 - 1,
                speedY: Math.random() * 2 - 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0
            };
            particles.current.push(particle);
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.current.length; i++) {
                const p = particles.current[i];

                p.x += p.speedX;
                p.y += p.speedY;
                p.life -= 0.02;
                p.size -= 0.05;

                if (p.life <= 0 || p.size <= 0) {
                    particles.current.splice(i, 1);
                    i--;
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);

        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1]"
            style={{ mixBlendMode: 'screen' }}
        />
    );
}

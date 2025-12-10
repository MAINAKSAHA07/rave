'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface ConcertEffectProps {
    onComplete?: () => void;
}

export default function ConcertEffect({ onComplete }: ConcertEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const equalizerRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            // 1. Equalizer Bars Animation - scoped to this container
            const bars = containerRef.current!.querySelectorAll('.concert-equalizer-bar');
            bars.forEach((bar: any) => {
                gsap.to(bar, {
                    scaleY: 'random(0.3, 1)',
                    duration: 'random(0.1, 0.3)',
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut',
                    transformOrigin: 'bottom'
                });
            });

            // 2. Pulse/Glow Ring - scoped to this container
            const glowRing = containerRef.current!.querySelector('.concert-glow-ring');
            if (glowRing) {
                gsap.to(glowRing, {
                    scale: 1.5,
                    opacity: 0,
                    duration: 1.5,
                    repeat: 1,
                    ease: 'power2.out',
                });
            }

            // 3. Particles
            const particleCount = 20;
            const particles = [];

            // Create particles dynamically
            for (let i = 0; i < particleCount; i++) {
                const p = document.createElement('div');
                p.className = 'particle absolute w-1 h-1 rounded-full bg-purple-400 opacity-0';
                containerRef.current?.appendChild(p);
                particles.push(p);
            }

            particles.forEach((p) => {
                const angle = Math.random() * Math.PI * 2;
                const velocity = Math.random() * 80 + 40; // distance

                gsap.set(p, {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 'random(0.5, 1.5)'
                });

                gsap.to(p, {
                    x: Math.cos(angle) * velocity,
                    y: Math.sin(angle) * velocity,
                    opacity: 0,
                    duration: 'random(1, 2)',
                    ease: 'power3.out',
                });
            });

            // Cleanup timeline
            gsap.delayedCall(3, () => {
                if (onComplete) onComplete();
            });

        }, containerRef);

        return () => ctx.revert();
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden"
        >
            {/* Glow Ring */}
            <div className="concert-glow-ring absolute w-48 h-48 rounded-full border-2 border-purple-500/30 bg-purple-500/10 blur-xl" />

            {/* Equalizer SVG */}
            <svg
                ref={equalizerRef}
                width="100"
                height="60"
                viewBox="0 0 100 60"
                className="relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]"
            >
                {/* Generate 5 bars */}
                <rect className="concert-equalizer-bar" x="10" y="10" width="10" height="50" rx="4" fill="#A855F7" opacity="0.9" />
                <rect className="concert-equalizer-bar" x="30" y="25" width="10" height="35" rx="4" fill="#C4B5FD" opacity="0.8" />
                <rect className="concert-equalizer-bar" x="50" y="5" width="10" height="55" rx="4" fill="#3B82F6" opacity="0.9" />
                <rect className="concert-equalizer-bar" x="70" y="20" width="10" height="40" rx="4" fill="#A855F7" opacity="0.8" />
                <rect className="concert-equalizer-bar" x="90" y="15" width="10" height="45" rx="4" fill="#C4B5FD" opacity="0.9" />
            </svg>
        </div>
    );
}

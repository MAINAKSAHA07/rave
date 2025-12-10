'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SportEffectProps {
    onComplete?: () => void;
}

export default function SportEffect({ onComplete }: SportEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            // 1. Central Flare / Flash - scoped to this container
            const flashElement = containerRef.current!.querySelector('.sport-flash');
            if (flashElement) {
                gsap.fromTo(flashElement,
                    { scale: 0, opacity: 1 },
                    { scale: 1.5, opacity: 0, duration: 0.5, ease: 'power4.out' }
                );
            }

            // 2. Gold Streaks Burst
            const streakCount = 12;
            const container = containerRef.current!;

            for (let i = 0; i < streakCount; i++) {
                const streak = document.createElement('div');
                streak.className = 'absolute top-1/2 left-1/2 bg-[#FFD76D]';
                // Elongated particles
                streak.style.width = '40px';
                streak.style.height = '2px';
                streak.style.borderRadius = '2px';
                streak.style.boxShadow = '0 0 8px #FFD76D';
                streak.style.transformOrigin = 'left center'; // Rotate from center

                container.appendChild(streak);

                const angle = (i / streakCount) * 360; // Distribute globally
                const velocity = Math.random() * 150 + 100; // Distance

                // Set initial rotation
                gsap.set(streak, {
                    rotation: angle,
                    xPercent: -50,
                    yPercent: -50,
                    opacity: 1,
                    scaleX: 0
                });

                // Shoot out - FASTER (0.7s)
                gsap.to(streak, {
                    x: Math.cos(angle * (Math.PI / 180)) * velocity,
                    y: Math.sin(angle * (Math.PI / 180)) * velocity,
                    scaleX: 1,
                    opacity: 0,
                    duration: 0.7,
                    ease: 'expo.out',
                    onComplete: () => {
                        // shrink tail quickly
                        gsap.to(streak, { scaleX: 0, duration: 0.1 });
                    }
                });
            }

            // 3. Glitter Dust
            const dustCount = 20;
            for (let i = 0; i < dustCount; i++) {
                const dust = document.createElement('div');
                dust.className = 'absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full';
                container.appendChild(dust);

                const angle = Math.random() * 360;
                const dist = Math.random() * 200 + 50;

                gsap.set(dust, { xPercent: -50, yPercent: -50, scale: 0 });

                // Faster dust (0.6 - 0.9s)
                gsap.to(dust, {
                    x: Math.cos(angle * (Math.PI / 180)) * dist,
                    y: Math.sin(angle * (Math.PI / 180)) * dist,
                    scale: 'random(0.5, 1.5)',
                    opacity: 0,
                    duration: 'random(0.6, 0.9)',
                    ease: 'power2.out'
                });
            }

            // Cleanup - Fast duration (0.9s)
            gsap.delayedCall(0.9, () => {
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
            {/* Center Flash */}
            <div className="sport-flash absolute w-64 h-64 bg-white/40 rounded-full blur-3xl opacity-0" />
        </div>
    );
}

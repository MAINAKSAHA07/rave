'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface ComedyEffectProps {
    onComplete?: () => void;
}

export default function ComedyEffect({ onComplete }: ComedyEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            const bubbleCount = 15;
            const bubbles: HTMLDivElement[] = [];
            const colors = ['#A855F7', '#C4B5FD', '#22D3EE']; // Pastel Purple, Lavender, Aqua

            // Create bubbles
            for (let i = 0; i < bubbleCount; i++) {
                const b = document.createElement('div');
                const size = Math.random() * 40 + 30; // 30px to 70px
                const color = colors[Math.floor(Math.random() * colors.length)];

                // Content: 30% chance of text/smile
                let content = '';
                const rand = Math.random();
                if (rand > 0.8) content = '<span class="text-white font-bold text-xs">Ha</span>';
                else if (rand > 0.7) content = '<span class="text-white font-bold text-xs">Haha</span>';
                else if (rand > 0.6) content = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    </svg>
                `;

                b.innerHTML = content;
                b.className = 'absolute rounded-full border-2 flex items-center justify-center backdrop-blur-sm';
                b.style.width = `${size}px`;
                b.style.height = `${size}px`;
                b.style.borderColor = color;
                b.style.backgroundColor = `${color}20`; // 20 hex = ~12% opacity
                b.style.left = `${Math.random() * 80 + 10}%`; // 10% to 90% width
                b.style.bottom = '-10%'; // Start below view

                containerRef.current?.appendChild(b);
                bubbles.push(b);
            }

            // Animate bubbles
            bubbles.forEach((b) => {
                // Float up
                gsap.to(b, {
                    y: -window.innerHeight * 0.6, // Float up 60vh
                    duration: 'random(4, 5.5)',
                    ease: 'power1.out',
                });

                // Wobble
                gsap.to(b, {
                    x: 'random(-50, 50)',
                    rotation: 'random(-20, 20)',
                    duration: 'random(2, 3)',
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });

                // Scale and Fade
                gsap.fromTo(b,
                    { scale: 0.8, opacity: 0 },
                    {
                        scale: 1.1,
                        opacity: 1,
                        duration: 0.5,
                        ease: 'back.out(1.7)',
                        onComplete: () => {
                            // Fade out at end of life
                            gsap.to(b, {
                                opacity: 0,
                                duration: 0.5,
                                delay: Math.random() * 2 + 2.5 // Fade out later (2.5s to 4.5s)
                            });
                        }
                    }
                );
            });

            // Cleanup
            gsap.delayedCall(5, () => {
                if (onComplete) onComplete();
            });

        }, containerRef);

        return () => ctx.revert();
    }, [onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
        />
    );
}

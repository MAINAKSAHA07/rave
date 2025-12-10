'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Music as MusicIcon } from 'lucide-react';

interface MusicEffectProps {
    onComplete?: () => void;
}

export default function MusicEffect({ onComplete }: MusicEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            // 1. Central Ripple - Shockwave effect - scoped to this container
            const ripples = containerRef.current!.querySelectorAll('.music-ripple');
            ripples.forEach((ripple: any, i) => {
                gsap.fromTo(ripple,
                    { scale: 0.5, opacity: 0.8, border: '2px solid rgba(168,85,247,0.5)' },
                    {
                        scale: 2.5,
                        opacity: 0,
                        duration: 2,
                        ease: 'power2.out',
                        delay: i * 0.4
                    }
                );
            });

            // 2. Floating Notes
            const noteCount = 12;
            const notesContainer = containerRef.current!.querySelector('.notes-container');

            for (let i = 0; i < noteCount; i++) {
                const note = document.createElement('div');
                // Randomly choose between text notes or icons if preferred, here using text for simplicity or emojis
                const symbol = Math.random() > 0.5 ? '♪' : '♫';
                note.textContent = symbol;
                note.style.position = 'absolute';
                note.style.color = Math.random() > 0.5 ? '#A855F7' : '#3B82F6'; // Purple or Blue
                note.style.fontSize = `${Math.random() * 20 + 20}px`; // 20-40px
                note.style.left = `${Math.random() * 80 + 10}%`; // 10-90% width
                note.style.bottom = '10%';
                note.style.opacity = '0';
                note.style.textShadow = '0 0 10px currentColor';
                note.style.fontFamily = 'serif'; // Classic music note look

                notesContainer?.appendChild(note);

                // Animate Note
                gsap.to(note, {
                    y: -window.innerHeight * 0.5, // Float up
                    x: 'random(-30, 30)', // Drift
                    rotation: 'random(-20, 20)',
                    opacity: 0, // Fade out at end
                    duration: 'random(2, 4)',
                    ease: 'power1.out',
                    delay: Math.random() * 1.5,
                    onStart: () => {
                        gsap.to(note, { opacity: 1, duration: 0.5 });
                    }
                });
            }

            // Cleanup
            gsap.delayedCall(4, () => {
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
            {/* Ripples */}
            <div className="absolute w-32 h-32 rounded-full border border-purple-500 music-ripple box-border" />
            <div className="absolute w-32 h-32 rounded-full border border-blue-500 music-ripple box-border" />
            <div className="absolute w-32 h-32 rounded-full border border-purple-500 music-ripple box-border" />

            {/* Notes Container */}
            <div className="notes-container absolute inset-0" />
        </div>
    );
}

'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface FoodEffectProps {
    onComplete?: () => void;
}

export default function FoodEffect({ onComplete }: FoodEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            // Steam paths - curved vertical lines
            const steamPaths = [
                "M10,50 Q20,40 10,30 T10,10",
                "M20,50 Q10,40 20,30 T20,10",
                "M15,50 Q25,40 15,30 T15,10",
            ];

            const steamContainer = containerRef.current!.querySelector('.steam-container');

            // Generate multiple steam wisps
            const wispCount = 15;

            for (let i = 0; i < wispCount; i++) {
                const svgNS = "http://www.w3.org/2000/svg";
                const svg = document.createElementNS(svgNS, "svg");
                const path = document.createElementNS(svgNS, "path");

                svg.setAttribute("width", "40");
                svg.setAttribute("height", "100");
                svg.setAttribute("viewBox", "0 0 30 60");
                svg.style.position = "absolute";
                svg.style.left = `${Math.random() * 60 + 20}%`; // 20-80% width
                svg.style.bottom = "0";
                svg.style.opacity = "0";
                svg.style.overflow = "visible";

                const randomPath = steamPaths[Math.floor(Math.random() * steamPaths.length)];
                path.setAttribute("d", randomPath);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", "white");
                path.setAttribute("stroke-width", "2");
                path.setAttribute("stroke-linecap", "round");
                path.style.filter = "blur(4px)";

                svg.appendChild(path);
                steamContainer?.appendChild(svg);

                // Animate each wisp
                const tl = gsap.timeline();
                const delay = Math.random() * 2; // Random delay between 0 and 2s

                tl.to(svg, {
                    y: -150, // Floating up
                    opacity: 0, // Fading out at the end
                    duration: 3,
                    ease: "power1.out",
                    delay: delay,
                    onStart: () => {
                        // Fade in at start
                        gsap.to(svg, { opacity: 0.4, duration: 1 });
                    }
                });

                // Scale up slightly as it rises
                gsap.to(svg, {
                    scale: 1.5,
                    transformOrigin: "bottom center",
                    duration: 3,
                    ease: "none",
                    delay: delay
                });
            }

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
            className="fixed inset-0 pointer-events-none z-[100] flex items-end justify-center overflow-hidden pb-20"
        >
            <div className="steam-container relative w-64 h-64" />
        </div>
    );
}

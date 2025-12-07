'use client';

import { useEffect, useRef, useState } from 'react';

interface BounceCardsProps {
  images: string[];
  className?: string;
  containerWidth?: number;
  containerHeight?: number;
  animationDelay?: number;
  animationStagger?: number;
  easeType?: string;
  transformStyles?: string[];
  enableHover?: boolean;
}

export default function BounceCards({
  images,
  className = '',
  containerWidth = 360,
  containerHeight = 160,
  animationDelay = 0.8,
  animationStagger = 0.08,
  easeType = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  transformStyles = [],
  enableHover = true,
}: BounceCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animatedCards, setAnimatedCards] = useState<Set<number>>(new Set());

  // Card dimensions - vertical cards like in reference
  const cardWidth = 100;
  const cardHeight = containerHeight;
  const cardSpacing = 35; // Horizontal spacing between card centers (creates overlap)

  useEffect(() => {
    if (!containerRef.current || images.length === 0) return;

    // Trigger staggered animations for each card
    const timers: NodeJS.Timeout[] = [];
    
    images.forEach((_, index) => {
      const delay = (animationDelay * 1000) + (index * animationStagger * 1000);
      const timer = setTimeout(() => {
        setAnimatedCards(prev => new Set([...prev, index]));
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [images, animationDelay, animationStagger]);

  if (!images || images.length === 0) return null;

  // Calculate center position for the fan
  // Cards overlap, so we need less total width
  const totalWidth = (images.length - 1) * cardSpacing + cardWidth;
  const startX = (containerWidth - totalWidth) / 2;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      {images.map((image, index) => {
        // Calculate position for fan arrangement
        const xOffset = startX + (index * cardSpacing);
        
        // Parse rotation and translate from transformStyles
        let rotation = 0;
        let translateX = 0;
        
        if (transformStyles[index]) {
          const rotateMatch = transformStyles[index].match(/rotate\(([^)]+)\)/);
          const translateMatch = transformStyles[index].match(/translateX\(([^)]+)\)/);
          rotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
          translateX = translateMatch ? parseFloat(translateMatch[1].replace('px', '')) : 0;
        } else {
          // Default fan rotation - cards fan out from center
          rotation = (index - (images.length - 1) / 2) * 6;
        }

        // Initial state (before animation) - cards start rotated more and offset
        const initialRotation = rotation + (index % 2 === 0 ? 20 : -20);
        const initialTranslateX = translateX + (index % 2 === 0 ? -30 : 30);
        const initialScale = 0.7;
        
        // Final state (after animation)
        const finalRotation = rotation;
        const finalTranslateX = translateX;
        
        const isCardAnimated = animatedCards.has(index);
        
        const currentTransform = isCardAnimated
          ? `rotate(${finalRotation}deg) translateX(${finalTranslateX}px) scale(1)`
          : `rotate(${initialRotation}deg) translateX(${initialTranslateX}px) scale(${initialScale})`;
        
        const currentOpacity = isCardAnimated ? 1 : 0;

        return (
          <div
            key={index}
            className="bounce-card absolute overflow-hidden cursor-pointer rounded-2xl"
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              left: `${xOffset}px`,
              top: '0',
              transform: currentTransform,
              opacity: currentOpacity,
              zIndex: images.length - index,
              border: '3px solid white',
              borderRadius: '16px',
              transition: isCardAnimated 
                ? `transform 0.8s ${easeType}, opacity 0.6s ease-out`
                : 'none',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={(e) => {
              if (enableHover && isCardAnimated) {
                e.currentTarget.style.transform = `rotate(0deg) translateX(${finalTranslateX}px) scale(1.15)`;
                e.currentTarget.style.zIndex = '100';
                e.currentTarget.style.transition = 'transform 0.3s ease-out';
              }
            }}
            onMouseLeave={(e) => {
              if (enableHover && isCardAnimated) {
                e.currentTarget.style.transform = `rotate(${finalRotation}deg) translateX(${finalTranslateX}px) scale(1)`;
                e.currentTarget.style.zIndex = String(images.length - index);
                e.currentTarget.style.transition = `transform 0.3s ease-out`;
              }
            }}
          >
            <img
              src={image}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          </div>
        );
      })}
    </div>
  );
}


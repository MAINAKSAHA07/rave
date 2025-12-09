'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        // Calculate days
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        // Calculate remaining time after days
        const remainingAfterDays = difference % (1000 * 60 * 60 * 24);
        // Calculate hours (0-23)
        const hours = Math.floor(remainingAfterDays / (1000 * 60 * 60));
        // Calculate minutes
        const minutes = Math.floor((remainingAfterDays % (1000 * 60 * 60)) / (1000 * 60));
        // Calculate seconds
        const seconds = Math.floor((remainingAfterDays % (1000 * 60)) / 1000);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-1">
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg sm:text-xl leading-none">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[9px] uppercase font-medium mt-0.5">DAYS</span>
        </div>
        <span className="text-white font-bold text-lg sm:text-xl leading-none">:</span>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg sm:text-xl leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[9px] uppercase font-medium mt-0.5">HRS</span>
        </div>
        <span className="text-white font-bold text-lg sm:text-xl leading-none">:</span>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg sm:text-xl leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[9px] uppercase font-medium mt-0.5">MINS</span>
        </div>
        <span className="text-white font-bold text-lg sm:text-xl leading-none">:</span>
        <div className="flex flex-col items-center">
          <span
            className="font-bold text-lg sm:text-xl leading-none"
            style={{
              color: '#FF4747',
              textShadow: '0 0 8px rgba(255, 71, 71, 0.6)',
            }}
          >
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[#9B9B9B] text-[9px] uppercase font-medium mt-0.5">SECS</span>
        </div>
      </div>
    </div>
  );
}



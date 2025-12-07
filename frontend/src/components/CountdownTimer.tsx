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
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
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
      <div className="flex gap-2">
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[10px] uppercase font-medium">Days</span>
        </div>
        <span className="text-[#9B9B9B] text-lg font-bold">:</span>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[10px] uppercase font-medium">Hours</span>
        </div>
        <span className="text-[#9B9B9B] text-lg font-bold">:</span>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-lg">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[10px] uppercase font-medium">Mins</span>
        </div>
        <span className="text-[#9B9B9B] text-lg font-bold">:</span>
        <div className="flex flex-col items-center">
          <span className="text-[#FF4747] font-bold text-lg">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[#9B9B9B] text-[10px] uppercase font-medium">Secs</span>
        </div>
      </div>
    </div>
  );
}


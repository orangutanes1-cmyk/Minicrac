import { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onChange: (val: { x: number; y: number }) => void;
  className?: string;
}

export const Joystick = ({ onChange, className = '' }: JoystickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxDist = rect.width / 2;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);
    
    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;

    setPos({ x: nx, y: ny });
    onChange({ x: nx / maxDist, y: ny / maxDist });
  };

  const handleEnd = () => {
    setPos({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-32 h-32 bg-white/20 rounded-full relative touch-none ${className}`}
      onTouchStart={handleMove}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleMove}
      onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div 
        className="absolute w-12 h-12 bg-white/50 rounded-full"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`
        }}
      />
    </div>
  );
};

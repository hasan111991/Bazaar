import React, { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';

interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTiltDeg?: number;
  glowColor?: string;
}

/**
 * Compositor-friendly 3D perspective tilt wrapper.
 * Automatically disables pointer tilt on touch devices and prefers-reduced-motion.
 */
export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  className = '',
  maxTiltDeg = 6,
  glowColor = 'rgba(99, 102, 241, 0.22)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, spotX: 50, spotY: 50, active: false });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const enabled = canHover && !prefersReducedMotion;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * (maxTiltDeg * 2);
    const rotateX = (0.5 - y) * (maxTiltDeg * 2);
    setTilt({
      rotateX,
      rotateY,
      spotX: Math.round(x * 100),
      spotY: Math.round(y * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    if (!enabled) return;
    setTilt((prev) => ({ ...prev, rotateX: 0, rotateY: 0, active: false }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: enabled
          ? `perspective(1100px) rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg) scale3d(${tilt.active ? 1.015 : 1}, ${tilt.active ? 1.015 : 1}, 1)`
          : undefined,
        transition: tilt.active
          ? 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: enabled ? 'transform' : undefined,
      }}
      className={`relative ${className}`}
    >
      {enabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(360px circle at ${tilt.spotX}% ${tilt.spotY}%, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};

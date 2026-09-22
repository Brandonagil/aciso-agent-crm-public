'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NeuralBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
  nodes?: number;
  connections?: number;
}

export function NeuralBackground({
  className,
  intensity = 'subtle',
  animated = true,
  nodes = 20,
  connections = 8,
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: number[];
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const initNodes = () => {
      nodesRef.current = Array.from({ length: nodes }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        connections: [],
      }));

      // Create connections
      nodesRef.current.forEach((node, i) => {
        const connectionsCount = Math.min(connections, Math.floor(Math.random() * 4) + 1);
        for (let j = 0; j < connectionsCount; j++) {
          const targetIndex = Math.floor(Math.random() * nodesRef.current.length);
          if (targetIndex !== i && !node.connections.includes(targetIndex)) {
            node.connections.push(targetIndex);
          }
        }
      });
    };

    initNodes();

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      // Update node positions
      nodesRef.current.forEach((node) => {
        if (animated) {
          node.x += node.vx;
          node.y += node.vy;

          // Bounce off edges
          if (node.x <= 0 || node.x >= canvas.clientWidth) node.vx *= -1;
          if (node.y <= 0 || node.y >= canvas.clientHeight) node.vy *= -1;

          // Keep in bounds
          node.x = Math.max(0, Math.min(canvas.clientWidth, node.x));
          node.y = Math.max(0, Math.min(canvas.clientHeight, node.y));
        }
      });

      // Style based on intensity
      const getAlpha = () => {
        switch (intensity) {
          case 'subtle': return 0.1;
          case 'medium': return 0.2;
          case 'strong': return 0.3;
          default: return 0.1;
        }
      };

      const alpha = getAlpha();

      // Draw connections
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.lineWidth = 1;

      nodesRef.current.forEach((node) => {
        node.connections.forEach((connectionIndex) => {
          const target = nodesRef.current[connectionIndex];
          if (target) {
            const distance = Math.sqrt(
              Math.pow(node.x - target.x, 2) + Math.pow(node.y - target.y, 2)
            );

            // Only draw connections within reasonable distance
            if (distance < 150) {
              const opacity = alpha * (1 - distance / 150);
              ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
              
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(target.x, target.y);
              ctx.stroke();
            }
          }
        });
      });

      // Draw nodes
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 2})`;
      nodesRef.current.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      if (animated) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [intensity, animated, nodes, connections]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        'opacity-40 dark:opacity-60',
        className
      )}
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}

// AI-themed decorative elements
export function AIDataFlow({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-muted/5 via-accent/5 to-muted/5 animate-pulse" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
    </div>
  );
}

// Subtle ML-inspired accent for data sections
export function MLAccent({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('relative group', className)}>
      {children}
      <div className="absolute -inset-px bg-gradient-to-r from-muted/10 via-accent/10 to-muted/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      <div className="absolute top-0 left-4 w-8 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}

// Professional AI badge for ML-powered features
export function AIBadge({ 
  children, 
  className,
  variant = 'subtle' 
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'subtle' | 'prominent';
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
      variant === 'subtle' 
        ? 'bg-muted/80 text-muted-foreground border border-border/50'
        : 'bg-gradient-to-r from-muted to-accent text-foreground border border-border',
      className
    )}>
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
      {children}
    </div>
  );
}

// Connection lines for related data elements
export function DataConnection({ 
  className,
  direction = 'horizontal' 
}: { 
  className?: string;
  direction?: 'horizontal' | 'vertical';
}) {
  return (
    <div className={cn(
      'relative',
      direction === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
      className
    )}>
      <div className={cn(
        'absolute bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent',
        direction === 'horizontal' ? 'inset-0' : 'inset-y-0 inset-x-0 bg-gradient-to-b'
      )} />
      <div className={cn(
        'absolute bg-primary/40 animate-pulse',
        direction === 'horizontal' 
          ? 'left-1/2 top-0 w-2 h-full transform -translate-x-1/2' 
          : 'top-1/2 left-0 h-2 w-full transform -translate-y-1/2'
      )} />
    </div>
  );
}

export default NeuralBackground;
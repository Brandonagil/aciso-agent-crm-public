'use client';

import React, { useState } from 'react';
import { IconMessageCircle, IconSparkles, IconBrain } from '@tabler/icons-react';
import { useChatIntegration, ChatContext } from '@/lib/utils/chat-integration';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Subtiler Chat-Trigger für Dashboard-Elemente
interface ChatTriggerProps {
  context: ChatContext;
  prompt?: string;
  className?: string;
  iconSize?: number;
  position?: 'top-right' | 'bottom-right' | 'inline';
}

export function ChatTrigger({ 
  context, 
  prompt,
  className,
  iconSize = 16,
  position = 'top-right'
}: ChatTriggerProps) {
  const { openChatWithPrompt } = useChatIntegration();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (prompt) {
      openChatWithPrompt(prompt, context);
    } else {
      // Use the first suggested prompt
      openChatWithPrompt(context.suggestedPrompts[0], context);
    }
  };

  const positionClasses = {
    'top-right': 'absolute top-2 right-2',
    'bottom-right': 'absolute bottom-2 right-2',
    'inline': 'inline-flex'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              positionClasses[position],
              "group/trigger p-1.5 rounded-md transition-all duration-200",
              "hover:bg-muted hover:scale-110 active:scale-95",
              "opacity-0",
              "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/20",
              className
            )}
          >
            <div className="relative">
              <IconMessageCircle 
                size={iconSize} 
                className={cn(
                  "transition-all duration-200",
                  isHovered ? "text-primary" : "text-muted-foreground"
                )}
              />
              {isHovered && (
                <div className="absolute -top-1 -right-1">
                  <IconSparkles 
                    size={8} 
                    className="text-primary animate-pulse" 
                  />
                </div>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs">
            <p className="font-medium">AI-Analyse</p>
            <p className="text-muted-foreground mt-1">
              {prompt || context.suggestedPrompts[0]?.slice(0, 60) + '...'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Floating Action für größere Bereiche
export function FloatingChatAction({ 
  context,
  prompts,
  className 
}: { 
  context: ChatContext;
  prompts: string[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { openChatWithPrompt } = useChatIntegration();

  return (
    <div className={cn("relative", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg",
                "opacity-0",
                "hover:scale-110 active:scale-95",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/20"
              )}
            >
              <IconBrain size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">AI-Analyse starten</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border rounded-lg shadow-xl p-2 space-y-1 min-w-[240px] z-50 animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
          <div className="px-2 py-1 border-b">
            <p className="text-xs font-medium text-slate-600">Schnellanalyse</p>
          </div>
          {prompts.slice(0, 3).map((prompt, index) => (
            <button
              key={index}
              onClick={() => {
                openChatWithPrompt(prompt, context);
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-2 text-xs hover:bg-slate-50 rounded-md transition-colors"
            >
              <div className="flex items-start gap-2">
                <IconSparkles size={12} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{prompt}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Inline Insight Trigger für Text-Bereiche
export function InsightTrigger({ 
  context,
  prompt,
  children,
  className,
  variant,
  size,
  ...props
}: { 
  context: ChatContext;
  prompt: string;
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  const { openChatWithPrompt } = useChatIntegration();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => openChatWithPrompt(prompt, context)}
            className={cn(
              "group/insight relative inline-flex items-center gap-1",
              (variant || size) && buttonVariants({ variant, size }),
              "hover:text-primary transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-sm",
              className
            )}
            {...props}
          >
            {children}
            <IconSparkles 
              size={12} 
              className="opacity-0 transition-opacity duration-200 text-primary" 
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs max-w-xs">{prompt}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
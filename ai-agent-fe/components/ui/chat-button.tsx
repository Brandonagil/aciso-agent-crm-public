'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { IconMessageCircle, IconBrain } from '@tabler/icons-react';
import { useChatIntegration, ChatContext } from '@/lib/utils/chat-integration';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  context: ChatContext;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  prompt?: string;
}

export function ChatButton({ 
  context, 
  variant = 'outline', 
  size = 'sm', 
  className,
  children,
  prompt
}: ChatButtonProps) {
  const { openChatWithContext, openChatWithPrompt } = useChatIntegration();

  const handleClick = () => {
    if (prompt) {
      openChatWithPrompt(prompt, context);
    } else {
      openChatWithContext(context);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("flex items-center gap-2", className)}
    >
      <IconMessageCircle className="h-4 w-4" />
      {children || 'Mit AI analysieren'}
    </Button>
  );
}

export function QuickChatButton({ 
  context, 
  prompt,
  className 
}: { 
  context: ChatContext; 
  prompt: string;
  className?: string;
}) {
  const { openChatWithPrompt } = useChatIntegration();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openChatWithPrompt(prompt, context)}
      className={cn("text-xs h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity", className)}
    >
      <IconBrain className="h-3 w-3 mr-1" />
      Fragen
    </Button>
  );
}

// Floating Chat Action für spezifische Bereiche
export function FloatingChatAction({ 
  context,
  prompts 
}: { 
  context: ChatContext;
  prompts: string[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { openChatWithPrompt } = useChatIntegration();

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8"
      >
        <IconMessageCircle className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-background border rounded-md shadow-lg p-2 space-y-1 min-w-[200px] z-50">
          {prompts.map((prompt, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => {
                openChatWithPrompt(prompt, context);
                setIsOpen(false);
              }}
              className="w-full justify-start text-xs h-8"
            >
              {prompt}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type ChatBubbleProps = {
  role: 'user' | 'ai';
  content: string;
};

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isAi = role === 'ai';

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full',
        isAi ? 'justify-start' : 'justify-end'
      )}
    >
      {isAi && (
        <Avatar className="h-8 w-8 border-2 border-primary shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-md',
          isAi
            ? 'bg-card text-card-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {content === '...' ? (
           <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-current animate-pulse delay-0"></span>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse delay-150"></span>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse delay-300"></span>
           </div>
        ) : (
            <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
       {!isAi && (
        <Avatar className="h-8 w-8 border-2 border-border shrink-0">
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

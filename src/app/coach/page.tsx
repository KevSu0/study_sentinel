'use client';

import React, {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Bot, User, Send} from 'lucide-react';
import {useProfile} from '@/hooks/use-profile';
import {useLogger} from '@/hooks/use-logger';
import {getDailySummary, getChatbotResponse} from '@/lib/actions';
import {cn} from '@/lib/utils';
import {Skeleton} from '@/components/ui/skeleton';
import {format} from 'date-fns';
import {Card, CardContent, CardFooter} from '@/components/ui/card';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

type DailySummary = {
  evaluation: string;
  motivationalParagraph: string;
};

function ChatBubble({role, content}: ChatMessage) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20">
            <Bot className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-sm rounded-lg px-4 py-3 text-sm md:max-w-md',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {content.split('\n').map((line, i) => (
          <p key={i} className="mb-1 last:mb-0">
            {line}
          </p>
        ))}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content:
        "Hello! I'm your personal motivation coach. How can I help you on your journey today?",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(true);

  const {profile, isLoaded: profileLoaded} = useProfile();
  const {getPreviousDayLogs, isLoaded: loggerLoaded} = useLogger();
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  useEffect(() => {
    const fetchContext = async () => {
      if (!loggerLoaded || !profileLoaded) return;
      setIsContextLoading(true);
      const sessionDate = new Date();
      if (sessionDate.getHours() < 4) {
        sessionDate.setDate(sessionDate.getDate() - 1);
      }
      const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');

      const storedSummary = localStorage.getItem('dailySummaryContent');
      const lastShownDate = localStorage.getItem('dailySummaryLastShown');

      if (lastShownDate === sessionDateStr && storedSummary) {
        setDailySummary(JSON.parse(storedSummary));
      } else {
        const yesterdaysLogs = getPreviousDayLogs();
        if (yesterdaysLogs.length > 0) {
          const summary = await getDailySummary({
            logs: yesterdaysLogs,
            profile,
          });
          if (summary && !('error' in summary)) {
            setDailySummary(summary as any);
          }
        }
      }
      setIsContextLoading(false);
    };

    fetchContext();
  }, [loggerLoaded, profileLoaded, getPreviousDayLogs, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isChatLoading || isContextLoading) return;

    const userMessage: ChatMessage = {role: 'user', content: inputValue};
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsChatLoading(true);

    // Send the last 10 messages from the history for context, excluding the initial welcome message.
    const history = messages.slice(1).slice(-10);

    const result = await getChatbotResponse({
      message: inputValue,
      history,
      profile,
      dailySummary: dailySummary || undefined,
    });

    if (result && !('error' in result)) {
      const modelMessage: ChatMessage = {
        role: 'model',
        content: result.response,
      };
      setMessages(prev => [...prev, modelMessage]);
    } else {
      const errorMessage: ChatMessage = {
        role: 'model',
        content: "Sorry, I couldn't get a response. Please try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setIsChatLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Bot /> AI Coach
        </h1>
        <p className="text-muted-foreground">
          Your personal positive psychology companion.
        </p>
      </header>
      <main className="flex-1 overflow-hidden p-2 sm:p-4">
        <Card className="h-full flex flex-col">
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <ChatBubble key={index} {...msg} />
                ))}
                {isChatLoading && (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/20">
                        <Bot className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-sm rounded-lg px-4 py-3 bg-muted">
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={
                  isContextLoading
                    ? 'Coach is preparing...'
                    : 'Ask for advice or motivation...'
                }
                disabled={isChatLoading || isContextLoading}
              />
              <Button type="submit" disabled={isChatLoading || isContextLoading}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

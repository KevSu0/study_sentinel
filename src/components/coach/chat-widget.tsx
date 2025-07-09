'use client';

import React, {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Bot, User, Send, Trash2, X} from 'lucide-react';
import {useProfile} from '@/hooks/use-profile';
import {useLogger} from '@/hooks/use-logger';
import {getDailySummary, getChatbotResponse} from '@/lib/actions';
import {cn} from '@/lib/utils';
import {Skeleton} from '@/components/ui/skeleton';
import {format} from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {useChatHistory, type ChatMessage} from '@/hooks/use-chat-history';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
          'max-w-[90%] rounded-lg px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}) => (
              <p className="mb-2 last:mb-0" {...props} />
            ),
            ul: ({node, ...props}) => (
              <ul className="my-2 list-disc pl-5" {...props} />
            ),
            li: ({node, ...props}) => <li className="my-1" {...props} />,
            strong: ({node, ...props}) => (
              <strong
                className={cn(!isUser && 'text-foreground')}
                {...props}
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
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

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    addMessage,
    clearMessages,
    isLoaded: historyLoaded,
  } = useChatHistory();
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
    if (!isOpen) return;

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
  }, [isOpen, loggerLoaded, profileLoaded, getPreviousDayLogs, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isChatLoading || isContextLoading) return;

    const userMessage: ChatMessage = {role: 'user', content: inputValue};

    addMessage(userMessage);
    setInputValue('');
    setIsChatLoading(true);

    const updatedHistory = [...messages, userMessage];

    try {
      const result = await getChatbotResponse({
        chatHistory: updatedHistory.slice(-10),
        profile,
        dailySummary: dailySummary || undefined,
      });

      if (result && 'response' in result && result.response) {
        addMessage({role: 'model', content: result.response});
      } else {
        const errorMessage =
          (result as any)?.error ||
          "Sorry, I couldn't get a response. Please try again.";
        addMessage({
          role: 'model',
          content: `An error occurred: ${errorMessage}`,
        });
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      addMessage({
        role: 'model',
        content: `Sorry, an unexpected error occurred: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Please try again.`,
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const allLoaded = historyLoaded && !isContextLoading;

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg animate-in fade-in-0"
          >
            <Bot className="h-7 w-7 md:h-8 md:h-8" />
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in-0 slide-in-from-bottom-5">
          <Card className="h-[70vh] max-h-[600px] flex flex-col shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot /> AI Coach
              </CardTitle>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={messages.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Clear Chat</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your chat history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearMessages()}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close chat</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                  {!historyLoaded ? (
                    <div className="space-y-6">
                      <Skeleton className="h-16 w-3/4" />
                      <Skeleton className="h-16 w-3/4 ml-auto" />
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <ChatBubble key={index} {...msg} />
                    ))
                  )}
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
                    !allLoaded ? 'Coach is preparing...' : 'Ask for advice...'
                  }
                  disabled={isChatLoading || !allLoaded}
                />
                <Button type="submit" disabled={isChatLoading || !allLoaded}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
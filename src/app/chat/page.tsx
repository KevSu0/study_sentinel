
'use client';

import React, {useState, useRef, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Bot, User, Send, Trash2} from 'lucide-react';
import {useGlobalState} from '@/hooks/use-global-state';
import {useChatHistory, type ChatMessage} from '@/hooks/use-chat-history';
import {getChatbotResponse, getDailySummary} from '@/lib/actions';
import {cn} from '@/lib/utils';
import {Skeleton} from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MessageBubble({message}: {message: ChatMessage}) {
  const isModel = message.role === 'model';
  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full',
        !isModel && 'flex-row-reverse'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
          isModel ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isModel ? <Bot size={20} /> : <User size={20} />}
      </div>
      <div
        className={cn(
          'p-3 rounded-lg max-w-sm md:max-w-md lg:max-w-lg prose prose-sm dark:prose-invert prose-p:my-0',
          isModel ? 'bg-muted' : 'bg-primary text-primary-foreground'
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const {state: globalState} = useGlobalState();
  const {messages, addMessage, clearMessages, isLoaded} = useChatHistory();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isSending) return;

    const newUserMessage: ChatMessage = {role: 'user', content: input};
    const currentMessages = [...messages, newUserMessage];
    addMessage(newUserMessage); // Add user message to UI immediately
    
    setInput('');
    setIsSending(true);

    try {
      const summary = await getDailySummary({
        profile: {
          name: globalState.profile.name || 'Anonymous',
          dream: globalState.profile.dream || 'Not specified',
        },
        tasks: globalState.tasks.filter(task =>
          globalState.todaysCompletedWork.some(
            work => work.subjectId === task.id
          )
        ),
        routines: globalState.routines.filter(routine =>
          globalState.todaysCompletedWork.some(
            work => work.subjectId === routine.id
          )
        ),
        logs: globalState.todaysCompletedWork,
      });

      const upcomingTasks = globalState.tasks.filter(
        t => t.status === 'todo' && new Date(t.date) >= new Date()
      );

      const res = await getChatbotResponse({
        profile: globalState.profile,
        dailySummary: summary,
        chatHistory: currentMessages,
        upcomingTasks: upcomingTasks,
        // Removed weeklyStats to improve performance
      });

      if (res && 'response' in res) {
        addMessage({role: 'model', content: res.response});
      } else {
        addMessage({
          role: 'model',
          content:
            "I'm sorry, I encountered an error and couldn't process your request. Please try again later.",
        });
        if (res && 'error' in res) {
          console.error('Chatbot API error:', res.error);
        } else {
          console.error('Chatbot API error: Unexpected response structure');
        }
      }
    } catch (error) {
      addMessage({
        role: 'model',
        content:
          'There was a network problem. Please check your connection and try again.',
      });
      console.error('Network error calling getChatbotResponse:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-primary">AI Positive Psychologist</h1>
          <p className="text-sm text-muted-foreground">
            Your personal AI motivation coach.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearMessages}
          aria-label="Clear chat history"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Clear Chat</span>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 self-end" />
            <Skeleton className="h-24 w-4/5" />
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))
        )}
        {isSending && (
           <div className="flex items-start gap-3 w-full">
             <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                <Bot size={20} />
             </div>
             <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2" data-testid="sending-indicator">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-0"></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-300"></span>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <div className="relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for encouragement or advice..."
            className="pr-20 min-h-[52px] resize-none"
            rows={1}
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-3 -translate-y-1/2"
            onClick={handleSend}
            disabled={isSending || input.trim() === ''}
          >
            <Send className="h-5 w-5" aria-label="Send message" />
          </Button>
        </div>
      </div>
    </div>
  );
}

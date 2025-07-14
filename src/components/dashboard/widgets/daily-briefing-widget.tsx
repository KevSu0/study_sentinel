'use client';
import React, {useState, useEffect, useMemo} from 'react';
import {format} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Lightbulb, Sparkles} from 'lucide-react';
import {getDailySummary} from '@/lib/actions';
import {LogEvent, UserProfile} from '@/lib/types';

const motivationalQuotes = [
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: 'Sam Levenson',
  },
  {
    quote: 'The expert in anything was once a beginner. Keep learning.',
    author: 'Helen Hayes',
  },
  {
    quote: 'Your future is created by what you do today, not tomorrow.',
    author: 'Robert Kiyosaki',
  },
  {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: 'Theodore Roosevelt',
  },
  {
    quote: 'Push yourself, because no one else is going to do it for you.',
    author: 'Unknown',
  },
  {
    quote: 'Every accomplishment starts with the decision to try.',
    author: 'John F. Kennedy',
  },
  {
    quote: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: 'Unknown',
  },
];

interface DailyBriefingWidgetProps {
  previousDayLogs: LogEvent[];
  profile: UserProfile;
}

export const DailyBriefingWidget = ({
  previousDayLogs,
  profile,
}: DailyBriefingWidgetProps) => {
  const [dailySummary, setDailySummary] = useState<{
    evaluation: string;
    motivationalParagraph: string;
  } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  useEffect(() => {
    const fetchDailySummary = async () => {
      const DAILY_SUMMARY_KEY = 'dailySummaryLastShown';
      const lastShownDate = localStorage.getItem(DAILY_SUMMARY_KEY);
      const now = new Date();
      const currentHour = now.getHours();
      const sessionDate = new Date();
      if (currentHour < 4) sessionDate.setDate(sessionDate.getDate() - 1);
      const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');

      if (lastShownDate === sessionDateStr) {
        setIsSummaryLoading(false);
        return;
      }

      if (previousDayLogs.length > 0) {
        const summary = await getDailySummary({logs: previousDayLogs, profile});
        if (summary && !('error' in summary)) {
          setDailySummary(summary as any);
          localStorage.setItem(DAILY_SUMMARY_KEY, sessionDateStr);
        }
      }
      setIsSummaryLoading(false);
    };
    fetchDailySummary();
  }, [previousDayLogs, profile]);

  const dailyQuote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
  }, []);

  if (isSummaryLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (dailySummary) {
    return (
      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            Your Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-primary/90">
              Yesterday's Evaluation
            </h3>
            <p className="text-sm text-muted-foreground italic">
              {dailySummary.evaluation}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-primary/90">
              Today's Motivation
            </h3>
            <p className="text-sm text-muted-foreground italic">
              {dailySummary.motivationalParagraph}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5">
      <CardContent className="p-4 flex items-center gap-4">
        <Lightbulb className="h-8 w-8 text-yellow-400 shrink-0" />
        <div>
          <p className="italic text-primary/90">"{dailyQuote.quote}"</p>
          <p className="text-sm text-right font-medium text-muted-foreground mt-1">
            - {dailyQuote.author}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

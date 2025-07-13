'use client';

import React, {useState, useEffect} from 'react';
import {format} from 'date-fns';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Sparkles, Lightbulb} from 'lucide-react';
import {getDailySummary} from '@/lib/actions';
import {useLogger} from '@/hooks/use-logger.tsx';
import {useProfile} from '@/hooks/use-profile.tsx';

export default function DailyBriefingPage() {
  const {getPreviousDayLogs, isLoaded: loggerLoaded} = useLogger();
  const {profile, isLoaded: profileLoaded} = useProfile();
  const [dailySummary, setDailySummary] = useState<{
    evaluation: string;
    motivationalParagraph: string;
  } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  useEffect(() => {
    const fetchDailySummary = async () => {
      if (!loggerLoaded || !profileLoaded) return;

      const DAILY_SUMMARY_KEY = 'dailySummaryLastShown';
      const lastShownDate = localStorage.getItem(DAILY_SUMMARY_KEY);
      const now = new Date();
      const currentHour = now.getHours();
      const sessionDate = new Date();

      if (currentHour < 4) {
        sessionDate.setDate(sessionDate.getDate() - 1);
      }
      const sessionDateStr = format(sessionDate, 'yyyy-MM-dd');

      // Check if we already have the summary in state or have shown it today
      const storedSummary = localStorage.getItem('dailySummaryContent');
      if (lastShownDate === sessionDateStr && storedSummary) {
        setDailySummary(JSON.parse(storedSummary));
        setIsSummaryLoading(false);
        return;
      }

      const yesterdaysLogs = getPreviousDayLogs();

      if (yesterdaysLogs.length > 0) {
        const summary = await getDailySummary({logs: yesterdaysLogs, profile});
        if (summary && !('error' in summary)) {
          const summaryData = summary as any;
          setDailySummary(summaryData);
          localStorage.setItem(DAILY_SUMMARY_KEY, sessionDateStr);
          // Store the content as well to avoid re-fetching on the same day
          localStorage.setItem(
            'dailySummaryContent',
            JSON.stringify(summaryData)
          );
        }
      }
      setIsSummaryLoading(false);
    };

    fetchDailySummary();
  }, [loggerLoaded, profileLoaded, getPreviousDayLogs, profile]);

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">AI Daily Briefing</h1>
        <p className="text-muted-foreground">
          Your personalized evaluation and motivation for today.
        </p>
      </header>
      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {isSummaryLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : dailySummary ? (
          <Card className="bg-primary/5 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Sparkles className="h-8 w-8 text-yellow-400" />
                Here's Your Briefing for Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-base">
              <div>
                <h3 className="font-semibold text-primary/90 text-lg mb-2">
                  Yesterday's Performance Evaluation
                </h3>
                <p className="text-muted-foreground italic leading-relaxed">
                  {dailySummary.evaluation}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-primary/90 text-lg mb-2">
                  Your Motivational Kickstart
                </h3>
                <p className="text-muted-foreground italic leading-relaxed">
                  {dailySummary.motivationalParagraph}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/5">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-64">
              <Lightbulb className="h-16 w-16 text-yellow-400 mb-4" />
              <h2 className="text-xl font-semibold text-primary/90">
                No Activity Logged Yesterday
              </h2>
              <p className="text-muted-foreground mt-2">
                Your daily briefing is generated based on your previous day's
                work. Complete some tasks today to get your first briefing
                tomorrow!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

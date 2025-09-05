'use client';
import React, {useState, useEffect} from 'react';
import {format} from 'date-fns';
import {Skeleton} from '@/components/ui/skeleton';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Lightbulb, Sparkles} from 'lucide-react';
import {getDailySummary} from '@/lib/actions';
import {UserProfile, StudyTask, Routine} from '@/lib/types';
import {MotivationalQuote} from '@/components/shared/motivational-quote';

interface DailyBriefingWidgetProps {
  previousDayLogs: LogEvent[];
  profile: UserProfile;
  tasks: StudyTask[];
  routines: Routine[];
}

export const DailyBriefingWidget = ({
  previousDayLogs,
  profile,
  tasks,
  routines,
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
        const summary = await getDailySummary({
          logs: previousDayLogs,
          profile: {
            name: profile.name,
            dream: profile.dream || 'Not specified',
          },
          tasks,
          routines,
        });
        if (summary && !('error' in summary)) {
          setDailySummary(summary as any);
          localStorage.setItem(DAILY_SUMMARY_KEY, sessionDateStr);
        }
      }
      setIsSummaryLoading(false);
    };
    fetchDailySummary();
  }, [previousDayLogs, profile, tasks, routines]);


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
      <CardContent className="p-4 flex items-center justify-center text-center min-h-[120px]">
        <MotivationalQuote />
      </CardContent>
    </Card>
  );
};

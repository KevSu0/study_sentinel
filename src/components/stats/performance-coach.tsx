import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, set, addDays, startOfDay, parse } from 'date-fns';
import { getTimeSinceStudyDayStart } from '@/lib/utils';
import { TrendingUp, TrendingDown, Sunrise, Moon, AlertCircle, Target } from 'lucide-react';

interface Session {
  start: number;
  end: number;
}

interface PerformanceCoachProps {
  todaySeconds: number;
  yesterdaySeconds: number;
  weeklyAverageSeconds: number;
  todaySession: Session | null;
  weekAvgStart: number | null;
  weekAvgEnd: number | null;
  selectedDate: Date;
  idealStartTime?: string;
  idealEndTime?: string;
  dailyStudyGoal?: number;
}

const Highlight = ({ children, color }: { children: React.ReactNode, color: 'green' | 'red' | 'blue' }) => {
  const colorClasses = {
    green: 'text-green-500 font-bold',
    red: 'text-red-500 font-bold',
    blue: 'text-blue-400 font-bold',
  };
  return <span className={colorClasses[color]}>{children}</span>;
};

export const PerformanceCoach: React.FC<PerformanceCoachProps> = ({
  todaySeconds,
  yesterdaySeconds,
  weeklyAverageSeconds,
  todaySession,
  weekAvgStart,
  weekAvgEnd,
  selectedDate,
  idealStartTime = "05:00",
  idealEndTime = "00:00",
  dailyStudyGoal = 8
}) => {
  const formatDuration = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const formatTime = (timestamp: number | null) => {
    if (timestamp === null) return 'N/A';
    return format(new Date(timestamp), 'h:mm a');
  };

  const formatGoalTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return format(set(new Date(), { hours, minutes }), 'h:mm a');
  }

  const productivityComparison = () => {
    const hasYesterdayData = yesterdaySeconds !== undefined && yesterdaySeconds > 0;
    const hasWeeklyData = weeklyAverageSeconds !== undefined && weeklyAverageSeconds > 0;

    const diffYesterday = todaySeconds - yesterdaySeconds;
    const diffWeekly = todaySeconds - weeklyAverageSeconds;

    const todayFormatted = <Highlight color="blue">{formatDuration(todaySeconds)}</Highlight>;

    const yesterdayMessage = () => {
      if (!hasYesterdayData) return null;
      if (diffYesterday > 0) {
        return <>vs. Yesterday: <Highlight color="green">+{formatDuration(diffYesterday)}</Highlight></>;
      }
      if (diffYesterday < 0) {
        return <>vs. Yesterday: <Highlight color="red">-{formatDuration(Math.abs(diffYesterday))}</Highlight></>;
      }
      return <>vs. Yesterday: <Highlight color="blue">Even</Highlight></>;
    };

    const weeklyMessage = () => {
        if (!hasWeeklyData) return null;
        if (diffWeekly > 0) {
            return <>Weekly Avg: <Highlight color="green">+{formatDuration(diffWeekly)}</Highlight></>;
        }
        if (diffWeekly < 0) {
            return <>Weekly Avg: <Highlight color="red">-{formatDuration(Math.abs(diffWeekly))}</Highlight></>;
        }
        return <>Weekly Avg: <Highlight color="blue">Even</Highlight></>;
    }

    return (
      <div className="flex items-start gap-3">
        {diffYesterday >= 0 ? <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" /> : <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />}
        <div>
            <p className="text-sm font-semibold">Today's Study: {todayFormatted}</p>
            <p className="text-sm text-muted-foreground flex gap-4">
                <span>{yesterdayMessage()}</span>
                <span>{weeklyMessage()}</span>
            </p>
        </div>
      </div>
    );
  };
  
  const dailyGoalFeedback = () => {
      const goalInSeconds = (dailyStudyGoal || 0) * 3600;
      const diff = todaySeconds - goalInSeconds;
      let message;

      if (todaySeconds === 0) {
          message = <>Your goal is <Highlight color="blue">{formatDuration(goalInSeconds)}</Highlight>. Let's get started!</>
      } else if (diff >= 0) {
          message = <>Great job! You've surpassed your daily goal of <Highlight color="green">{formatDuration(goalInSeconds)}</Highlight> by <Highlight color="green">{formatDuration(diff)}</Highlight>.</>
      } else {
          message = <>You're on your way! Just <Highlight color="red">{formatDuration(Math.abs(diff))}</Highlight> left to hit your goal of <Highlight color="blue">{formatDuration(goalInSeconds)}</Highlight>.</>
      }
      
      return (
        <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      )
  };

  const timeFeedback = () => {
    if (!todaySession) return <p className="text-sm text-muted-foreground">Log your study time to get start and end time feedback.</p>;

    const idealStartTimeObj = parse(idealStartTime, 'HH:mm', selectedDate);
    const idealEndTimeObj = idealEndTime === "00:00"
        ? set(addDays(selectedDate, 1), { hours: 0, minutes: 0, seconds: 0 })
        : parse(idealEndTime, "HH:mm", selectedDate);

    const todayStartOffset = getTimeSinceStudyDayStart(todaySession.start);
    const idealStartOffset = getTimeSinceStudyDayStart(idealStartTimeObj.getTime());
    
    const startDiff = todayStartOffset !== null && idealStartOffset !== null ? todayStartOffset - idealStartOffset : null;

    const startMsg = () => {
        let idealMsg;
        if (startDiff === null) {
            idealMsg = "Could not determine start time performance.";
        } else if (startDiff > 0) {
            idealMsg = <>Your start of <Highlight color="red">{formatTime(todaySession.start)}</Highlight> is poor. Try starting <Highlight color="red">{formatDuration(startDiff / 1000)} earlier</Highlight> to hit the <Highlight color="blue">{formatGoalTime(idealStartTime)}</Highlight> goal.</>;
        } else {
            idealMsg = <>Your start of <Highlight color="green">{formatTime(todaySession.start)}</Highlight> is excellent! You met the <Highlight color="blue">{formatGoalTime(idealStartTime)}</Highlight> goal.</>;
        }

        let weeklyMsg: React.ReactNode = '';
        if (weekAvgStart && todayStartOffset !== null) {
            const avgStartOffset = getTimeSinceStudyDayStart(weekAvgStart);
            if (avgStartOffset !== null) {
                const startDiffWeekly = todayStartOffset - avgStartOffset;
                if (startDiffWeekly < 0) {
                    weeklyMsg = <> You also started <Highlight color="green">{formatDuration(Math.abs(startDiffWeekly) / 1000)} earlier</Highlight> than your weekly average.</>
                } else if (startDiffWeekly > 0) {
                    weeklyMsg = <> However, you started <Highlight color="red">{formatDuration(startDiffWeekly / 1000)} later</Highlight> than your weekly average.</>
                }
            }
        }

        return <div className="flex items-start gap-3"><Sunrise className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-1" /> <p className="text-sm text-muted-foreground">{idealMsg}{weeklyMsg}</p></div>
    }

    const endMsg = () => {
        let idealMsg;
        if (todaySession.end < idealEndTimeObj.getTime()) {
            const diff = idealEndTimeObj.getTime() - todaySession.end;
            idealMsg = <>Your end time of <Highlight color="red">{formatTime(todaySession.end)}</Highlight> is poor. You need to work for <Highlight color="red">{formatDuration(diff / 1000)} longer</Highlight> to reach the <Highlight color="blue">{formatGoalTime(idealEndTime)}</Highlight> goal.</>;
        } else {
            idealMsg = <>Excellent! Your end time of <Highlight color="green">{formatTime(todaySession.end)}</Highlight> surpasses the <Highlight color="blue">{formatGoalTime(idealEndTime)}</Highlight> goal.</>;
        }

        let weeklyMsg: React.ReactNode = '';
        if (weekAvgEnd) {
            const todayEndOffset = getTimeSinceStudyDayStart(todaySession.end);
            const avgEndOffset = getTimeSinceStudyDayStart(weekAvgEnd);

            if (todayEndOffset !== null && avgEndOffset !== null) {
                const endDiffWeekly = todayEndOffset - avgEndOffset;
                if (endDiffWeekly > 0) {
                    weeklyMsg = <> You also studied for <Highlight color="green">{formatDuration(endDiffWeekly / 1000)} longer</Highlight> than your weekly average.</>
                } else if (endDiffWeekly < 0) {
                    weeklyMsg = <> However, you ended <Highlight color="red">{formatDuration(Math.abs(endDiffWeekly) / 1000)} earlier</Highlight> than your weekly average.</>
                }
            }
        }

        return <div className="flex items-start gap-3"><Moon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" /> <p className="text-sm text-muted-foreground">{idealMsg}{weeklyMsg}</p></div>
    }

    return (
        <div className="space-y-2">
            {startMsg()}
            {endMsg()}
        </div>
    )
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Performance Coach</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {productivityComparison()}
        {dailyGoalFeedback()}
        {timeFeedback()}
      </CardContent>
    </Card>
  );
};

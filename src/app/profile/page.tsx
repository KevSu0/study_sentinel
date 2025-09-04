
'use client';

import React, {useEffect} from 'react';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {useGlobalState} from '@/hooks/use-global-state';
import toast from 'react-hot-toast';
import {Skeleton} from '@/components/ui/skeleton';
import {type UserProfile} from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  passion: z.string().optional(),
  dream: z.string().optional(),
  education: z.string().optional(),
  reasonForUsing: z.string().optional(),
  dailyStudyGoal: z.coerce.number().min(0.5, 'Goal must be at least 0.5 hours.').max(24, 'Goal cannot exceed 24 hours.').optional(),
  idealStartTime: z.string().regex(timeRegex, 'Invalid time (HH:mm)').optional(),
  idealEndTime: z.string().regex(timeRegex, 'Invalid time (HH:mm)').optional(),
  achievementDate: z.string().optional(),
  showCountdown: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const {state, updateProfile, setSoundSettings} = useGlobalState();
  const {profile, isLoaded, soundSettings} = state;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: {errors, isDirty},
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  useEffect(() => {
    if (isLoaded) {
      reset(profile);
    }
  }, [isLoaded, profile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data as UserProfile);
    toast.success('Your information has been updated successfully.');
    reset(data);
  };

  return (
    <div className="flex flex-col">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Your Profile</h1>
        <p className="text-muted-foreground">
          This information helps the AI personalize your motivational messages and goals.
        </p>
      </header>

      <main className="p-2 sm:p-4">
        {!isLoaded ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="pb-6 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                      Tell us a bit about yourself. The more you share, the better
                      the AI can support you.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                          id="name"
                          {...register('name')}
                          placeholder="Your Name"
                          />
                          {errors.name && (
                          <p className="text-sm text-destructive mt-1">
                              {errors.name.message}
                          </p>
                          )}
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder="you@example.com"
                          />
                          {errors.email && (
                          <p className="text-sm text-destructive mt-1">
                              {errors.email.message}
                          </p>
                          )}
                      </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="dailyStudyGoal">Daily Study Goal (Hours)</Label>
                          <Input
                              id="dailyStudyGoal"
                              type="number"
                              step="0.5"
                              {...register('dailyStudyGoal')}
                              placeholder="e.g., 8"
                          />
                          {errors.dailyStudyGoal && (
                              <p className="text-sm text-destructive mt-1">
                              {errors.dailyStudyGoal.message}
                              </p>
                          )}
                          </div>
                      <div className="space-y-2">
                          <Label htmlFor="education">
                          Current Education (Optional)
                          </Label>
                          <Input
                          id="education"
                          {...register('education')}
                          placeholder="e.g., B.S. in Computer Science"
                          />
                      </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <Label htmlFor="achievementDate">Achievement Date</Label>
                          <Input
                          id="achievementDate"
                          type="date"
                          {...register('achievementDate')}
                          />
                      </div>
                      <div className="flex items-center space-x-2 mt-auto">
                          <Controller
                          name="showCountdown"
                          control={control}
                          render={({ field }) => (
                              <Switch
                              id="show-countdown"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              />
                          )}
                          />
                          <Label htmlFor="show-countdown">Show Countdown</Label>
                      </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                          <Label htmlFor="idealStartTime">Ideal Start Time</Label>
                          <Input
                              id="idealStartTime"
                              type="time"
                              {...register('idealStartTime')}
                          />
                          {errors.idealStartTime && (
                              <p className="text-sm text-destructive mt-1">
                              {errors.idealStartTime.message}
                              </p>
                          )}
                          </div>
                          <div className="space-y-2">
                          <Label htmlFor="idealEndTime">Ideal End Time</Label>
                          <Input
                              id="idealEndTime"
                              type="time"
                              {...register('idealEndTime')}
                          />
                          {errors.idealEndTime && (
                              <p className="text-sm text-destructive mt-1">
                              {errors.idealEndTime.message}
                              </p>
                          )}
                          </div>
                      </div>

                      <div className="space-y-2">
                      <Label htmlFor="passion">Your Passion (Optional)</Label>
                      <Textarea
                          id="passion"
                          {...register('passion')}
                          placeholder="What subjects or topics are you most passionate about?"
                      />
                      </div>

                      <div className="space-y-2">
                      <Label htmlFor="dream">Your Dream (Optional)</Label>
                      <Textarea
                          id="dream"
                          {...register('dream')}
                          placeholder="What is the long-term goal you are working towards?"
                      />
                      </div>

                      <div className="space-y-2">
                      <Label htmlFor="reasonForUsing">
                          Why are you using this app? (Optional)
                      </Label>
                      <Textarea
                          id="reasonForUsing"
                          {...register('reasonForUsing')}
                          placeholder="e.g., To build better study habits for my final exams."
                      />
                      </div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Notifications & Sounds</CardTitle>
                      <CardDescription>
                      Manage your alert preferences.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-2">
                          <Label htmlFor="notificationInterval">Motivational Reminder Interval</Label>
                          <Select
                              value={String(soundSettings.notificationInterval)}
                              onValueChange={(value) => setSoundSettings({ notificationInterval: Number(value) })}
                          >
                              <SelectTrigger id="notificationInterval">
                                  <SelectValue placeholder="Select an interval" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="10">Every 10 minutes</SelectItem>
                                  <SelectItem value="15">Every 15 minutes</SelectItem>
                                  <SelectItem value="20">Every 20 minutes</SelectItem>
                                  <SelectItem value="25">Every 25 minutes</SelectItem>
                                  <SelectItem value="30">Every 30 minutes</SelectItem>
                                  <SelectItem value="0">Off</SelectItem>
                              </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Receive a motivational push during long study sessions.</p>
                      </div>
                  </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty}>
                    Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

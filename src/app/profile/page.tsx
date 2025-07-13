'use client';

import React, {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {useProfile, type UserProfile} from '@/hooks/use-profile.tsx';
import {useToast} from '@/hooks/use-toast';
import {Skeleton} from '@/components/ui/skeleton';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  passion: z.string().optional(),
  dream: z.string().optional(),
  education: z.string().optional(),
  reasonForUsing: z.string().optional(),
});

export default function ProfilePage() {
  const {profile, updateProfile, isLoaded} = useProfile();
  const {toast} = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: {errors, isDirty},
  } = useForm<UserProfile>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  useEffect(() => {
    if (isLoaded) {
      reset(profile);
    }
  }, [isLoaded, profile, reset]);

  const onSubmit = (data: UserProfile) => {
    updateProfile(data);
    toast({
      title: 'Profile Saved',
      description: 'Your information has been updated successfully.',
    });
    reset(data); // To reset the dirty state
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Your Profile</h1>
        <p className="text-muted-foreground">
          This information helps the AI personalize your motivational messages.
        </p>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
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
          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
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
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      placeholder="+1 (555) 123-4567"
                    />
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

                <div className="flex justify-end">
                  <Button type="submit" disabled={!isDirty}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}

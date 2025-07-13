// This is a new file for the badge creation/editing dialog.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {useForm, Controller, useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useEffect, useMemo} from 'react';
import type {Badge} from '@/lib/types';
import {useToast} from '@/hooks/use-toast';
import * as Icons from 'lucide-react';
import {ScrollArea} from '../ui/scroll-area';
import {cn} from '@/lib/utils';
import {X} from 'lucide-react';
import {useRoutines} from '@/hooks/use-routines';

const conditionSchema = z.object({
  type: z.enum([
    'TOTAL_STUDY_TIME',
    'TASKS_COMPLETED',
    'DAY_STREAK',
    'ROUTINES_COMPLETED',
    'POINTS_EARNED',
    'TIME_ON_SUBJECT',
    'SINGLE_SESSION_TIME',
    'ALL_TASKS_COMPLETED_ON_DAY',
  ]),
  target: z.coerce
    .number()
    .min(1, 'Target value must be at least 1.')
    .default(1),
  timeframe: z.enum(['TOTAL', 'DAY', 'WEEK', 'MONTH']),
  subjectId: z.string().optional(),
});

const badgeSchema = z.object({
  name: z.string().min(3, 'Badge name must be at least 3 characters.'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters.'),
  icon: z.string().min(1, 'An icon is required.'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color'),
  conditions: z
    .array(conditionSchema)
    .min(1, 'At least one condition is required.'),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

interface BadgeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddBadge: (badge: Omit<Badge, 'id'>) => void;
  onUpdateBadge: (badge: Badge) => void;
  badgeToEdit?: Badge | null;
}

const conditionOptions = [
  {value: 'TOTAL_STUDY_TIME', label: 'Total Study Time'},
  {value: 'TIME_ON_SUBJECT', label: 'Time on Specific Subject'},
  {value: 'POINTS_EARNED', label: 'Points Earned'},
  {value: 'TASKS_COMPLETED', label: 'Tasks Completed'},
  {value: 'ROUTINES_COMPLETED', label: 'Routines Completed'},
  {value: 'DAY_STREAK', label: 'Study Day Streak'},
  {value: 'SINGLE_SESSION_TIME', label: 'Single Session Time'},
  {value: 'ALL_TASKS_COMPLETED_ON_DAY', label: 'Complete All Tasks on a Day'},
];

const timeframeOptions = [
  {value: 'TOTAL', label: 'Overall'},
  {value: 'DAY', label: 'In a Single Day'},
  {value: 'WEEK', label: 'In a Single Week'},
  {value: 'MONTH', label: 'In a Single Month'},
];

// Dynamically get a list of available Lucide icons
const iconList = Object.keys(Icons).filter(
  key =>
    typeof (Icons as any)[key] === 'object' && (Icons as any)[key].displayName
);

export function BadgeDialog({
  isOpen,
  onOpenChange,
  onAddBadge,
  onUpdateBadge,
  badgeToEdit,
}: BadgeDialogProps) {
  const isEditing = !!badgeToEdit;
  const {toast} = useToast();
  const {routines} = useRoutines();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: {errors},
  } = useForm<BadgeFormData>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'Award',
      color: '#a855f7', // Default purple
      conditions: [{type: 'TASKS_COMPLETED', target: 1, timeframe: 'TOTAL'}],
    },
  });

  const {fields, append, remove} = useFieldArray({
    control,
    name: 'conditions',
  });

  const watchedConditions = watch('conditions');

  useEffect(() => {
    if (isOpen) {
      if (isEditing && badgeToEdit) {
        reset({
          name: badgeToEdit.name,
          description: badgeToEdit.description,
          icon: badgeToEdit.icon,
          color: badgeToEdit.color,
          conditions: badgeToEdit.conditions,
        });
      } else {
        reset({
          name: '',
          description: '',
          icon: 'Award',
          color: '#a855f7',
          conditions: [
            {
              type: 'TASKS_COMPLETED',
              target: 1,
              timeframe: 'TOTAL',
              subjectId: undefined,
            },
          ],
        });
      }
    }
  }, [isOpen, isEditing, badgeToEdit, reset]);

  const onSubmit = (data: BadgeFormData) => {
    const badgeData = {
      ...data,
      isCustom: true,
      isEnabled: isEditing ? badgeToEdit.isEnabled : true,
      motivationalMessage:
        "You've achieved your custom goal! Your dedication is inspiring.",
    };

    if (isEditing && badgeToEdit) {
      onUpdateBadge({...badgeToEdit, ...badgeData});
      toast({
        title: 'Badge Updated!',
        description: 'Your changes have been saved.',
      });
    } else {
      onAddBadge(badgeData);
      toast({
        title: 'Badge Created!',
        description: 'Your new challenge is ready.',
      });
    }
    onOpenChange(false);
  };

  const selectedIconName = watch('icon');
  const SelectedIcon = useMemo(
    () => (Icons as any)[selectedIconName] || Icons.Award,
    [selectedIconName]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Badge' : 'Create Custom Badge'}
          </DialogTitle>
          <DialogDescription>
            Design your own challenge. Set the rules and earn your reward.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <ScrollArea className="h-96 pr-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div
                    className="flex items-center justify-center w-20 h-20 rounded-full border-4"
                    style={{borderColor: watch('color')}}
                  >
                    <SelectedIcon
                      className="h-10 w-10"
                      style={{color: watch('color')}}
                    />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Controller
                      name="icon"
                      control={control}
                      render={({field}) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-72">
                              {iconList.map(iconName => (
                                <SelectItem key={iconName} value={iconName}>
                                  {iconName}
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.icon && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.icon.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      {...register('color')}
                      className="p-1 h-10"
                    />
                    {errors.color && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.color.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Badge Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Weekend Warrior"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="e.g., Complete 5 tasks over a weekend."
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Label>Conditions to Earn</Label>
                {fields.map((field, index) => {
                  const watchedType = watchedConditions[index]?.type;
                  const isTimeBased = ['TOTAL_STUDY_TIME', 'TIME_ON_SUBJECT', 'SINGLE_SESSION_TIME'].includes(watchedType);
                  const disableTimeframe = ['DAY_STREAK', 'SINGLE_SESSION_TIME', 'ALL_TASKS_COMPLETED_ON_DAY'].includes(watchedType);
                  const showTargetInput = watchedType !== 'ALL_TASKS_COMPLETED_ON_DAY';


                  return(
                  <div
                    key={field.id}
                    className="flex gap-2 items-end p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="grid flex-1 gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Controller
                          name={`conditions.${index}.type`}
                          control={control}
                          render={({field}) => (
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {conditionOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {watchedType === 'TIME_ON_SUBJECT' && (
                        <div className="space-y-1">
                          <Label className="text-xs">Subject</Label>
                          <Controller
                            name={`conditions.${index}.subjectId`}
                            control={control}
                            render={({field}) => (
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                  {routines.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      )}
                      
                      {showTargetInput && (
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {isTimeBased ? 'Target (Minutes)' : 'Target'}
                          </Label>
                          <Input
                            type="number"
                            {...register(`conditions.${index}.target`)}
                            placeholder={isTimeBased ? "e.g., 120" : "e.g., 10"}
                          />
                        </div>
                      )}
                      
                      <div className={cn(
                          "space-y-1",
                          watchedType === 'TIME_ON_SUBJECT' ? "md:col-span-3" : "md:col-span-1"
                      )}>
                        <Label className="text-xs">Timeframe</Label>
                        <Controller
                          name={`conditions.${index}.timeframe`}
                          control={control}
                          render={({field}) => (
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={disableTimeframe}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeframeOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )})}
                {errors.conditions?.root && (
                  <p className="text-sm text-destructive">
                    {errors.conditions.root.message}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      type: 'TASKS_COMPLETED',
                      target: 10,
                      timeframe: 'TOTAL',
                    })
                  }
                >
                  Add Condition
                </Button>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

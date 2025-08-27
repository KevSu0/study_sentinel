'use client';

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
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useEffect} from 'react';
import type {Badge, BadgeCategory, BadgeConditionType} from '@/lib/types';
import toast from 'react-hot-toast';
import {useGlobalState} from '@/hooks/use-global-state';
import {DurationInput} from './duration-input';
import {IconPicker} from './icon-picker';

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
  count: z.coerce
    .number()
    .min(1, 'Target value must be at least 1.')
    .default(1),
});

const badgeSchema = z.object({
  name: z.string().min(3, 'Badge name must be at least 3 characters.'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters.'),
  icon: z.string().min(1, 'An icon is required.'),
  condition: conditionSchema.optional(),
  category: z.enum(['daily', 'weekly', 'monthly', 'overall']),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

interface BadgeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddBadge: (badge: Omit<Badge, 'id'>) => void;
  onUpdateBadge: (id: string, badge: Partial<Badge>) => void;
  badgeToEdit?: Badge | null;
}

const conditionOptions = [
  {value: 'TASKS_COMPLETED', label: 'Tasks Completed'},
  {value: 'TOTAL_STUDY_TIME', label: 'Total Study Time'},
  {value: 'DAY_STREAK', label: 'Study Day Streak'},
];

export function BadgeDialog({
  isOpen,
  onOpenChange,
  onAddBadge,
  onUpdateBadge,
  badgeToEdit,
}: BadgeDialogProps) {
  const isEditing = !!badgeToEdit;
  const {
    state: {routines},
  } = useGlobalState();

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
      condition: {type: 'TASKS_COMPLETED', count: 1},
      category: 'overall' as BadgeCategory,
    },
  });

  const watchedConditionType = watch('condition.type');
  const watchedIcon = watch('icon');

  useEffect(() => {
    if (isOpen) {
      if (isEditing && badgeToEdit) {
        const formCondition =
          badgeToEdit.conditions && badgeToEdit.conditions.length > 0
            ? {
                type: badgeToEdit.conditions[0].type,
                count: badgeToEdit.conditions[0].target,
              }
            : undefined;

        reset({
          name: badgeToEdit.name,
          description: badgeToEdit.description,
          icon: badgeToEdit.icon,
          condition: formCondition,
          category: badgeToEdit.category,
        });
      } else {
        reset({
          name: '',
          description: '',
          icon: 'Award',
          condition: {type: 'TASKS_COMPLETED', count: 1},
          category: 'overall' as BadgeCategory,
        });
      }
    }
  }, [isOpen, isEditing, badgeToEdit, reset]);

  const onSubmit = (data: BadgeFormData) => {
    if (isEditing && badgeToEdit) {
      // When updating, we only send the fields that can be changed in the dialog
      const updatedData: Partial<Badge> = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        category: data.category,
        conditions: data.condition
          ? [{type: data.condition.type, target: data.condition.count, timeframe: 'TOTAL'}]
          : [],
        requiredCount: data.condition?.count || 1,
      };
      onUpdateBadge(badgeToEdit.id, updatedData);
      toast.success('Badge Updated!');
    } else {
      // When adding, we construct the full badge object
      const newBadge: Omit<Badge, 'id'> = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        category: data.category,
        isCustom: true,
        isEnabled: true,
        conditions: data.condition
          ? [{type: data.condition.type, target: data.condition.count, timeframe: 'TOTAL'}]
          : [],
        requiredCount: data.condition?.count || 1,
      };
      onAddBadge(newBadge);
      toast.success('Badge Created!');
    }
    onOpenChange(false);
  };

  const getTargetLabel = (type?: BadgeConditionType) => {
    switch (type) {
      case 'TOTAL_STUDY_TIME':
        return 'Duration (Minutes)';
      case 'DAY_STREAK':
        return 'Target (Days)';
      case 'TASKS_COMPLETED':
        return 'Target (Count)';
      default:
        return 'Target';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit badge' : 'Create a new badge'}
          </DialogTitle>
          <DialogDescription>
            Fill in the details for your badge.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <Controller
              name="icon"
              control={control}
              render={({field}) => (
                <IconPicker
                  selectedIcon={field.value}
                  onSelectIcon={field.onChange}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <Controller
                name="condition.type"
                control={control}
                render={({field}) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <div className="space-y-2">
              <Label htmlFor="condition.count">{getTargetLabel(watchedConditionType)}</Label>
              {watchedConditionType === 'TOTAL_STUDY_TIME' ? (
                <Controller
                  name="condition.count"
                  control={control}
                  render={({field}) => (
                    <DurationInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              ) : (
                <Input id="condition.count" type="number" {...register('condition.count')} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

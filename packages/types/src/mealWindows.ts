import { z } from 'zod';

export const MEAL_KEYS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type MealKey = (typeof MEAL_KEYS)[number];

export const mealWindowSchema = z.object({
  /** Display / parseable time, e.g. "7:00 AM" */
  start: z.string().min(1),
  end: z.string().min(1),
  label: z.string().min(1),
  timeLabel: z.string().min(1),
});

export const mealWindowsPutSchema = z.object({
  campusId: z.string().min(1),
  windows: z.object({
    breakfast: mealWindowSchema,
    lunch: mealWindowSchema,
    snacks: mealWindowSchema,
    dinner: mealWindowSchema,
  }),
  weekendWindows: z.object({
    breakfast: mealWindowSchema,
    lunch: mealWindowSchema,
    snacks: mealWindowSchema,
    dinner: mealWindowSchema,
  }).optional(),
});

export type MealWindowConfig = z.infer<typeof mealWindowSchema>;
export type MealWindowsDoc = z.infer<typeof mealWindowsPutSchema>;

export const DEFAULT_MEAL_WINDOWS: MealWindowsDoc['windows'] = {
  breakfast: {
    start: '7:30 AM',
    end: '10:00 AM',
    label: 'Breakfast',
    timeLabel: '7:30 AM - 10:00 AM',
  },
  lunch: {
    start: '12:15 PM',
    end: '2:45 PM',
    label: 'Lunch',
    timeLabel: '12:15 PM - 2:45 PM',
  },
  snacks: {
    start: '5:30 PM',
    end: '6:30 PM',
    label: 'Snacks',
    timeLabel: '5:30 PM - 6:30 PM',
  },
  dinner: {
    start: '7:45 PM',
    end: '10:30 PM',
    label: 'Dinner',
    timeLabel: '7:45 PM - 10:30 PM',
  },
};

export const DEFAULT_WEEKEND_MEAL_WINDOWS: MealWindowsDoc['windows'] = {
  breakfast: {
    start: '8:00 AM',
    end: '10:30 AM',
    label: 'Breakfast',
    timeLabel: '8:00 AM - 10:30 AM',
  },
  lunch: {
    start: '12:30 PM',
    end: '3:00 PM',
    label: 'Lunch',
    timeLabel: '12:30 PM - 3:00 PM',
  },
  snacks: {
    start: '5:30 PM',
    end: '6:30 PM',
    label: 'Snacks',
    timeLabel: '5:30 PM - 6:30 PM',
  },
  dinner: {
    start: '7:45 PM',
    end: '10:30 PM',
    label: 'Dinner',
    timeLabel: '7:45 PM - 10:30 PM',
  },
};

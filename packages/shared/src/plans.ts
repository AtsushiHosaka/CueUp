export type Plan = 'free' | 'pro';

export type PlanLimits = {
  activeReminders: number;
  activeCharacters: number;
  customCharacters: number;
  monthlyAiNotifications: number;
  monthlyChats: number;
  notificationHistoryDays: number | null;
};

export const FREE_PLAN_LIMITS = {
  activeReminders: 20,
  activeCharacters: 3,
  customCharacters: 1,
  monthlyAiNotifications: 100,
  monthlyChats: 5,
  notificationHistoryDays: 7,
} as const satisfies PlanLimits;

export const PRO_PLAN_LIMITS = {
  activeReminders: 1000,
  activeCharacters: 100,
  customCharacters: 100,
  monthlyAiNotifications: 5000,
  monthlyChats: 500,
  notificationHistoryDays: null,
} as const satisfies PlanLimits;

export function getPlanLimits(plan: Plan): PlanLimits {
  return plan === 'pro' ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS;
}

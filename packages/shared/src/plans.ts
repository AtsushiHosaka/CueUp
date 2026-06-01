export type Plan = 'free' | 'pro';

export type PlanLimits = {
  activeReminders: number;
  activeCharacters: number;
  customCharacters: number;
  folders: number;
  monthlyAiNotifications: number;
  monthlyChats: number;
  notificationHistoryDays: number | null;
  tags: number;
};

export const FREE_PLAN_LIMITS = {
  activeReminders: 20,
  activeCharacters: 3,
  customCharacters: 1,
  folders: 5,
  monthlyAiNotifications: 100,
  monthlyChats: 5,
  notificationHistoryDays: 7,
  tags: 10,
} as const satisfies PlanLimits;

export const PRO_PLAN_LIMITS = {
  activeReminders: 1000,
  activeCharacters: 100,
  customCharacters: 100,
  folders: 1000,
  monthlyAiNotifications: 5000,
  monthlyChats: 500,
  notificationHistoryDays: null,
  tags: 1000,
} as const satisfies PlanLimits;

export function getPlanLimits(plan: Plan): PlanLimits {
  return plan === 'pro' ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS;
}

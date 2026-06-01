export type SafetyDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: string;
    };

const blockedPatterns = [
  /\bkill\b/i,
  /\bhate speech\b/i,
  /\bself[- ]?harm\b/i,
  /\bsexual\b/i,
  /死ね/,
  /自傷/,
];

export function checkNotificationSafety(text: string): SafetyDecision {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return {
      allowed: false,
      reason: 'empty',
    };
  }

  if (blockedPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      allowed: false,
      reason: 'blocked_content',
    };
  }

  return {
    allowed: true,
  };
}

export type BillingErrorCode =
  | 'BILLING_PRODUCT_NOT_CONFIGURED'
  | 'BILLING_USAGE_LIMIT_EXCEEDED'
  | 'BILLING_VALIDATION_ERROR'
  | 'BILLING_VERIFICATION_FAILED';

export class BillingServiceError extends Error {
  constructor(
    readonly code: BillingErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function billingValidationError(message: string, field: string): BillingServiceError {
  return new BillingServiceError('BILLING_VALIDATION_ERROR', message, { field });
}

export function productNotConfigured(platform: string, productId: string): BillingServiceError {
  return new BillingServiceError(
    'BILLING_PRODUCT_NOT_CONFIGURED',
    'Billing product is not configured',
    {
      platform,
      productId,
    },
  );
}

export function receiptVerificationFailed(reason: string): BillingServiceError {
  return new BillingServiceError('BILLING_VERIFICATION_FAILED', 'Purchase could not be verified', {
    reason,
    restoreAction: 'restore_purchases',
  });
}

export function usageLimitExceeded(kind: string, limit: number): BillingServiceError {
  return new BillingServiceError(
    'BILLING_USAGE_LIMIT_EXCEEDED',
    `Monthly ${kind} limit of ${limit} reached`,
    {
      kind,
      limit,
      upgradeTarget: 'pro',
    },
  );
}

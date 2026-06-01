import type {
  BillingPlatform,
  IsoDateTime,
  PackPurchaseStatus,
  SubscriptionStatus,
  UUID,
} from '@cueup/shared';

import { receiptVerificationFailed } from './billingErrors.js';

export type BillingProductKind = 'character_pack' | 'pro_subscription';

export type BillingProductConfig = {
  id: string;
  displayName: string;
  kind: BillingProductKind;
  platform: BillingPlatform;
  priceLabel: string | null;
  productId: string;
  packId?: UUID;
};

export type ReceiptVerificationInput = {
  platform: BillingPlatform;
  productId: string;
  receipt: string;
  transactionId?: string;
};

export type VerifiedBillingTransaction =
  | {
      kind: 'pro_subscription';
      platform: BillingPlatform;
      productId: string;
      status: SubscriptionStatus;
      transactionId: string;
      purchasedAt: IsoDateTime;
      expiresAt?: IsoDateTime | null;
    }
  | {
      kind: 'character_pack';
      packId: UUID;
      platform: BillingPlatform;
      productId: string;
      status: PackPurchaseStatus;
      transactionId: string;
      purchasedAt: IsoDateTime;
    };

export interface BillingReceiptVerifier {
  verify(input: ReceiptVerificationInput): Promise<VerifiedBillingTransaction>;
}

export class RejectingBillingReceiptVerifier implements BillingReceiptVerifier {
  async verify(): Promise<VerifiedBillingTransaction> {
    throw receiptVerificationFailed('verifier_unconfigured');
  }
}

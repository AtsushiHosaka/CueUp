import type {
  Character,
  NotificationMessage,
  Reminder,
  UsageQuota,
  User,
  UUID,
} from '@cueup/shared';
import { createEmptyUsageQuota } from '@cueup/shared';

import type { AiTextProvider } from './aiProvider.js';
import { buildFallbackNotificationBody, buildNotificationPrompt } from './promptBuilder.js';
import { checkNotificationSafety } from './safetyFilter.js';
import type {
  NotificationMessageRepository,
  UsageQuotaRepository,
} from '../notifications/notificationRepository.js';

export type NotificationMessageIdFactory = () => UUID;

export type GenerateNotificationParams = {
  user: User;
  reminder: Reminder;
  character: Character;
  category?: string;
  now: Date;
};

export type GenerateNotificationResult = {
  message: NotificationMessage;
  quota: UsageQuota;
  providerAttempted: boolean;
  safetyFallbackReason?: string;
};

export class NotificationGenerationService {
  constructor(
    private readonly provider: AiTextProvider,
    private readonly messages: NotificationMessageRepository,
    private readonly quotas: UsageQuotaRepository,
    private readonly idFactory: NotificationMessageIdFactory,
    private readonly maxProviderAttempts = 2,
  ) {}

  async generate(params: GenerateNotificationParams): Promise<GenerateNotificationResult> {
    const period = params.now.toISOString().slice(0, 7);
    const existingQuota =
      (await this.quotas.findByUserAndPeriod(params.user.id, period)) ??
      (await this.quotas.save(
        createEmptyUsageQuota({
          id: this.idFactory(),
          userId: params.user.id,
          period,
          now: params.now.toISOString(),
        }),
      ));
    const promptInput = {
      reminder: params.reminder,
      character: params.character,
      user: params.user,
      ...(params.category === undefined ? {} : { category: params.category }),
    };
    const prompt = buildNotificationPrompt(promptInput);
    const fallbackBody = buildFallbackNotificationBody(promptInput);
    const providerResult = await this.tryGenerateWithProvider(prompt);

    if (providerResult !== undefined) {
      const safetyDecision = checkNotificationSafety(providerResult.text);

      if (safetyDecision.allowed) {
        const quota = await this.quotas.save({
          ...existingQuota,
          aiNotificationCount: existingQuota.aiNotificationCount + 1,
          updatedAt: params.now.toISOString(),
        });
        const message = await this.messages.save({
          id: this.idFactory(),
          userId: params.user.id,
          reminderId: params.reminder.id,
          characterId: params.character.id,
          body: providerResult.text.slice(0, 120),
          generationStatus: 'success',
          aiModel: providerResult.model,
          tokenUsage: providerResult.tokenUsage ?? null,
          createdAt: params.now.toISOString(),
        });

        return {
          message,
          quota,
          providerAttempted: true,
        };
      }

      return this.saveFallback({
        params,
        fallbackBody,
        quota: existingQuota,
        providerAttempted: true,
        safetyFallbackReason: safetyDecision.reason,
      });
    }

    return this.saveFallback({
      params,
      fallbackBody,
      quota: existingQuota,
      providerAttempted: true,
    });
  }

  private async tryGenerateWithProvider(prompt: string) {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxProviderAttempts; attempt += 1) {
      try {
        return await this.provider.generateText({
          prompt,
          maxCharacters: 120,
        });
      } catch (error) {
        lastError = error;
      }
    }

    void lastError;
    return undefined;
  }

  private async saveFallback(params: {
    params: GenerateNotificationParams;
    fallbackBody: string;
    quota: UsageQuota;
    providerAttempted: boolean;
    safetyFallbackReason?: string;
  }): Promise<GenerateNotificationResult> {
    const message = await this.messages.save({
      id: this.idFactory(),
      userId: params.params.user.id,
      reminderId: params.params.reminder.id,
      characterId: params.params.character.id,
      body: params.fallbackBody,
      generationStatus: 'fallback',
      aiModel: null,
      tokenUsage: null,
      createdAt: params.params.now.toISOString(),
    });

    const result = {
      message,
      quota: params.quota,
      providerAttempted: params.providerAttempted,
    };

    if (params.safetyFallbackReason === undefined) {
      return result;
    }

    return {
      ...result,
      safetyFallbackReason: params.safetyFallbackReason,
    };
  }
}

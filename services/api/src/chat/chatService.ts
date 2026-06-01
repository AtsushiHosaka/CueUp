import type {
  Character,
  ChatMessage,
  EntitlementSnapshot,
  UsageQuota,
  User,
  UUID,
} from '@cueup/shared';
import { createEmptyUsageQuota } from '@cueup/shared';

import type { AiTextProvider } from '../ai/aiProvider.js';
import { buildChatPrompt } from '../ai/promptBuilder.js';
import { checkNotificationSafety } from '../ai/safetyFilter.js';
import { CharacterServiceError } from '../characters/characterErrors.js';
import type { CharacterCatalogService } from '../characters/characterCatalogService.js';
import type { Actor } from '../data/accessControl.js';
import type { UsageQuotaRepository } from '../notifications/notificationRepository.js';
import { chatLimitExceeded, ChatServiceError, chatValidationError } from './chatErrors.js';
import type { ChatMessageRepository } from './chatRepository.js';

export type ChatMessageIdFactory = () => UUID;

export type SendChatMessageInput = {
  body: unknown;
  createReminderDraft?: unknown;
};

export type ChatReminderDraft = {
  title: string;
  note: string;
  characterId: UUID;
  sourceMessageId: UUID;
};

export type SendChatMessageResult = {
  messages: ChatMessage[];
  quota: UsageQuota;
  providerAttempted: boolean;
  reminderDraft?: ChatReminderDraft;
};

export class ChatService {
  constructor(
    private readonly catalog: CharacterCatalogService,
    private readonly messages: ChatMessageRepository,
    private readonly quotas: UsageQuotaRepository,
    private readonly provider: AiTextProvider,
    private readonly idFactory: ChatMessageIdFactory,
  ) {}

  async listMessages(params: {
    actor: Actor;
    characterId: UUID;
    entitlement: EntitlementSnapshot;
  }): Promise<ChatMessage[]> {
    const character = await this.requireAvailableCharacter(
      params.actor,
      params.characterId,
      params.entitlement,
    );

    return this.messages.listByUserAndCharacter(params.actor.userId, character.id);
  }

  async sendMessage(params: {
    actor: Actor;
    user: Pick<User, 'id' | 'locale' | 'plan' | 'timezone'>;
    characterId: UUID;
    entitlement: EntitlementSnapshot;
    input: SendChatMessageInput;
    now: Date;
  }): Promise<SendChatMessageResult> {
    const body = normalizeBody(params.input.body);
    const inputSafety = checkNotificationSafety(body);

    if (!inputSafety.allowed) {
      throw new ChatServiceError('CHAT_VALIDATION_ERROR', 'Chat message is not allowed', {
        field: 'body',
        reason: inputSafety.reason,
      });
    }

    const character = await this.requireAvailableCharacter(
      params.actor,
      params.characterId,
      params.entitlement,
    );
    const period = params.now.toISOString().slice(0, 7);
    const existingQuota = await this.getOrCreateQuota(params.user.id, period, params.now);

    if (existingQuota.chatMessageCount >= params.entitlement.limits.monthlyChats) {
      throw chatLimitExceeded(params.entitlement.limits.monthlyChats);
    }

    const history = await this.messages.listByUserAndCharacter(params.actor.userId, character.id);
    const providerResult = await this.generateAssistantReply({
      character,
      history,
      user: params.user,
      userMessage: body,
    });
    const nowIso = params.now.toISOString();
    const savedMessages: ChatMessage[] = [];

    if (!history.some((message) => message.role === 'system')) {
      savedMessages.push(
        await this.messages.save({
          id: this.idFactory(),
          userId: params.actor.userId,
          characterId: character.id,
          role: 'system',
          body: buildSystemMessage(character),
          createdAt: nowIso,
        }),
      );
    }

    const userMessage = await this.messages.save({
      id: this.idFactory(),
      userId: params.actor.userId,
      characterId: character.id,
      role: 'user',
      body,
      createdAt: nowIso,
    });
    const assistantMessage = await this.messages.save({
      id: this.idFactory(),
      userId: params.actor.userId,
      characterId: character.id,
      role: 'assistant',
      body: providerResult.text.trim().slice(0, 600),
      createdAt: nowIso,
    });
    const quota = await this.quotas.save({
      ...existingQuota,
      chatMessageCount: existingQuota.chatMessageCount + 1,
      updatedAt: nowIso,
    });
    const result = {
      messages: [...savedMessages, userMessage, assistantMessage],
      quota,
      providerAttempted: true,
    };

    if (params.input.createReminderDraft !== true) {
      return result;
    }

    return {
      ...result,
      reminderDraft: createReminderDraft(body, character, userMessage.id),
    };
  }

  private async requireAvailableCharacter(
    actor: Actor,
    characterId: UUID,
    entitlement: EntitlementSnapshot,
  ): Promise<Character> {
    try {
      const item = await this.catalog.getCharacter(actor, characterId, entitlement);

      if (item.availability === 'pack_required') {
        throw new ChatServiceError(
          'CHAT_CHARACTER_UNAVAILABLE',
          'Character pack purchase is required for chat',
          {
            reason: 'character_pack_required',
            purchaseTargetPackId: item.purchaseTargetPackId,
          },
        );
      }

      return item.character;
    } catch (error) {
      if (error instanceof ChatServiceError) {
        throw error;
      }

      if (error instanceof CharacterServiceError) {
        if (error.code === 'CHARACTER_ACCESS_DENIED') {
          throw new ChatServiceError('CHAT_ACCESS_DENIED', error.message, error.details);
        }

        if (error.code === 'CHARACTER_NOT_FOUND') {
          throw new ChatServiceError('CHAT_NOT_FOUND', error.message, error.details);
        }

        throw new ChatServiceError('CHAT_CHARACTER_UNAVAILABLE', error.message, error.details);
      }

      throw error;
    }
  }

  private async getOrCreateQuota(userId: UUID, period: string, now: Date): Promise<UsageQuota> {
    const existingQuota = await this.quotas.findByUserAndPeriod(userId, period);

    if (existingQuota !== undefined) {
      return existingQuota;
    }

    return this.quotas.save(
      createEmptyUsageQuota({
        id: this.idFactory(),
        userId,
        period,
        now: now.toISOString(),
      }),
    );
  }

  private async generateAssistantReply(params: {
    character: Character;
    history: ChatMessage[];
    user: Pick<User, 'locale' | 'timezone'>;
    userMessage: string;
  }) {
    try {
      const result = await this.provider.generateText({
        prompt: buildChatPrompt(params),
        maxCharacters: 600,
      });
      const safetyDecision = checkNotificationSafety(result.text);

      if (!safetyDecision.allowed) {
        throw new ChatServiceError('CHAT_PROVIDER_UNAVAILABLE', 'AI reply was blocked by safety', {
          reason: safetyDecision.reason,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof ChatServiceError) {
        throw error;
      }

      throw new ChatServiceError('CHAT_PROVIDER_UNAVAILABLE', 'AI chat reply is unavailable');
    }
  }
}

function normalizeBody(input: unknown): string {
  if (typeof input !== 'string') {
    throw chatValidationError('body is required', 'body');
  }

  const body = input.trim().replace(/\s+/g, ' ');

  if (body.length === 0) {
    throw chatValidationError('body is required', 'body');
  }

  if (body.length > 2000) {
    throw chatValidationError('body must be 2000 characters or fewer', 'body');
  }

  return body;
}

function buildSystemMessage(character: Character): string {
  return [
    `Character: ${character.name}`,
    `Persona: ${character.personaPrompt}`,
    `Strictness: ${character.strictness}/10`,
    `Warmth: ${character.warmth}/10`,
  ].join('\n');
}

function createReminderDraft(
  body: string,
  character: Character,
  sourceMessageId: UUID,
): ChatReminderDraft {
  return {
    title: body.slice(0, 60),
    note: `From chat with ${character.name}: ${body}`,
    characterId: character.id,
    sourceMessageId,
  };
}

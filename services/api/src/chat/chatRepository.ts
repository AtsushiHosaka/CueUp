import type { ChatMessage, UUID } from '@cueup/shared';

export interface ChatMessageRepository {
  listByUserAndCharacter(userId: UUID, characterId: UUID): Promise<ChatMessage[]>;
  save(message: ChatMessage): Promise<ChatMessage>;
}

export class InMemoryChatMessageRepository implements ChatMessageRepository {
  private readonly messages = new Map<UUID, ChatMessage>();

  constructor(initialMessages: ChatMessage[] = []) {
    for (const message of initialMessages) {
      this.messages.set(message.id, message);
    }
  }

  async listByUserAndCharacter(userId: UUID, characterId: UUID): Promise<ChatMessage[]> {
    return [...this.messages.values()]
      .filter((message) => message.userId === userId && message.characterId === characterId)
      .sort(compareMessages);
  }

  async save(message: ChatMessage): Promise<ChatMessage> {
    this.messages.set(message.id, message);
    return message;
  }
}

function compareMessages(a: ChatMessage, b: ChatMessage): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

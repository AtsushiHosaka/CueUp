import type { Character, ChatMessage, Reminder, User } from '@cueup/shared';

export type NotificationPromptInput = {
  reminder: Reminder;
  character: Character;
  user: Pick<User, 'locale' | 'timezone'>;
  category?: string;
};

export type ChatPromptInput = {
  character: Character;
  history: ChatMessage[];
  user: Pick<User, 'locale' | 'timezone'>;
  userMessage: string;
};

export function buildNotificationPrompt(input: NotificationPromptInput): string {
  const catchphrases = input.character.catchphrases?.join(', ') ?? 'none';
  const prohibitedStyle = input.character.prohibitedStyle?.join(', ') ?? 'none';
  const note =
    input.reminder.note == null || input.reminder.note.length === 0 ? 'none' : input.reminder.note;
  const category = input.category ?? 'general';

  return [
    'Create one concise mobile push notification body for CueUp.',
    `Locale: ${input.user.locale}`,
    `Timezone: ${input.user.timezone}`,
    `Reminder title: ${input.reminder.title}`,
    `Reminder note: ${note}`,
    `Usage category: ${category}`,
    `Character name: ${input.character.name}`,
    `Character persona: ${input.character.personaPrompt}`,
    `Strictness: ${input.character.strictness}/10`,
    `Warmth: ${input.character.warmth}/10`,
    `Catchphrases: ${catchphrases}`,
    `Do not use: ${prohibitedStyle}`,
    'Keep it under 120 characters. Do not include unsafe, hateful, sexual, or self-harm content.',
  ].join('\n');
}

export function buildFallbackNotificationBody(input: NotificationPromptInput): string {
  if (input.character.warmth >= input.character.strictness) {
    return `${input.character.name}: ${input.reminder.title} の時間です。少しずつ進めましょう。`;
  }

  return `${input.character.name}: ${input.reminder.title} の時間です。今すぐ取りかかりましょう。`;
}

export function buildChatPrompt(input: ChatPromptInput): string {
  const catchphrases = input.character.catchphrases?.join(', ') ?? 'none';
  const prohibitedStyle = input.character.prohibitedStyle?.join(', ') ?? 'none';
  const recentMessages = input.history
    .filter((message) => message.role !== 'system')
    .slice(-8)
    .map((message) => `${message.role}: ${message.body}`)
    .join('\n');

  return [
    'Reply as a CueUp reminder character in a direct one-on-one chat.',
    `Locale: ${input.user.locale}`,
    `Timezone: ${input.user.timezone}`,
    `Character name: ${input.character.name}`,
    `Character persona: ${input.character.personaPrompt}`,
    `Strictness: ${input.character.strictness}/10`,
    `Warmth: ${input.character.warmth}/10`,
    `Catchphrases: ${catchphrases}`,
    `Do not use: ${prohibitedStyle}`,
    `Recent conversation:\n${recentMessages.length === 0 ? 'none' : recentMessages}`,
    `User message: ${input.userMessage}`,
    'Keep the reply under 600 characters. Do not include unsafe, hateful, sexual, or self-harm content.',
  ].join('\n');
}

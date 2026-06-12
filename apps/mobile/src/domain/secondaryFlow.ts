import {
  FREE_PLAN_LIMITS,
  type Character,
  type ChatMessage,
  type GenerationStatus,
} from '@cueup/shared';

import {
  createPixelPersonaChipModel,
  type PixelBadgeModel,
  type PixelPersonaChipModel,
} from './pixelCharacters';
import { getUiText, type UiText } from '../i18n/uiText';

export type CommerceStatus = 'idle' | 'loading' | 'purchased' | 'failed' | 'restore_failed';
export type ChatUiStatus = 'idle' | 'loading' | 'failed';

export type HistoryItem = {
  id: string;
  reminderId: string;
  characterId: string;
  characterName: string;
  body: string;
  generationStatus: GenerationStatus;
  sentAt: string | null;
  createdAt: string;
};

export type CharacterPack = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  characterIds: string[];
};

export type SecondaryFlowState = {
  historyStatus: 'idle' | 'loading' | 'failed';
  historyItems: HistoryItem[];
  chatStatus: ChatUiStatus;
  chatMessages: ChatMessage[];
  chatInput: string;
  remainingFreeChats: number;
  packs: CharacterPack[];
  purchasedPackIds: string[];
  commerceStatus: CommerceStatus;
  settingsSelection: SettingsDestination | undefined;
};

export type SettingsDestination =
  | 'account'
  | 'plan'
  | 'notifications'
  | 'language'
  | 'data'
  | 'terms'
  | 'privacy'
  | 'logout';

export type HistoryScreenModel = {
  isLoading: boolean;
  emptyMessage?: string;
  rows: Array<{
    id: string;
    title: string;
    body: string;
    detail: string;
    personaChip: PixelPersonaChipModel;
    canChat: boolean;
    statusLabel: string;
    statusBadge: PixelBadgeModel;
    actionLabels: {
      reuse: string;
      chat: string;
      delete: string;
    };
  }>;
  errorMessage?: string;
};

export type ChatScreenModel = {
  characterName: string;
  remainingLabel: string;
  emptyGreeting?: string;
  messages: Array<{
    id: string;
    role: ChatMessage['role'];
    body: string;
  }>;
  errorMessage?: string;
  canSend: boolean;
};

export type ProScreenModel = {
  title: string;
  benefits: string[];
  benefitRows: Array<{
    label: string;
    free: string;
    pro: string;
    iconKey: 'active' | 'ai' | 'history' | 'folders' | 'smartLists' | 'sync';
    priority: 'core' | 'supporting';
  }>;
  addOnNote: string;
  comparisonRows: Array<{
    label: string;
    free: string;
    pro: string;
  }>;
  purchaseLabel: string;
  restoreLabel: string;
  errorMessage?: string;
};

export type PackStoreScreenModel = {
  isLoading: boolean;
  rows: Array<{
    id: string;
    name: string;
    description: string;
    priceLabel: string;
    available: boolean;
    kindLabel: string;
    stateBadge: PixelBadgeModel;
    actionLabel: string;
  }>;
  errorMessage?: string;
};

export type SettingsScreenModel = {
  rows: Array<{
    destination: SettingsDestination;
    title: string;
    detail: string;
    destructive: boolean;
    stateBadge?: PixelBadgeModel;
  }>;
  selectedDetail?: string;
};

const demoNow = '2026-06-01T00:00:00.000Z';
const defaultCopy = getUiText('ja');

export function createSecondaryFlowState(
  now: string = demoNow,
  copy: UiText = defaultCopy,
): SecondaryFlowState {
  return {
    historyStatus: 'idle',
    historyItems: createDemoHistory(now, copy),
    chatStatus: 'idle',
    chatMessages: [],
    chatInput: '',
    remainingFreeChats: FREE_PLAN_LIMITS.monthlyChats,
    packs: createDemoPacks(copy),
    purchasedPackIds: [],
    commerceStatus: 'idle',
    settingsSelection: undefined,
  };
}

export function createDemoHistory(now: string, copy: UiText = defaultCopy): HistoryItem[] {
  return [
    {
      id: 'history-1',
      reminderId: 'reminder-proposal',
      characterId: 'character-boss',
      characterName: 'Strict Boss',
      body: copy.demo.history.bossBody,
      generationStatus: 'success',
      sentAt: now,
      createdAt: now,
    },
    {
      id: 'history-2',
      reminderId: 'reminder-stretch',
      characterId: 'character-friend',
      characterName: 'Gentle Friend',
      body: copy.demo.history.friendBody,
      generationStatus: 'fallback',
      sentAt: null,
      createdAt: now,
    },
  ];
}

export function createDemoPacks(copy: UiText = defaultCopy): CharacterPack[] {
  return [
    {
      id: 'pack-deep-work',
      name: 'Deep Work Pack',
      description: copy.demo.packs.deepWorkDescription,
      priceLabel: '¥480',
      characterIds: ['character-focus-pack'],
    },
    {
      id: 'pack-wellness',
      name: 'Wellness Pack',
      description: copy.demo.packs.wellnessDescription,
      priceLabel: '¥480',
      characterIds: ['character-breathe-pack'],
    },
  ];
}

export function createHistoryScreenModel(
  state: SecondaryFlowState,
  copy: UiText = defaultCopy,
): HistoryScreenModel {
  if (state.historyStatus === 'loading') {
    return {
      isLoading: true,
      rows: [],
    };
  }

  if (state.historyStatus === 'failed') {
    return {
      isLoading: false,
      rows: [],
      errorMessage: copy.history.loadFailed,
    };
  }

  if (state.historyItems.length === 0) {
    return {
      isLoading: false,
      emptyMessage: copy.history.empty,
      rows: [],
    };
  }

  return {
    isLoading: false,
    rows: state.historyItems.map((item) => ({
      id: item.id,
      title: item.body,
      body: item.body,
      detail: `${item.characterName} / ${item.sentAt ?? copy.history.unsent}`,
      personaChip: createPixelPersonaChipModel(
        {
          id: item.characterId,
          name: item.characterName,
          type: 'built_in',
        },
        copy,
      ),
      canChat: item.characterId.trim().length > 0,
      statusLabel: createHistoryStatusLabel(item.generationStatus, copy),
      statusBadge: createHistoryStatusBadge(item.generationStatus, copy),
      actionLabels: {
        reuse: copy.history.reuse,
        chat: copy.history.chat,
        delete: copy.common.delete,
      },
    })),
  };
}

export function createChatScreenModel(
  state: SecondaryFlowState,
  character: Character | undefined,
  copy: UiText = defaultCopy,
): ChatScreenModel {
  const characterName = character?.name ?? copy.chat.assistantNameFallback;

  return {
    characterName,
    remainingLabel: copy.chat.remainingFree(state.remainingFreeChats),
    ...(state.chatMessages.length === 0
      ? {
          emptyGreeting: copy.chat.emptyGreeting(characterName),
        }
      : {}),
    messages: state.chatMessages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        id: message.id,
        role: message.role,
        body: message.body,
      })),
    ...(state.chatStatus === 'failed'
      ? {
          errorMessage: copy.chat.aiFailed,
        }
      : {}),
    canSend: state.chatInput.trim().length > 0 && state.chatStatus !== 'loading',
  };
}

export function createProScreenModel(
  state: SecondaryFlowState,
  copy: UiText = defaultCopy,
): ProScreenModel {
  return {
    title: copy.pro.title,
    benefits: copy.pro.benefits,
    benefitRows: [
      {
        label: copy.pro.activeCue,
        free: `${FREE_PLAN_LIMITS.activeReminders}`,
        pro: '1000',
        iconKey: 'active',
        priority: 'core',
      },
      {
        label: copy.pro.monthlyChat,
        free: `${FREE_PLAN_LIMITS.monthlyChats}`,
        pro: '500',
        iconKey: 'ai',
        priority: 'core',
      },
      {
        label: copy.pro.history,
        free: copy.pro.historyDays(FREE_PLAN_LIMITS.notificationHistoryDays),
        pro: copy.pro.unlimited,
        iconKey: 'history',
        priority: 'core',
      },
      {
        label: copy.pro.foldersTags,
        free: copy.pro.basic,
        pro: copy.pro.included,
        iconKey: 'folders',
        priority: 'supporting',
      },
      {
        label: copy.pro.smartLists,
        free: copy.pro.unavailable,
        pro: copy.pro.included,
        iconKey: 'smartLists',
        priority: 'supporting',
      },
      {
        label: copy.pro.sync,
        free: '1',
        pro: copy.pro.multiDevice,
        iconKey: 'sync',
        priority: 'supporting',
      },
    ],
    addOnNote: copy.pro.addOnNote,
    comparisonRows: [
      {
        label: copy.pro.activeCue,
        free: `${FREE_PLAN_LIMITS.activeReminders}`,
        pro: '1000',
      },
      {
        label: copy.pro.monthlyChat,
        free: `${FREE_PLAN_LIMITS.monthlyChats}`,
        pro: '500',
      },
      {
        label: copy.pro.history,
        free: copy.pro.historyDays(FREE_PLAN_LIMITS.notificationHistoryDays),
        pro: copy.pro.unlimited,
      },
      {
        label: copy.pro.foldersTags,
        free: copy.pro.basic,
        pro: copy.pro.included,
      },
      {
        label: copy.pro.smartLists,
        free: copy.pro.unavailable,
        pro: copy.pro.included,
      },
      {
        label: copy.pro.sync,
        free: '1',
        pro: copy.pro.multiDevice,
      },
    ],
    purchaseLabel: state.commerceStatus === 'loading' ? copy.pro.purchasing : copy.pro.purchase,
    restoreLabel: copy.pro.restore,
    ...commerceError(state, copy),
  };
}

export function createPackStoreScreenModel(
  state: SecondaryFlowState,
  copy: UiText = defaultCopy,
): PackStoreScreenModel {
  return {
    isLoading: state.commerceStatus === 'loading',
    rows: state.packs.map((pack) => {
      const available = state.purchasedPackIds.includes(pack.id);

      return {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        priceLabel: pack.priceLabel,
        available,
        kindLabel: copy.packs.addOnLabel,
        stateBadge: {
          label: available ? copy.packs.available : copy.packs.addOnLabel,
          tone: available ? 'success' : 'neutral',
        },
        actionLabel: available ? copy.packs.available : copy.packs.purchase,
      };
    }),
    ...commerceError(state, copy),
  };
}

export function createSettingsScreenModel(
  state: SecondaryFlowState,
  copy: UiText = defaultCopy,
): SettingsScreenModel {
  const rows: SettingsScreenModel['rows'] = [
    {
      destination: 'account' as const,
      title: copy.settings.rows.account.title,
      detail: copy.settings.rows.account.detail,
      destructive: false,
    },
    {
      destination: 'plan' as const,
      title: copy.settings.rows.plan.title,
      detail: copy.settings.rows.plan.detail,
      destructive: false,
    },
    {
      destination: 'notifications' as const,
      title: copy.settings.rows.notifications.title,
      detail: copy.settings.rows.notifications.detail,
      destructive: false,
    },
    {
      destination: 'language' as const,
      title: copy.settings.rows.language.title,
      detail: copy.settings.rows.language.detail,
      destructive: false,
    },
    {
      destination: 'data' as const,
      title: copy.settings.rows.data.title,
      detail: copy.settings.rows.data.detail,
      destructive: true,
      stateBadge: {
        label: copy.accessibility.destructiveAction,
        tone: 'danger',
      },
    },
    {
      destination: 'terms' as const,
      title: copy.settings.rows.terms.title,
      detail: copy.settings.rows.terms.detail,
      destructive: false,
    },
    {
      destination: 'privacy' as const,
      title: copy.settings.rows.privacy.title,
      detail: copy.settings.rows.privacy.detail,
      destructive: false,
    },
    {
      destination: 'logout' as const,
      title: copy.settings.rows.logout.title,
      detail: copy.settings.rows.logout.detail,
      destructive: true,
      stateBadge: {
        label: copy.accessibility.destructiveAction,
        tone: 'danger',
      },
    },
  ];
  const selected = rows.find((row) => row.destination === state.settingsSelection);

  return {
    rows,
    ...(selected !== undefined
      ? {
          selectedDetail: copy.settings.selectedDetail(selected.title),
        }
      : {}),
  };
}

export function markPackPurchased(state: SecondaryFlowState, packId: string): SecondaryFlowState {
  return {
    ...state,
    commerceStatus: 'purchased',
    purchasedPackIds: state.purchasedPackIds.includes(packId)
      ? state.purchasedPackIds
      : [...state.purchasedPackIds, packId],
  };
}

export function appendChatExchange(
  state: SecondaryFlowState,
  params: {
    characterId: string;
    userId: string;
    body: string;
    now: string;
  },
  copy: UiText = defaultCopy,
): SecondaryFlowState {
  const userMessage: ChatMessage = {
    id: `chat-user-${state.chatMessages.length + 1}`,
    userId: params.userId,
    characterId: params.characterId,
    role: 'user',
    body: params.body,
    createdAt: params.now,
  };
  const assistantMessage: ChatMessage = {
    id: `chat-assistant-${state.chatMessages.length + 2}`,
    userId: params.userId,
    characterId: params.characterId,
    role: 'assistant',
    body: copy.chat.assistantReply,
    createdAt: params.now,
  };

  return {
    ...state,
    chatInput: '',
    chatStatus: 'idle',
    chatMessages: [...state.chatMessages, userMessage, assistantMessage],
    remainingFreeChats: Math.max(0, state.remainingFreeChats - 1),
  };
}

export function mapCommerceFailure(kind: 'purchase' | 'restore'): CommerceStatus {
  return kind === 'purchase' ? 'failed' : 'restore_failed';
}

function commerceError(state: SecondaryFlowState, copy: UiText): { errorMessage?: string } {
  if (state.commerceStatus === 'failed') {
    return {
      errorMessage: copy.commerce.purchaseFailed,
    };
  }

  if (state.commerceStatus === 'restore_failed') {
    return {
      errorMessage: copy.commerce.restoreFailed,
    };
  }

  return {};
}

function createHistoryStatusBadge(status: GenerationStatus, copy: UiText): PixelBadgeModel {
  if (status === 'fallback') {
    return {
      label: copy.history.fallback,
      tone: 'warning',
    };
  }

  if (status === 'failed') {
    return {
      label: copy.history.failed,
      tone: 'danger',
    };
  }

  return {
    label: copy.history.sent,
    tone: 'success',
  };
}

function createHistoryStatusLabel(status: GenerationStatus, copy: UiText): string {
  if (status === 'fallback') {
    return copy.history.fallback;
  }

  if (status === 'failed') {
    return copy.history.failed;
  }

  return copy.history.sent;
}

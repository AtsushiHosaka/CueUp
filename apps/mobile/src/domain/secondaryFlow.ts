import {
  FREE_PLAN_LIMITS,
  type Character,
  type ChatMessage,
  type GenerationStatus,
} from '@cueup/shared';

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
    detail: string;
    canChat: boolean;
    statusLabel: string;
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
  }>;
  selectedDetail?: string;
};

const demoNow = '2026-06-01T00:00:00.000Z';

export function createSecondaryFlowState(now: string = demoNow): SecondaryFlowState {
  return {
    historyStatus: 'idle',
    historyItems: createDemoHistory(now),
    chatStatus: 'idle',
    chatMessages: [],
    chatInput: '',
    remainingFreeChats: FREE_PLAN_LIMITS.monthlyChats,
    packs: createDemoPacks(),
    purchasedPackIds: [],
    commerceStatus: 'idle',
    settingsSelection: undefined,
  };
}

export function createDemoHistory(now: string): HistoryItem[] {
  return [
    {
      id: 'history-1',
      reminderId: 'reminder-proposal',
      characterId: 'character-boss',
      characterName: 'Strict Boss',
      body: '最初の段落だけ書け。完璧さは後でいい。',
      generationStatus: 'success',
      sentAt: now,
      createdAt: now,
    },
    {
      id: 'history-2',
      reminderId: 'reminder-stretch',
      characterId: 'character-friend',
      characterName: 'Gentle Friend',
      body: '一度立って、水を飲んだら戻ってこよう。',
      generationStatus: 'fallback',
      sentAt: null,
      createdAt: now,
    },
  ];
}

export function createDemoPacks(): CharacterPack[] {
  return [
    {
      id: 'pack-deep-work',
      name: 'Deep Work Pack',
      description: '集中、締切、長い作業向けの声を追加します。',
      priceLabel: '¥480',
      characterIds: ['character-focus-pack'],
    },
    {
      id: 'pack-wellness',
      name: 'Wellness Pack',
      description: '休憩、睡眠、運動をやさしく促します。',
      priceLabel: '¥480',
      characterIds: ['character-breathe-pack'],
    },
  ];
}

export function createHistoryScreenModel(state: SecondaryFlowState): HistoryScreenModel {
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
      errorMessage: '通知履歴を読み込めませんでした。',
    };
  }

  if (state.historyItems.length === 0) {
    return {
      isLoading: false,
      emptyMessage: 'まだ通知履歴がありません',
      rows: [],
    };
  }

  return {
    isLoading: false,
    rows: state.historyItems.map((item) => ({
      id: item.id,
      title: item.body,
      detail: `${item.characterName} / ${item.sentAt ?? '未送信'}`,
      canChat: item.characterId.trim().length > 0,
      statusLabel: item.generationStatus === 'fallback' ? 'Fallback' : 'Sent',
    })),
  };
}

export function createChatScreenModel(
  state: SecondaryFlowState,
  character: Character | undefined,
): ChatScreenModel {
  const characterName = character?.name ?? 'Character';

  return {
    characterName,
    remainingLabel: `残り無料 ${state.remainingFreeChats} 回`,
    ...(state.chatMessages.length === 0
      ? {
          emptyGreeting: `${characterName}: まず今つまずいていることを一言で送ってください。`,
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
          errorMessage: '応答を取得できませんでした。',
        }
      : {}),
    canSend: state.chatInput.trim().length > 0 && state.chatStatus !== 'loading',
  };
}

export function createProScreenModel(state: SecondaryFlowState): ProScreenModel {
  return {
    title: 'CueUp Pro',
    benefits: ['Cue とチャット上限を拡張', '通知履歴を長く保存', 'Character Pack を使いやすく管理'],
    comparisonRows: [
      {
        label: 'Active Cue',
        free: `${FREE_PLAN_LIMITS.activeReminders}`,
        pro: '1000',
      },
      {
        label: 'Monthly chat',
        free: `${FREE_PLAN_LIMITS.monthlyChats}`,
        pro: '500',
      },
      {
        label: 'History',
        free: `${FREE_PLAN_LIMITS.notificationHistoryDays} days`,
        pro: 'Unlimited',
      },
    ],
    purchaseLabel: state.commerceStatus === 'loading' ? '購入中' : 'Pro を購入',
    restoreLabel: '購入を復元',
    ...commerceError(state),
  };
}

export function createPackStoreScreenModel(state: SecondaryFlowState): PackStoreScreenModel {
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
        actionLabel: available ? '利用可能' : '購入',
      };
    }),
    ...commerceError(state),
  };
}

export function createSettingsScreenModel(state: SecondaryFlowState): SettingsScreenModel {
  const rows = [
    {
      destination: 'account' as const,
      title: 'アカウント',
      detail: 'ログイン情報とセッション',
      destructive: false,
    },
    {
      destination: 'plan' as const,
      title: 'プラン管理',
      detail: 'Pro と購入履歴',
      destructive: false,
    },
    {
      destination: 'notifications' as const,
      title: '通知設定',
      detail: '許可状態と配信時間',
      destructive: false,
    },
    {
      destination: 'data' as const,
      title: 'データ削除',
      detail: '履歴とアカウント削除',
      destructive: true,
    },
    {
      destination: 'terms' as const,
      title: '利用規約',
      detail: '法的文書',
      destructive: false,
    },
    {
      destination: 'privacy' as const,
      title: 'プライバシーポリシー',
      detail: 'データの扱い',
      destructive: false,
    },
    {
      destination: 'logout' as const,
      title: 'ログアウト',
      detail: 'この端末のセッションを終了',
      destructive: true,
    },
  ];
  const selected = rows.find((row) => row.destination === state.settingsSelection);

  return {
    rows,
    ...(selected !== undefined
      ? {
          selectedDetail: `${selected.title}へ進みます。`,
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
    body: '今できる最小単位に切って、次の5分だけ進めましょう。',
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

function commerceError(state: SecondaryFlowState): { errorMessage?: string } {
  if (state.commerceStatus === 'failed') {
    return {
      errorMessage: '購入に失敗しました。',
    };
  }

  if (state.commerceStatus === 'restore_failed') {
    return {
      errorMessage: '購入の復元に失敗しました。',
    };
  }

  return {};
}

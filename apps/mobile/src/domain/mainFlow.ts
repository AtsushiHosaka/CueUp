import {
  FREE_PLAN_LIMITS,
  type Character,
  type IsoDateTime,
  type Reminder,
  type ReminderStatus,
} from '@cueup/shared';

export type MobileRoute =
  | 'onboarding'
  | 'home'
  | 'reminderForm'
  | 'characterSelect'
  | 'characterCreate'
  | 'proUpsell'
  | 'history'
  | 'chat'
  | 'packStore'
  | 'settings';

export type NotificationPermissionStatus = 'unknown' | 'granted' | 'denied';
export type AsyncStatus = 'idle' | 'loading' | 'saving' | 'failed';
export type ReminderFilter = 'today' | 'all' | 'snoozed';

export type ReminderDraft = {
  title: string;
  note: string;
  scheduledAt: string;
};

export type CustomCharacterDraft = {
  name: string;
  relationship: string;
  tone: string;
  strictness: number;
  warmth: number;
  catchphrases: string[];
  prohibitedStyle: string[];
  icon:
    | {
        status: 'empty';
        iconUrl: null;
        errorMessage: null;
      }
    | {
        status: 'ready';
        iconUrl: string;
        errorMessage: null;
      }
    | {
        status: 'failed';
        iconUrl: null;
        errorMessage: string;
      };
};

export type FlowErrorKind =
  | 'missing_required'
  | 'free_limit'
  | 'network'
  | 'permission_denied'
  | 'forbidden';

export type FlowError = {
  kind: FlowErrorKind;
  message: string;
  actionLabel?: string;
  targetRoute?: MobileRoute;
};

export type ReminderRow = {
  id: string;
  title: string;
  detail: string;
  status: ReminderStatus;
  characterName: string;
  badge?: string;
};

export type HomeScreenModel = {
  filter: ReminderFilter;
  isLoading: boolean;
  skeletonRows: number;
  notificationBanner?: {
    title: string;
    actionLabel: string;
  };
  emptyState?: {
    title: string;
    body: string;
    actionLabel: string;
  };
  rows: ReminderRow[];
  error?: FlowError;
};

export type OnboardingScreenModel = {
  title: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  permissionNotice?: {
    title: string;
    body: string;
    actionLabel: string;
  };
};

export type ReminderFormModel = {
  mode: 'create' | 'edit';
  canSave: boolean;
  saveLabel: string;
  selectedCharacterName: string;
  validationError?: FlowError;
};

export type CharacterCreateModel = {
  canSubmit: boolean;
  previewStatus: 'idle' | 'generating' | 'ready';
  previewText: string;
  validationError?: FlowError;
};

export type CharacterSelectRow = {
  id: string;
  name: string;
  detail: string;
  availability: 'available' | 'pack_required' | 'owner_only';
  selected: boolean;
  actionLabel: string;
};

export type MainFlowState = {
  route: MobileRoute;
  authenticated: boolean;
  notificationPermission: NotificationPermissionStatus;
  reminderFilter: ReminderFilter;
  reminderListStatus: AsyncStatus;
  reminderSavingStatus: AsyncStatus;
  characterSavingStatus: AsyncStatus;
  characterPreviewStatus: 'idle' | 'generating' | 'ready';
  reminders: Reminder[];
  characters: Character[];
  selectedCharacterId: string;
  reminderDraft: ReminderDraft;
  editingReminderId: string | undefined;
  customCharacterDraft: CustomCharacterDraft;
  lastError: FlowError | undefined;
};

const demoNow = '2026-06-01T00:00:00.000Z';

export function createInitialMainFlowState(now: Date = new Date(demoNow)): MainFlowState {
  const characters = createDemoCharacters(now.toISOString());

  return {
    route: 'onboarding',
    authenticated: false,
    notificationPermission: 'unknown',
    reminderFilter: 'today',
    reminderListStatus: 'idle',
    reminderSavingStatus: 'idle',
    characterSavingStatus: 'idle',
    characterPreviewStatus: 'idle',
    reminders: [],
    characters,
    selectedCharacterId: characters[0]?.id ?? 'character-1',
    reminderDraft: createFlowReminderDraft(now),
    editingReminderId: undefined,
    customCharacterDraft: createFlowCustomCharacterDraft(),
    lastError: undefined,
  };
}

export function createDemoMainFlowState(now: Date = new Date(demoNow)): MainFlowState {
  const characters = createDemoCharacters(now.toISOString());

  return {
    ...createInitialMainFlowState(now),
    route: 'home',
    authenticated: true,
    notificationPermission: 'denied',
    reminderListStatus: 'idle',
    reminders: createDemoReminders(now.toISOString()),
    characters,
    selectedCharacterId: characters[0]?.id ?? 'character-1',
  };
}

export function createDemoCharacters(now: IsoDateTime): Character[] {
  return [
    {
      id: 'character-boss',
      type: 'built_in',
      name: 'Strict Boss',
      description: '短く背中を押す',
      personaPrompt: 'Direct accountability character.',
      strictness: 9,
      warmth: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'character-friend',
      type: 'built_in',
      name: 'Gentle Friend',
      description: 'やさしく再開を促す',
      personaPrompt: 'Warm supportive character.',
      strictness: 3,
      warmth: 9,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'character-focus-pack',
      type: 'pack',
      name: 'Focus Sage',
      description: 'Deep Work pack',
      personaPrompt: 'Calm focus character.',
      strictness: 7,
      warmth: 6,
      packId: 'pack-deep-work',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createDemoReminders(now: IsoDateTime): Reminder[] {
  return [
    {
      id: 'reminder-proposal',
      userId: 'user-1',
      title: '提案書の1ページ目を書く',
      note: '見出しだけでも進める',
      scheduledAt: '2026-06-02T09:00:00.000Z',
      recurrenceRule: null,
      characterId: 'character-boss',
      folderId: 'folder-work',
      tagIds: ['tag-work'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'reminder-stretch',
      userId: 'user-1',
      title: '肩を回して水を飲む',
      note: null,
      scheduledAt: '2026-06-03T10:00:00.000Z',
      recurrenceRule: null,
      characterId: 'character-friend',
      folderId: 'folder-health',
      tagIds: ['tag-health'],
      status: 'snoozed',
      snoozedUntil: '2026-06-01T12:20:00.000Z',
      snoozeCount: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createOnboardingScreenModel(
  state: Pick<MainFlowState, 'notificationPermission'>,
): OnboardingScreenModel {
  return {
    title: 'CueUp を始める',
    primaryActionLabel:
      state.notificationPermission === 'granted' ? 'ログインして始める' : '通知を許可',
    secondaryActionLabel: 'あとで設定',
    ...(state.notificationPermission === 'denied'
      ? {
          permissionNotice: {
            title: '通知がオフです',
            body: '設定から通知を許可すると、キャラクターの声で Cue を受け取れます。',
            actionLabel: 'OS 設定を開く',
          },
        }
      : {}),
  };
}

export function createHomeScreenModel(state: MainFlowState, now: Date): HomeScreenModel {
  const rows = selectVisibleReminders(state, now).map((reminder) =>
    createReminderRow(reminder, state.characters),
  );

  return {
    filter: state.reminderFilter,
    isLoading: state.reminderListStatus === 'loading',
    skeletonRows: state.reminderListStatus === 'loading' ? 3 : 0,
    ...(state.notificationPermission === 'denied'
      ? {
          notificationBanner: {
            title: '通知権限がありません',
            actionLabel: '設定を開く',
          },
        }
      : {}),
    ...(state.reminderListStatus !== 'loading' && rows.length === 0
      ? {
          emptyState: {
            title: '最初の Cue を作成しましょう',
            body: '時間、キャラクター、ひとことメモを決めるだけで開始できます。',
            actionLabel: 'Cue を作成',
          },
        }
      : {}),
    rows,
    ...(state.lastError !== undefined ? { error: state.lastError } : {}),
  };
}

export function createReminderFormModel(state: MainFlowState): ReminderFormModel {
  const validationError = validateReminderDraft(state);
  const selectedCharacter = state.characters.find(
    (character) => character.id === state.selectedCharacterId,
  );

  return {
    mode: state.editingReminderId === undefined ? 'create' : 'edit',
    canSave: validationError === undefined && state.reminderSavingStatus !== 'saving',
    saveLabel: state.reminderSavingStatus === 'saving' ? '保存中' : '保存',
    selectedCharacterName: selectedCharacter?.name ?? '未選択',
    ...(validationError !== undefined ? { validationError } : {}),
  };
}

export function createCharacterCreateModel(state: MainFlowState): CharacterCreateModel {
  const canSubmit =
    canSubmitFlowCustomCharacterDraft(state.customCharacterDraft) &&
    state.characterSavingStatus !== 'saving' &&
    state.characterPreviewStatus !== 'generating';
  const name = sanitizeFlowText(state.customCharacterDraft.name) || '新しいキャラクター';

  return {
    canSubmit,
    previewStatus: state.characterPreviewStatus,
    previewText:
      state.characterPreviewStatus === 'generating'
        ? 'プレビュー生成中'
        : `${name} が、次の一歩を短く促します。`,
    ...(!canSubmit
      ? {
          validationError: {
            kind: 'missing_required' as const,
            message: '名前、関係性、話し方を入力してください。',
          },
        }
      : {}),
  };
}

export function createCharacterSelectRows(state: MainFlowState): CharacterSelectRow[] {
  return state.characters.map((character) => {
    const availability =
      character.type === 'pack'
        ? 'pack_required'
        : character.ownerUserId != null && character.ownerUserId !== 'user-1'
          ? 'owner_only'
          : 'available';

    return {
      id: character.id,
      name: character.name,
      detail: character.description ?? character.relationship ?? 'Cue の通知文に使う声',
      availability,
      selected: character.id === state.selectedCharacterId,
      actionLabel:
        availability === 'available'
          ? character.id === state.selectedCharacterId
            ? '選択中'
            : '選択'
          : 'Pro で追加',
    };
  });
}

export function validateReminderDraft(state: MainFlowState): FlowError | undefined {
  if (sanitizeFlowText(state.reminderDraft.title).length === 0) {
    return {
      kind: 'missing_required',
      message: 'タイトルを入力してください。',
    };
  }

  if (state.selectedCharacterId.trim().length === 0) {
    return {
      kind: 'missing_required',
      message: 'キャラクターを選択してください。',
    };
  }

  if (
    state.editingReminderId === undefined &&
    state.reminders.filter((reminder) => reminder.status !== 'deleted').length >=
      FREE_PLAN_LIMITS.activeReminders
  ) {
    return {
      kind: 'free_limit',
      message: 'Free プランの Cue 上限に達しました。',
      actionLabel: 'Pro を見る',
      targetRoute: 'proUpsell',
    };
  }

  return undefined;
}

export function mapApiErrorToFlowError(errorCode: string): FlowError {
  if (errorCode === 'plan_limit_exceeded') {
    return {
      kind: 'free_limit',
      message: 'Free プランの上限に達しました。',
      actionLabel: 'Pro を見る',
      targetRoute: 'proUpsell',
    };
  }

  if (errorCode === 'authentication_required' || errorCode === 'forbidden') {
    return {
      kind: 'forbidden',
      message: 'この操作を行う権限がありません。',
    };
  }

  return {
    kind: 'network',
    message: '通信に失敗しました。時間をおいて再試行してください。',
    actionLabel: '再試行',
  };
}

export function selectVisibleReminders(state: MainFlowState, now: Date): Reminder[] {
  const visible = state.reminders.filter((reminder) => reminder.status !== 'deleted');

  if (state.reminderFilter === 'snoozed') {
    return visible.filter((reminder) => reminder.status === 'snoozed');
  }

  if (state.reminderFilter === 'today') {
    const today = now.toISOString().slice(0, 10);
    return visible.filter(
      (reminder) => reminder.status === 'active' && reminder.scheduledAt.slice(0, 10) === today,
    );
  }

  return [...visible].sort((first, second) => first.scheduledAt.localeCompare(second.scheduledAt));
}

export function completeReminder(
  reminders: Reminder[],
  reminderId: string,
  now: IsoDateTime,
): Reminder[] {
  return reminders.map((reminder) =>
    reminder.id === reminderId
      ? {
          ...reminder,
          status: 'completed',
          completedAt: now,
          updatedAt: now,
        }
      : reminder,
  );
}

export function snoozeReminder(
  reminders: Reminder[],
  reminderId: string,
  snoozedUntil: IsoDateTime,
): Reminder[] {
  return reminders.map((reminder) =>
    reminder.id === reminderId
      ? {
          ...reminder,
          status: 'snoozed',
          snoozedUntil,
          snoozeCount: (reminder.snoozeCount ?? 0) + 1,
          updatedAt: snoozedUntil,
        }
      : reminder,
  );
}

export function deleteReminder(
  reminders: Reminder[],
  reminderId: string,
  now: IsoDateTime,
): Reminder[] {
  return reminders.map((reminder) =>
    reminder.id === reminderId
      ? {
          ...reminder,
          status: 'deleted',
          deletedAt: now,
          updatedAt: now,
        }
      : reminder,
  );
}

function createReminderRow(reminder: Reminder, characters: Character[]): ReminderRow {
  const character = characters.find((item) => item.id === reminder.characterId);
  const scheduled = new Date(reminder.scheduledAt);
  const time = Number.isNaN(scheduled.getTime())
    ? reminder.scheduledAt
    : new Intl.DateTimeFormat('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(scheduled);

  return {
    id: reminder.id,
    title: reminder.title,
    detail: time,
    status: reminder.status,
    characterName: character?.name ?? 'Character',
    ...(reminder.status === 'snoozed' ? { badge: 'Snoozed' } : {}),
  };
}

function createFlowReminderDraft(now: Date): ReminderDraft {
  const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: 'Take the first step',
    note: '',
    scheduledAt: scheduledAt.toISOString(),
  };
}

function createFlowCustomCharacterDraft(): CustomCharacterDraft {
  return {
    name: '',
    relationship: '',
    tone: '',
    strictness: 5,
    warmth: 5,
    catchphrases: [],
    prohibitedStyle: [],
    icon: {
      status: 'empty',
      iconUrl: null,
      errorMessage: null,
    },
  };
}

function sanitizeFlowText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function canSubmitFlowCustomCharacterDraft(draft: CustomCharacterDraft): boolean {
  return (
    sanitizeFlowText(draft.name).length > 0 &&
    sanitizeFlowText(draft.relationship).length > 0 &&
    sanitizeFlowText(draft.tone).length > 0 &&
    draft.icon.status !== 'failed'
  );
}

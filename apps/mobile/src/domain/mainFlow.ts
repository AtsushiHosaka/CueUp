import {
  FREE_PLAN_LIMITS,
  type Character,
  type IsoDateTime,
  type Reminder,
  type ReminderStatus,
} from '@cueup/shared';

import { getUiText, type UiText } from '../i18n/uiText';

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
const defaultCopy = getUiText('ja');

export function createInitialMainFlowState(
  now: Date = new Date(demoNow),
  copy: UiText = defaultCopy,
): MainFlowState {
  const characters = createDemoCharacters(now.toISOString(), copy);

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
    reminderDraft: createFlowReminderDraft(now, copy),
    editingReminderId: undefined,
    customCharacterDraft: createFlowCustomCharacterDraft(),
    lastError: undefined,
  };
}

export function createDemoMainFlowState(
  now: Date = new Date(demoNow),
  copy: UiText = defaultCopy,
): MainFlowState {
  const characters = createDemoCharacters(now.toISOString(), copy);

  return {
    ...createInitialMainFlowState(now, copy),
    route: 'home',
    authenticated: true,
    notificationPermission: 'denied',
    reminderListStatus: 'idle',
    reminders: createDemoReminders(now.toISOString(), copy),
    characters,
    selectedCharacterId: characters[0]?.id ?? 'character-1',
  };
}

export function createDemoCharacters(now: IsoDateTime, copy: UiText = defaultCopy): Character[] {
  return [
    {
      id: 'character-boss',
      type: 'built_in',
      name: 'Strict Boss',
      description: copy.demo.characters.bossDescription,
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
      description: copy.demo.characters.friendDescription,
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
      description: copy.demo.characters.focusDescription,
      personaPrompt: 'Calm focus character.',
      strictness: 7,
      warmth: 6,
      packId: 'pack-deep-work',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createDemoReminders(now: IsoDateTime, copy: UiText = defaultCopy): Reminder[] {
  return [
    {
      id: 'reminder-proposal',
      userId: 'user-1',
      title: copy.demo.reminders.proposalTitle,
      note: copy.demo.reminders.proposalNote,
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
      title: copy.demo.reminders.stretchTitle,
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
  copy: UiText = defaultCopy,
): OnboardingScreenModel {
  return {
    title: copy.onboarding.title,
    primaryActionLabel:
      state.notificationPermission === 'granted'
        ? copy.onboarding.continueSignedIn
        : copy.onboarding.allowNotifications,
    secondaryActionLabel: copy.onboarding.later,
    ...(state.notificationPermission === 'denied'
      ? {
          permissionNotice: {
            title: copy.onboarding.permissionTitle,
            body: copy.onboarding.permissionBody,
            actionLabel: copy.onboarding.openSystemSettings,
          },
        }
      : {}),
  };
}

export function createHomeScreenModel(
  state: MainFlowState,
  now: Date,
  copy: UiText = defaultCopy,
): HomeScreenModel {
  const rows = selectVisibleReminders(state, now).map((reminder) =>
    createReminderRow(reminder, state.characters, copy),
  );

  return {
    filter: state.reminderFilter,
    isLoading: state.reminderListStatus === 'loading',
    skeletonRows: state.reminderListStatus === 'loading' ? 3 : 0,
    ...(state.notificationPermission === 'denied'
      ? {
          notificationBanner: {
            title: copy.home.notificationBannerTitle,
            actionLabel: copy.home.openSettings,
          },
        }
      : {}),
    ...(state.reminderListStatus !== 'loading' && rows.length === 0
      ? {
          emptyState: {
            title: copy.home.emptyTitle,
            body: copy.home.emptyBody,
            actionLabel: copy.home.emptyAction,
          },
        }
      : {}),
    rows,
    ...(state.lastError !== undefined ? { error: state.lastError } : {}),
  };
}

export function createReminderFormModel(
  state: MainFlowState,
  copy: UiText = defaultCopy,
): ReminderFormModel {
  const validationError = validateReminderDraft(state, copy);
  const selectedCharacter = state.characters.find(
    (character) => character.id === state.selectedCharacterId,
  );

  return {
    mode: state.editingReminderId === undefined ? 'create' : 'edit',
    canSave: validationError === undefined && state.reminderSavingStatus !== 'saving',
    saveLabel: state.reminderSavingStatus === 'saving' ? copy.common.saving : copy.common.save,
    selectedCharacterName: selectedCharacter?.name ?? copy.reminderForm.unselectedCharacter,
    ...(validationError !== undefined ? { validationError } : {}),
  };
}

export function createCharacterCreateModel(
  state: MainFlowState,
  copy: UiText = defaultCopy,
): CharacterCreateModel {
  const canSubmit =
    canSubmitFlowCustomCharacterDraft(state.customCharacterDraft) &&
    state.characterSavingStatus !== 'saving' &&
    state.characterPreviewStatus !== 'generating';
  const name = sanitizeFlowText(state.customCharacterDraft.name) || copy.character.defaultNewName;

  return {
    canSubmit,
    previewStatus: state.characterPreviewStatus,
    previewText:
      state.characterPreviewStatus === 'generating'
        ? copy.character.previewGenerating
        : copy.character.previewReady(name),
    ...(!canSubmit
      ? {
          validationError: {
            kind: 'missing_required' as const,
            message: copy.character.validationMissingCore,
          },
        }
      : {}),
  };
}

export function createCharacterSelectRows(
  state: MainFlowState,
  copy: UiText = defaultCopy,
): CharacterSelectRow[] {
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
      detail: character.description ?? character.relationship ?? copy.character.defaultDetail,
      availability,
      selected: character.id === state.selectedCharacterId,
      actionLabel:
        availability === 'available'
          ? character.id === state.selectedCharacterId
            ? copy.common.selected
            : copy.common.select
          : copy.character.packRequiredAction,
    };
  });
}

export function validateReminderDraft(
  state: MainFlowState,
  copy: UiText = defaultCopy,
): FlowError | undefined {
  if (sanitizeFlowText(state.reminderDraft.title).length === 0) {
    return {
      kind: 'missing_required',
      message: copy.errors.titleRequired,
    };
  }

  if (state.selectedCharacterId.trim().length === 0) {
    return {
      kind: 'missing_required',
      message: copy.errors.characterRequired,
    };
  }

  if (
    state.editingReminderId === undefined &&
    state.reminders.filter((reminder) => reminder.status !== 'deleted').length >=
      FREE_PLAN_LIMITS.activeReminders
  ) {
    return {
      kind: 'free_limit',
      message: copy.errors.freeCueLimit,
      actionLabel: copy.errors.upgradeToPro,
      targetRoute: 'proUpsell',
    };
  }

  return undefined;
}

export function mapApiErrorToFlowError(errorCode: string, copy: UiText = defaultCopy): FlowError {
  if (errorCode === 'plan_limit_exceeded') {
    return {
      kind: 'free_limit',
      message: copy.errors.freePlanLimit,
      actionLabel: copy.errors.upgradeToPro,
      targetRoute: 'proUpsell',
    };
  }

  if (errorCode === 'authentication_required' || errorCode === 'forbidden') {
    return {
      kind: 'forbidden',
      message: copy.errors.forbidden,
    };
  }

  return {
    kind: 'network',
    message: copy.errors.network,
    actionLabel: copy.common.retry,
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

function createReminderRow(reminder: Reminder, characters: Character[], copy: UiText): ReminderRow {
  const character = characters.find((item) => item.id === reminder.characterId);
  const scheduled = new Date(reminder.scheduledAt);
  const time = Number.isNaN(scheduled.getTime())
    ? reminder.scheduledAt
    : new Intl.DateTimeFormat(copy.locale === 'en' ? 'en-US' : 'ja-JP', {
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
    characterName: character?.name ?? copy.chat.assistantNameFallback,
    ...(reminder.status === 'snoozed' ? { badge: copy.home.filters.snoozed } : {}),
  };
}

function createFlowReminderDraft(now: Date, copy: UiText): ReminderDraft {
  const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: copy.demo.defaultReminderTitle,
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

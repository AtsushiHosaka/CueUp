export type SupportedLocale = 'ja' | 'en';

export type UiText = {
  locale: SupportedLocale;
  tabs: {
    home: string;
    history: string;
    chat: string;
    store: string;
    settings: string;
  };
  common: {
    back: string;
    create: string;
    delete: string;
    edit: string;
    retry: string;
    save: string;
    saving: string;
    select: string;
    selected: string;
  };
  persona: {
    fictionalLabel: string;
    safetyHelper: string;
    customSafetyHelper: string;
    selectedBadge: string;
    lockedBadge: string;
    ownerOnlyBadge: string;
    availability: {
      available: string;
      selected: string;
      locked: string;
      ownerOnly: string;
    };
    archetypes: {
      boss: string;
      friend: string;
      coach: string;
      focus: string;
      wellness: string;
      creator: string;
      custom: string;
      default: string;
    };
    tones: {
      direct: string;
      gentle: string;
      momentum: string;
      focused: string;
      calm: string;
      original: string;
      balanced: string;
    };
  };
  onboarding: {
    title: string;
    body: string;
    allowNotifications: string;
    continueSignedIn: string;
    later: string;
    loginContinue: string;
    permissionTitle: string;
    permissionBody: string;
    openSystemSettings: string;
  };
  home: {
    kicker: string;
    title: string;
    newReminder: string;
    filters: {
      today: string;
      all: string;
      snoozed: string;
    };
    notificationBannerTitle: string;
    openSettings: string;
    emptyTitle: string;
    emptyBody: string;
    emptyAction: string;
    sampleSync: string;
    active: string;
    completed: string;
    complete: string;
    snoozeTenMinutes: string;
    freeCueLimit: (limit: number) => string;
  };
  reminderForm: {
    createKicker: string;
    editKicker: string;
    title: string;
    titleLabel: string;
    noteLabel: string;
    scheduledAtLabel: string;
    characterLabel: string;
    unselectedCharacter: string;
  };
  character: {
    selectKicker: string;
    selectTitle: string;
    createKicker: string;
    createTitle: string;
    name: string;
    relationship: string;
    tone: string;
    strictness: string;
    warmth: string;
    preview: string;
    applyPreview: string;
    generatePreview: string;
    previewGenerating: string;
    defaultNewName: string;
    defaultDetail: string;
    packRequiredAction: string;
    ownerOnlyAction: string;
    validationMissingCore: string;
    createSafetyHelper: string;
    previewReady: (name: string) => string;
  };
  history: {
    kicker: string;
    title: string;
    reload: string;
    loadComplete: string;
    empty: string;
    emptyBody: string;
    loadFailed: string;
    reuse: string;
    chat: string;
    unsent: string;
    sent: string;
    fallback: string;
    failed: string;
  };
  chat: {
    kicker: string;
    you: string;
    messageLabel: string;
    send: string;
    createCue: string;
    simulateFailure: string;
    resend: string;
    assistantNameFallback: string;
    aiFailed: string;
    reminderFallbackTitle: string;
    remainingFree: (count: number) => string;
    emptyGreeting: (characterName: string) => string;
    assistantReply: string;
  };
  pro: {
    kicker: string;
    title: string;
    benefits: string[];
    organizationBenefits: string[];
    addOnNote: string;
    foldersTags: string;
    smartLists: string;
    sync: string;
    basic: string;
    included: string;
    multiDevice: string;
    unavailable: string;
    activeCue: string;
    monthlyChat: string;
    history: string;
    unlimited: string;
    historyDays: (days: number) => string;
    purchase: string;
    purchasing: string;
    restore: string;
    showPurchaseFailure: string;
    home: string;
    comparison: (free: string, pro: string) => string;
  };
  packs: {
    kicker: string;
    title: string;
    addOnLabel: string;
    restore: string;
    available: string;
    purchase: string;
    showPurchaseFailure: string;
  };
  settings: {
    kicker: string;
    title: string;
    open: string;
    languageToggle: string;
    selectedDetail: (title: string) => string;
    rows: {
      account: {
        title: string;
        detail: string;
      };
      plan: {
        title: string;
        detail: string;
      };
      notifications: {
        title: string;
        detail: string;
      };
      language: {
        title: string;
        detail: string;
      };
      data: {
        title: string;
        detail: string;
      };
      terms: {
        title: string;
        detail: string;
      };
      privacy: {
        title: string;
        detail: string;
      };
      logout: {
        title: string;
        detail: string;
      };
    };
  };
  commerce: {
    purchase: string;
    restore: string;
    purchaseFailed: string;
    restoreFailed: string;
  };
  accessibility: {
    destructiveAction: string;
    loading: string;
  };
  errors: {
    titleRequired: string;
    characterRequired: string;
    freeCueLimit: string;
    freePlanLimit: string;
    forbidden: string;
    network: string;
    upgradeToPro: string;
  };
  demo: {
    characters: {
      bossDescription: string;
      friendDescription: string;
      focusDescription: string;
    };
    reminders: {
      proposalTitle: string;
      proposalNote: string;
      stretchTitle: string;
    };
    history: {
      bossBody: string;
      friendBody: string;
    };
    packs: {
      deepWorkDescription: string;
      wellnessDescription: string;
    };
    defaultReminderTitle: string;
  };
};

export const supportedLocales = ['ja', 'en'] as const satisfies readonly SupportedLocale[];

export const uiText = {
  ja: {
    locale: 'ja',
    tabs: {
      home: 'Home',
      history: 'History',
      chat: 'Chat',
      store: 'Store',
      settings: 'Settings',
    },
    common: {
      back: '戻る',
      create: '作成',
      delete: '削除',
      edit: '編集',
      retry: '再試行',
      save: '保存',
      saving: '保存中',
      select: '選択',
      selected: '選択中',
    },
    persona: {
      fictionalLabel: '架空のピクセルペルソナ',
      safetyHelper: '実在の有名人や本人風ではなく、CueUp内の架空ペルソナとして通知に使います。',
      customSafetyHelper:
        'オリジナルの架空ペルソナとして作成してください。実在人物、本人風、肖像、商標、歌詞、引用は使えません。',
      selectedBadge: '選択中',
      lockedBadge: 'Pro',
      ownerOnlyBadge: '本人のみ',
      availability: {
        available: '利用可能',
        selected: '選択中',
        locked: 'Proで追加',
        ownerOnly: 'このユーザーのみ',
      },
      archetypes: {
        boss: 'Boss型',
        friend: 'Friend型',
        coach: 'Coach型',
        focus: 'Focus型',
        wellness: 'Calm型',
        creator: 'Creator型',
        custom: 'Custom型',
        default: 'Guide型',
      },
      tones: {
        direct: '短く強め',
        gentle: 'やさしく再開',
        momentum: '勢いづけ',
        focused: '集中を保つ',
        calm: '落ち着いて整える',
        original: 'オリジナル',
        balanced: 'バランス型',
      },
    },
    onboarding: {
      title: 'CueUp を始める',
      body: 'キャラクターの声で、忘れたくない行動を短く受け取れます。',
      allowNotifications: '通知を許可',
      continueSignedIn: 'ログインして始める',
      later: 'あとで設定',
      loginContinue: 'ログインして続行',
      permissionTitle: '通知がオフです',
      permissionBody: '設定から通知を許可すると、キャラクターの声で Cue を受け取れます。',
      openSystemSettings: 'OS 設定を開く',
    },
    home: {
      kicker: 'Home',
      title: '今日の Cue',
      newReminder: '新規',
      filters: {
        today: '今日',
        all: 'すべて',
        snoozed: 'スヌーズ',
      },
      notificationBannerTitle: '通知権限がありません',
      openSettings: '設定を開く',
      emptyTitle: '最初の Cue を作成しましょう',
      emptyBody: '時間、キャラクター、ひとことメモを決めるだけで開始できます。',
      emptyAction: 'Cue を作成',
      sampleSync: 'サンプル同期',
      active: '進行中',
      completed: '完了',
      complete: '完了',
      snoozeTenMinutes: '10分後',
      freeCueLimit: (limit: number) => `Free ${limit} Cue`,
    },
    reminderForm: {
      createKicker: 'New Cue',
      editKicker: 'Edit Cue',
      title: 'Cue を設定',
      titleLabel: 'タイトル',
      noteLabel: 'メモ',
      scheduledAtLabel: '通知時刻',
      characterLabel: 'キャラクター',
      unselectedCharacter: '未選択',
    },
    character: {
      selectKicker: 'Character',
      selectTitle: '声を選ぶ',
      createKicker: 'Custom',
      createTitle: 'キャラクター作成',
      name: '名前',
      relationship: '関係性',
      tone: '話し方',
      strictness: '厳しさ',
      warmth: '温かさ',
      preview: 'プレビュー',
      applyPreview: '反映',
      generatePreview: '生成',
      previewGenerating: 'プレビュー生成中',
      defaultNewName: '新しいキャラクター',
      defaultDetail: 'Cue の通知文に使う声',
      packRequiredAction: 'Pro で追加',
      ownerOnlyAction: '利用不可',
      validationMissingCore: '名前、関係性、話し方を入力してください。',
      createSafetyHelper: '実在人物ではなく、オリジナルの架空ペルソナとして作成します。',
      previewReady: (name: string) => `${name} が、次の一歩を短く促します。`,
    },
    history: {
      kicker: 'History',
      title: '通知履歴',
      reload: '再読込',
      loadComplete: '読込完了',
      empty: 'まだ通知履歴がありません',
      emptyBody: 'AI 通知が届くとここから再利用できます。',
      loadFailed: '通知履歴を読み込めませんでした。',
      reuse: '再利用',
      chat: 'チャット',
      unsent: '未送信',
      sent: 'Sent',
      fallback: 'Fallback',
      failed: 'Failed',
    },
    chat: {
      kicker: 'Chat',
      you: 'You',
      messageLabel: 'メッセージ',
      send: '送信',
      createCue: 'Cue 化',
      simulateFailure: 'AI失敗',
      resend: '再送信',
      assistantNameFallback: 'Character',
      aiFailed: 'AI 応答を取得できませんでした。',
      reminderFallbackTitle: 'チャットから Cue',
      remainingFree: (count: number) => `残り無料 ${count} 回`,
      emptyGreeting: (characterName: string) =>
        `${characterName}: まず今つまずいていることを一言で送ってください。`,
      assistantReply: '今できる最小単位に切って、次の5分だけ進めましょう。',
    },
    pro: {
      kicker: 'Pro',
      title: 'CueUp Pro',
      benefits: ['Cue とAI利用枠を拡張', 'フォルダ/タグで整理', '通知履歴と同期を強化'],
      organizationBenefits: [
        'アクティブCueを増やす',
        'フォルダとタグで整理する',
        '履歴とチャットを長く使う',
        '複数端末で同期する',
      ],
      addOnNote: 'Character Pack はStoreの追加要素として扱います。',
      foldersTags: 'Folders & Tags',
      smartLists: 'Smart Lists',
      sync: 'Sync',
      basic: 'Basic',
      included: '利用可',
      multiDevice: '複数端末',
      unavailable: '-',
      activeCue: 'Active Cue',
      monthlyChat: 'Monthly chat',
      history: 'History',
      unlimited: 'Unlimited',
      historyDays: (days: number) => `${days}日間`,
      purchase: 'Pro を購入',
      purchasing: '購入中',
      restore: '購入を復元',
      showPurchaseFailure: '購入失敗',
      home: 'ホームへ戻る',
      comparison: (free: string, pro: string) => `Free ${free} / Pro ${pro}`,
    },
    packs: {
      kicker: 'Store',
      title: 'Character Pack',
      addOnLabel: 'Add-on',
      restore: '復元',
      available: '利用可能',
      purchase: '購入',
      showPurchaseFailure: '購入失敗を表示',
    },
    settings: {
      kicker: 'Settings',
      title: '設定',
      open: 'Open',
      languageToggle: 'English',
      selectedDetail: (title: string) => `${title}へ進みます。`,
      rows: {
        account: {
          title: 'アカウント',
          detail: 'ログイン情報とセッション',
        },
        plan: {
          title: 'プラン管理',
          detail: 'Pro と購入履歴',
        },
        notifications: {
          title: '通知設定',
          detail: '許可状態と配信時間',
        },
        language: {
          title: '言語',
          detail: '日本語 / English',
        },
        data: {
          title: 'データ削除',
          detail: '履歴とアカウント削除',
        },
        terms: {
          title: '利用規約',
          detail: '法的文書',
        },
        privacy: {
          title: 'プライバシーポリシー',
          detail: 'データの扱い',
        },
        logout: {
          title: 'ログアウト',
          detail: 'この端末のセッションを終了',
        },
      },
    },
    commerce: {
      purchase: '購入',
      restore: '復元',
      purchaseFailed: '購入に失敗しました。',
      restoreFailed: '購入の復元に失敗しました。',
    },
    accessibility: {
      destructiveAction: '取り消せない操作',
      loading: '読み込み中',
    },
    errors: {
      titleRequired: 'タイトルを入力してください。',
      characterRequired: 'キャラクターを選択してください。',
      freeCueLimit: 'Free プランの Cue 上限に達しました。',
      freePlanLimit: 'Free プランの上限に達しました。',
      forbidden: 'この操作を行う権限がありません。',
      network: '通信に失敗しました。時間をおいて再試行してください。',
      upgradeToPro: 'Pro を見る',
    },
    demo: {
      characters: {
        bossDescription: '短く背中を押す',
        friendDescription: 'やさしく再開を促す',
        focusDescription: 'Deep Work pack',
      },
      reminders: {
        proposalTitle: '提案書の1ページ目を書く',
        proposalNote: '見出しだけでも進める',
        stretchTitle: '肩を回して水を飲む',
      },
      history: {
        bossBody: '最初の段落だけ書け。完璧さは後でいい。',
        friendBody: '一度立って、水を飲んだら戻ってこよう。',
      },
      packs: {
        deepWorkDescription: '集中、締切、長い作業向けの声を追加します。',
        wellnessDescription: '休憩、睡眠、運動をやさしく促します。',
      },
      defaultReminderTitle: '最初の一歩を踏み出す',
    },
  },
  en: {
    locale: 'en',
    tabs: {
      home: 'Home',
      history: 'History',
      chat: 'Chat',
      store: 'Store',
      settings: 'Settings',
    },
    common: {
      back: 'Back',
      create: 'Create',
      delete: 'Delete',
      edit: 'Edit',
      retry: 'Retry',
      save: 'Save',
      saving: 'Saving',
      select: 'Select',
      selected: 'Selected',
    },
    persona: {
      fictionalLabel: 'Fictional pixel persona',
      safetyHelper:
        'CueUp uses fictional personas for reminders, not real celebrities or sound-alikes.',
      customSafetyHelper:
        'Create an original fictional persona. Do not use real people, sound-alikes, likenesses, trademarks, lyrics, or direct quotes.',
      selectedBadge: 'Selected',
      lockedBadge: 'Pro',
      ownerOnlyBadge: 'Owner only',
      availability: {
        available: 'Available',
        selected: 'Selected',
        locked: 'Add with Pro',
        ownerOnly: 'Owner only',
      },
      archetypes: {
        boss: 'Boss type',
        friend: 'Friend type',
        coach: 'Coach type',
        focus: 'Focus type',
        wellness: 'Calm type',
        creator: 'Creator type',
        custom: 'Custom type',
        default: 'Guide type',
      },
      tones: {
        direct: 'Short and direct',
        gentle: 'Gentle restart',
        momentum: 'Momentum nudge',
        focused: 'Focused support',
        calm: 'Calm reset',
        original: 'Original',
        balanced: 'Balanced',
      },
    },
    onboarding: {
      title: 'Start CueUp',
      body: 'Receive short action cues in the voice of your chosen character.',
      allowNotifications: 'Allow notifications',
      continueSignedIn: 'Sign in and start',
      later: 'Set up later',
      loginContinue: 'Sign in to continue',
      permissionTitle: 'Notifications are off',
      permissionBody: 'Allow notifications in Settings to receive character-voiced cues.',
      openSystemSettings: 'Open OS settings',
    },
    home: {
      kicker: 'Home',
      title: "Today's Cues",
      newReminder: 'New',
      filters: {
        today: 'Today',
        all: 'All',
        snoozed: 'Snoozed',
      },
      notificationBannerTitle: 'Notification permission is missing',
      openSettings: 'Open settings',
      emptyTitle: 'Create your first Cue',
      emptyBody: 'Pick a time, a character, and one short note to get started.',
      emptyAction: 'Create Cue',
      sampleSync: 'Load sample',
      active: 'Active',
      completed: 'Done',
      complete: 'Done',
      snoozeTenMinutes: '10 min',
      freeCueLimit: (limit: number) => (limit === 1 ? 'Free 1 Cue' : `Free ${limit} Cues`),
    },
    reminderForm: {
      createKicker: 'New Cue',
      editKicker: 'Edit Cue',
      title: 'Set up Cue',
      titleLabel: 'Title',
      noteLabel: 'Note',
      scheduledAtLabel: 'Notification time',
      characterLabel: 'Character',
      unselectedCharacter: 'Not selected',
    },
    character: {
      selectKicker: 'Character',
      selectTitle: 'Choose a voice',
      createKicker: 'Custom',
      createTitle: 'Create character',
      name: 'Name',
      relationship: 'Relationship',
      tone: 'Tone',
      strictness: 'Strictness',
      warmth: 'Warmth',
      preview: 'Preview',
      applyPreview: 'Apply',
      generatePreview: 'Generate',
      previewGenerating: 'Generating preview',
      defaultNewName: 'New character',
      defaultDetail: 'Voice used for Cue notifications',
      packRequiredAction: 'Add with Pro',
      ownerOnlyAction: 'Unavailable',
      validationMissingCore: 'Enter a name, relationship, and speaking style.',
      createSafetyHelper: 'Create an original fictional persona, not a real person.',
      previewReady: (name: string) => `${name} will nudge the next step briefly.`,
    },
    history: {
      kicker: 'History',
      title: 'Notification history',
      reload: 'Reload',
      loadComplete: 'Finish loading',
      empty: 'No notification history yet',
      emptyBody: 'AI notifications will appear here for reuse.',
      loadFailed: 'Could not load notification history.',
      reuse: 'Reuse',
      chat: 'Chat',
      unsent: 'Unsent',
      sent: 'Sent',
      fallback: 'Fallback',
      failed: 'Failed',
    },
    chat: {
      kicker: 'Chat',
      you: 'You',
      messageLabel: 'Message',
      send: 'Send',
      createCue: 'Make Cue',
      simulateFailure: 'AI failure',
      resend: 'Resend',
      assistantNameFallback: 'Character',
      aiFailed: 'Could not get an AI response.',
      reminderFallbackTitle: 'Cue from chat',
      remainingFree: (count: number) =>
        count === 1 ? '1 free chat left' : `${count} free chats left`,
      emptyGreeting: (characterName: string) =>
        `${characterName}: Send one sentence about where you are stuck.`,
      assistantReply: 'Break it into the smallest step and move for the next five minutes.',
    },
    pro: {
      kicker: 'Pro',
      title: 'CueUp Pro',
      benefits: [
        'Raise Cue and AI limits',
        'Organize with folders and tags',
        'Extend history and sync',
      ],
      organizationBenefits: [
        'Increase active Cues',
        'Organize with folders and tags',
        'Keep history and chat longer',
        'Sync across devices',
      ],
      addOnNote: 'Character Packs stay in Store as optional add-ons.',
      foldersTags: 'Folders & Tags',
      smartLists: 'Smart Lists',
      sync: 'Sync',
      basic: 'Basic',
      included: 'Included',
      multiDevice: 'Multi-device',
      unavailable: '-',
      activeCue: 'Active Cue',
      monthlyChat: 'Monthly chat',
      history: 'History',
      unlimited: 'Unlimited',
      historyDays: (days: number) => (days === 1 ? '1 day' : `${days} days`),
      purchase: 'Buy Pro',
      purchasing: 'Purchasing',
      restore: 'Restore purchases',
      showPurchaseFailure: 'Show purchase failure',
      home: 'Back to Home',
      comparison: (free: string, pro: string) => `Free ${free} / Pro ${pro}`,
    },
    packs: {
      kicker: 'Store',
      title: 'Character Pack',
      addOnLabel: 'Add-on',
      restore: 'Restore',
      available: 'Available',
      purchase: 'Purchase',
      showPurchaseFailure: 'Show purchase failure',
    },
    settings: {
      kicker: 'Settings',
      title: 'Settings',
      open: 'Open',
      languageToggle: '日本語',
      selectedDetail: (title: string) => `Opening ${title}.`,
      rows: {
        account: {
          title: 'Account',
          detail: 'Login information and sessions',
        },
        plan: {
          title: 'Plan management',
          detail: 'Pro and purchase history',
        },
        notifications: {
          title: 'Notification settings',
          detail: 'Permission state and delivery time',
        },
        language: {
          title: 'Language',
          detail: 'English / 日本語',
        },
        data: {
          title: 'Delete data',
          detail: 'History and account deletion',
        },
        terms: {
          title: 'Terms of service',
          detail: 'Legal document',
        },
        privacy: {
          title: 'Privacy policy',
          detail: 'How data is handled',
        },
        logout: {
          title: 'Log out',
          detail: 'End this device session',
        },
      },
    },
    commerce: {
      purchase: 'Purchase',
      restore: 'Restore',
      purchaseFailed: 'Purchase failed.',
      restoreFailed: 'Restore failed.',
    },
    accessibility: {
      destructiveAction: 'Destructive action',
      loading: 'Loading',
    },
    errors: {
      titleRequired: 'Enter a title.',
      characterRequired: 'Select a character.',
      freeCueLimit: 'You reached the Free plan Cue limit.',
      freePlanLimit: 'You reached the Free plan limit.',
      forbidden: 'You do not have permission to do this.',
      network: 'Network request failed. Try again later.',
      upgradeToPro: 'View Pro',
    },
    demo: {
      characters: {
        bossDescription: 'Short, direct accountability',
        friendDescription: 'Gentle help to restart',
        focusDescription: 'Deep Work pack',
      },
      reminders: {
        proposalTitle: 'Write the first page of the proposal',
        proposalNote: 'Start with the headings',
        stretchTitle: 'Roll your shoulders and drink water',
      },
      history: {
        bossBody: 'Write only the first paragraph. Perfect can wait.',
        friendBody: 'Stand up once, drink water, then come back.',
      },
      packs: {
        deepWorkDescription: 'Adds voices for focus, deadlines, and long work sessions.',
        wellnessDescription: 'Gently nudges breaks, sleep, and exercise.',
      },
      defaultReminderTitle: 'Take the first step',
    },
  },
} as const satisfies Record<SupportedLocale, UiText>;

export function getUiText(locale: string): UiText {
  return locale.toLowerCase().startsWith('en') ? uiText.en : uiText.ja;
}

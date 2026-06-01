export type SupportedLocale = 'ja' | 'en';

export type UiText = {
  tabs: {
    home: string;
    history: string;
    chat: string;
    store: string;
    settings: string;
  };
  settings: {
    title: string;
    open: string;
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
};

export const supportedLocales = ['ja', 'en'] as const satisfies readonly SupportedLocale[];

export const uiText = {
  ja: {
    tabs: {
      home: 'Home',
      history: 'History',
      chat: 'Chat',
      store: 'Store',
      settings: 'Settings',
    },
    settings: {
      title: '設定',
      open: 'Open',
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
  },
  en: {
    tabs: {
      home: 'Home',
      history: 'History',
      chat: 'Chat',
      store: 'Store',
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      open: 'Open',
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
  },
} as const satisfies Record<SupportedLocale, UiText>;

export function getUiText(locale: string): UiText {
  return locale.toLowerCase().startsWith('en') ? uiText.en : uiText.ja;
}

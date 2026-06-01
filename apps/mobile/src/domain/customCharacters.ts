export type CustomCharacterIconState =
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

export type CustomCharacterDraft = {
  name: string;
  relationship: string;
  tone: string;
  strictness: number;
  warmth: number;
  catchphrases: string[];
  prohibitedStyle: string[];
  icon: CustomCharacterIconState;
};

export function createCustomCharacterDraft(): CustomCharacterDraft {
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

export function sanitizeCustomCharacterText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function canSubmitCustomCharacterDraft(draft: CustomCharacterDraft): boolean {
  return (
    sanitizeCustomCharacterText(draft.name).length > 0 &&
    sanitizeCustomCharacterText(draft.relationship).length > 0 &&
    sanitizeCustomCharacterText(draft.tone).length > 0 &&
    draft.icon.status !== 'failed'
  );
}

export function markCustomCharacterIconFailed(message: string): CustomCharacterIconState {
  return {
    status: 'failed',
    iconUrl: null,
    errorMessage: message,
  };
}

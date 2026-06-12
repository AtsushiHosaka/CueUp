import type { Character, CharacterType } from '@cueup/shared';

import type { UiText } from '../i18n/uiText';

export type PixelAvatarVariant =
  | 'strict'
  | 'gentle'
  | 'coach'
  | 'focus'
  | 'wellness'
  | 'custom'
  | 'default';

export type PixelAvatarToken = '0' | '1' | '2' | '3' | '4' | '5';

export type PixelAvatarTheme = {
  accent: string;
  background: string;
  border: string;
  colors: Record<PixelAvatarToken, string>;
  pixels: readonly string[];
  shadow: string;
};

export type PixelCharacter = Pick<Character, 'id' | 'name' | 'type'>;

export type PixelPersonaChipModel = {
  characterId: string;
  label: string;
  archetypeLabel: string;
  toneLabel: string;
  safetyLabel: string;
  avatarVariant: PixelAvatarVariant;
};

export type PixelBadgeTone = 'neutral' | 'selected' | 'locked' | 'success' | 'warning' | 'danger';

export type PixelBadgeModel = {
  label: string;
  tone: PixelBadgeTone;
};

const transparent = 'transparent';

export const PIXEL_AVATAR_THEMES: Record<PixelAvatarVariant, PixelAvatarTheme> = {
  strict: {
    accent: '#FFB000',
    background: '#FFF3C9',
    border: '#27251F',
    shadow: '#D48A00',
    colors: {
      '0': transparent,
      '1': '#27251F',
      '2': '#0F1115',
      '3': '#F2C49B',
      '4': '#FFB000',
      '5': '#26343A',
    },
    pixels: [
      '00111100',
      '01222210',
      '12333321',
      '12344321',
      '01144110',
      '00544500',
      '05555550',
      '00500500',
    ],
  },
  gentle: {
    accent: '#F0796A',
    background: '#FFE8DF',
    border: '#493338',
    shadow: '#E7A28E',
    colors: {
      '0': transparent,
      '1': '#493338',
      '2': '#6F453E',
      '3': '#F3C3A8',
      '4': '#F0796A',
      '5': '#7A6EE6',
    },
    pixels: [
      '00011000',
      '00122100',
      '01233310',
      '12334321',
      '01233210',
      '00455400',
      '04555540',
      '00044000',
    ],
  },
  coach: {
    accent: '#27B37E',
    background: '#DFF8E8',
    border: '#1F3B31',
    shadow: '#86D4AA',
    colors: {
      '0': transparent,
      '1': '#1F3B31',
      '2': '#2F855A',
      '3': '#F0B990',
      '4': '#27B37E',
      '5': '#2056B3',
    },
    pixels: [
      '00144100',
      '01422410',
      '14233241',
      '12333321',
      '01244210',
      '00544500',
      '05555550',
      '00055000',
    ],
  },
  focus: {
    accent: '#22A6B3',
    background: '#DDF7F7',
    border: '#1D3E45',
    shadow: '#8CD5DC',
    colors: {
      '0': transparent,
      '1': '#1D3E45',
      '2': '#48707B',
      '3': '#E7C6A7',
      '4': '#22A6B3',
      '5': '#28435A',
    },
    pixels: [
      '00044000',
      '00422400',
      '04222240',
      '12233221',
      '01233210',
      '00544500',
      '05555550',
      '00055000',
    ],
  },
  wellness: {
    accent: '#80B64B',
    background: '#EFF8D9',
    border: '#33451F',
    shadow: '#B7D98A',
    colors: {
      '0': transparent,
      '1': '#33451F',
      '2': '#789F45',
      '3': '#F1C6AA',
      '4': '#80B64B',
      '5': '#F3A84A',
    },
    pixels: [
      '00044000',
      '00422400',
      '04233240',
      '12333321',
      '01244210',
      '00544500',
      '05555550',
      '00055000',
    ],
  },
  custom: {
    accent: '#A96AE8',
    background: '#F1E7FF',
    border: '#35284B',
    shadow: '#C6A5F2',
    colors: {
      '0': transparent,
      '1': '#35284B',
      '2': '#A96AE8',
      '3': '#F1C8A5',
      '4': '#FFCF4D',
      '5': '#4257A8',
    },
    pixels: [
      '00022000',
      '00211200',
      '02133120',
      '12344321',
      '01233210',
      '00522500',
      '05555550',
      '00055000',
    ],
  },
  default: {
    accent: '#4F7DD9',
    background: '#E8EEFF',
    border: '#26324F',
    shadow: '#A7B9EA',
    colors: {
      '0': transparent,
      '1': '#26324F',
      '2': '#4F7DD9',
      '3': '#F1C6A0',
      '4': '#FFD166',
      '5': '#35445F',
    },
    pixels: [
      '00122100',
      '01222210',
      '12333321',
      '12344321',
      '01233210',
      '00544500',
      '05555550',
      '00055000',
    ],
  },
};

export function getPixelAvatarVariant(
  character: PixelCharacter | { id?: string; name?: string; type?: CharacterType } | undefined,
): PixelAvatarVariant {
  if (character?.type === 'custom' || character?.id?.startsWith('custom-') === true) {
    return 'custom';
  }

  const id = character?.id ?? '';
  const name = character?.name?.toLowerCase() ?? '';

  if (id.includes('strict') || id.endsWith('-boss') || name.includes('boss')) {
    return 'strict';
  }

  if (id.includes('gentle') || id.endsWith('-friend') || name.includes('friend')) {
    return 'gentle';
  }

  if (id.includes('coach') || name.includes('coach')) {
    return 'coach';
  }

  if (id.includes('focus') || name.includes('focus') || id.includes('sage')) {
    return 'focus';
  }

  if (id.includes('breathe') || id.includes('wellness') || name.includes('wellness')) {
    return 'wellness';
  }

  return 'default';
}

export function getPixelAvatarTheme(
  character: PixelCharacter | { id?: string; name?: string; type?: CharacterType } | undefined,
): PixelAvatarTheme {
  return PIXEL_AVATAR_THEMES[getPixelAvatarVariant(character)];
}

export function createPixelPersonaChipModel(
  character: PixelCharacter | { id?: string; name?: string; type?: CharacterType } | undefined,
  copy: UiText,
): PixelPersonaChipModel {
  const avatarVariant = getPixelAvatarVariant(character);
  const labels = getPersonaLabels(avatarVariant, copy);

  return {
    characterId: character?.id ?? 'character-default',
    label: character?.name ?? copy.chat.assistantNameFallback,
    archetypeLabel: labels.archetypeLabel,
    toneLabel: labels.toneLabel,
    safetyLabel: copy.persona.fictionalLabel,
    avatarVariant,
  };
}

function getPersonaLabels(
  avatarVariant: PixelAvatarVariant,
  copy: UiText,
): Pick<PixelPersonaChipModel, 'archetypeLabel' | 'toneLabel'> {
  if (avatarVariant === 'strict') {
    return {
      archetypeLabel: copy.persona.archetypes.boss,
      toneLabel: copy.persona.tones.direct,
    };
  }

  if (avatarVariant === 'gentle') {
    return {
      archetypeLabel: copy.persona.archetypes.friend,
      toneLabel: copy.persona.tones.gentle,
    };
  }

  if (avatarVariant === 'coach') {
    return {
      archetypeLabel: copy.persona.archetypes.coach,
      toneLabel: copy.persona.tones.momentum,
    };
  }

  if (avatarVariant === 'focus') {
    return {
      archetypeLabel: copy.persona.archetypes.focus,
      toneLabel: copy.persona.tones.focused,
    };
  }

  if (avatarVariant === 'wellness') {
    return {
      archetypeLabel: copy.persona.archetypes.wellness,
      toneLabel: copy.persona.tones.calm,
    };
  }

  if (avatarVariant === 'custom') {
    return {
      archetypeLabel: copy.persona.archetypes.custom,
      toneLabel: copy.persona.tones.original,
    };
  }

  return {
    archetypeLabel: copy.persona.archetypes.default,
    toneLabel: copy.persona.tones.balanced,
  };
}

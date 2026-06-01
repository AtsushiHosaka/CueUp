export type CharacterSafetyIssue = {
  field: string;
  reason: string;
};

const unsafeContentPatterns = [
  { pattern: /\bhate speech\b/i, reason: 'unsafe_content' },
  { pattern: /\bself[- ]?harm\b/i, reason: 'unsafe_content' },
  { pattern: /\bsexual\b/i, reason: 'unsafe_content' },
  { pattern: /人格否定/, reason: 'unsafe_content' },
  { pattern: /死ね/, reason: 'unsafe_content' },
  { pattern: /自傷/, reason: 'unsafe_content' },
];

const realPersonPatterns = [
  /\breal person\b/i,
  /\bcelebrity\b/i,
  /\bTaylor Swift\b/i,
  /\bAdo\b/i,
  /\bElon Musk\b/i,
  /実在/,
  /有名人/,
  /芸能人/,
  /本人風/,
];

const portraitPatterns = [/\bphoto\b/i, /\bportrait\b/i, /\blikeneness\b/i, /写真/, /肖像/];
const trademarkPatterns = [
  /\btrademark\b/i,
  /\bDisney\b/i,
  /\bMarvel\b/i,
  /\bPokemon\b/i,
  /\bNike\b/i,
  /商標/,
  /ブランド風/,
];
const directQuotePatterns = [/\blyrics?\b/i, /\bdirect quote\b/i, /歌詞/, /直接引用/, /名言/];

export function reviewCharacterSafety(
  fields: Record<string, string | string[]>,
): CharacterSafetyIssue | undefined {
  for (const [field, value] of Object.entries(fields)) {
    const values = Array.isArray(value) ? value : [value];

    for (const text of values) {
      const issue = reviewText(field, text);

      if (issue !== undefined) {
        return issue;
      }
    }
  }

  return undefined;
}

function reviewText(field: string, text: string): CharacterSafetyIssue | undefined {
  if (unsafeContentPatterns.some((entry) => entry.pattern.test(text))) {
    return {
      field,
      reason: 'unsafe_content',
    };
  }

  if (realPersonPatterns.some((pattern) => pattern.test(text))) {
    return {
      field,
      reason: 'real_person_reference',
    };
  }

  if (portraitPatterns.some((pattern) => pattern.test(text))) {
    return {
      field,
      reason: 'portrait_or_photo_reference',
    };
  }

  if (trademarkPatterns.some((pattern) => pattern.test(text))) {
    return {
      field,
      reason: 'trademark_reference',
    };
  }

  if (directQuotePatterns.some((pattern) => pattern.test(text))) {
    return {
      field,
      reason: 'direct_quote_reference',
    };
  }

  return undefined;
}

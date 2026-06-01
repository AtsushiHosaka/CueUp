import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'docs/quality-gates.md',
  'docs/security-and-secrets.md',
  'apps/mobile/src/i18n/uiText.ts',
  'apps/mobile/test/i18n.test.ts',
  'apps/mobile/test/mainFlow.test.ts',
  'apps/mobile/test/secondaryFlow.test.ts',
  'services/api/src/data/accessControl.test.ts',
  'services/api/src/characters/characterCatalogService.test.ts',
  'services/api/src/notifications/notificationHistoryService.test.ts',
  'services/api/src/ai/notificationGenerationService.test.ts',
  'services/api/src/push/pushNotificationService.test.ts',
  'services/api/src/chat/chatService.test.ts',
];

const fileChecks = [
  {
    file: 'docs/quality-gates.md',
    patterns: [
      /2 seconds/i,
      /VoiceOver/i,
      /TalkBack/i,
      /Dynamic Type/i,
      /Terms/i,
      /Privacy Policy/i,
      /npm run quality:check/i,
    ],
  },
  {
    file: 'apps/mobile/src/i18n/uiText.ts',
    patterns: [/supportedLocales/i, /uiText/i, /getUiText/i],
  },
  {
    file: 'services/api/src/data/accessControl.test.ts',
    patterns: [/rejects another user/i],
  },
  {
    file: 'services/api/src/characters/characterCatalogService.test.ts',
    patterns: [/hides custom characters owned by another user/i],
  },
  {
    file: 'services/api/src/notifications/notificationHistoryService.test.ts',
    patterns: [/other-user/i, /rejects missing and other-user messages/i],
  },
  {
    file: 'services/api/src/ai/notificationGenerationService.test.ts',
    patterns: [/provider failures/i, /fallback/i],
  },
  {
    file: 'services/api/src/push/pushNotificationService.test.ts',
    patterns: [/permission denied/i, /transient provider failures/i],
  },
  {
    file: 'services/api/src/chat/chatService.test.ts',
    patterns: [/monthly chat limit/i, /provider errors/i],
  },
  {
    file: 'apps/mobile/test/secondaryFlow.test.ts',
    patterns: [/AI failure/i, /purchase/i, /restore/i, /settings/i],
  },
];

const failures = [];

async function fileExists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

for (const relativePath of requiredFiles) {
  if (!(await fileExists(relativePath))) {
    failures.push(`Missing quality gate file: ${relativePath}`);
  }
}

for (const check of fileChecks) {
  if (!(await fileExists(check.file))) {
    continue;
  }

  const contents = await readFile(path.join(root, check.file), 'utf8');

  for (const pattern of check.patterns) {
    if (!pattern.test(contents)) {
      failures.push(`Quality gate pattern ${pattern} missing from ${check.file}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Quality gates passed.');

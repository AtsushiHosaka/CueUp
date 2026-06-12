import { FREE_PLAN_LIMITS, type Character, type Reminder } from '@cueup/shared';
import { memo, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { clientConfig } from './config/clientConfig';
import {
  completeReminder,
  createCharacterCreateModel,
  createCharacterSelectRows,
  createDemoReminders,
  createHomeScreenModel,
  createInitialMainFlowState,
  createOnboardingScreenModel,
  createReminderFormModel,
  deleteReminder,
  mapApiErrorToFlowError,
  snoozeReminder,
  validateReminderDraft,
  type MainFlowState,
  type MobileRoute,
  type ReminderFilter,
} from './domain/mainFlow';
import { sanitizeCustomCharacterText } from './domain/customCharacters';
import {
  getPixelAvatarTheme,
  type PixelBadgeModel,
  type PixelCharacter,
  type PixelPersonaChipModel,
} from './domain/pixelCharacters';
import { createReminderDraft, sanitizeReminderTitle } from './domain/reminders';
import {
  appendChatExchange,
  createChatScreenModel,
  createHistoryScreenModel,
  createPackStoreScreenModel,
  createProScreenModel,
  createSecondaryFlowState,
  createSettingsScreenModel,
  mapCommerceFailure,
  markPackPurchased,
  type HistoryItem,
  type SecondaryFlowState,
  type SettingsDestination,
} from './domain/secondaryFlow';
import { getUiText, supportedLocales, type SupportedLocale } from './i18n/uiText';

const fixedNow = new Date('2026-06-01T00:00:00.000Z');

export default function App() {
  const now = useMemo(() => fixedNow, []);
  const [locale, setLocale] = useState<SupportedLocale>('ja');
  const copy = useMemo(() => getUiText(locale), [locale]);
  const [flow, setFlow] = useState<MainFlowState>(() => createInitialMainFlowState(now, copy));
  const [secondary, setSecondary] = useState<SecondaryFlowState>(() =>
    createSecondaryFlowState(now.toISOString(), copy),
  );
  const home = createHomeScreenModel(flow, now, copy);
  const reminderById = useMemo(
    () => new Map(flow.reminders.map((reminder) => [reminder.id, reminder])),
    [flow.reminders],
  );
  const onboarding = createOnboardingScreenModel(flow, copy);
  const reminderForm = createReminderFormModel(flow, copy);
  const characterCreate = createCharacterCreateModel(flow, copy);
  const characterRows = createCharacterSelectRows(flow, copy);
  const selectedCharacter = flow.characters.find(
    (character) => character.id === flow.selectedCharacterId,
  );
  const history = createHistoryScreenModel(secondary, copy);
  const chat = createChatScreenModel(secondary, selectedCharacter, copy);
  const pro = createProScreenModel(secondary, copy);
  const packStore = createPackStoreScreenModel(secondary, copy);
  const settings = createSettingsScreenModel(secondary, copy);

  function updateFlow(updater: (current: MainFlowState) => MainFlowState) {
    setFlow((current) => updater(current));
  }

  function updateSecondary(updater: (current: SecondaryFlowState) => SecondaryFlowState) {
    setSecondary((current) => updater(current));
  }

  function goTo(route: MobileRoute) {
    updateFlow((current) => ({
      ...current,
      route,
      lastError: undefined,
    }));
  }

  function startSignedInHome() {
    updateFlow((current) => ({
      ...current,
      route: 'home',
      authenticated: true,
      reminderFilter: 'today',
      reminderListStatus: 'idle',
      lastError: undefined,
    }));
  }

  function loadDemoReminders() {
    updateFlow((current) => ({
      ...current,
      reminders: createDemoReminders(now.toISOString(), copy),
      reminderFilter: 'all',
      reminderListStatus: 'idle',
      lastError: undefined,
    }));
  }

  function openCreateReminder() {
    updateFlow((current) => ({
      ...current,
      route: 'reminderForm',
      reminderDraft: createReminderDraft(now, copy.demo.defaultReminderTitle),
      editingReminderId: undefined,
      reminderSavingStatus: 'idle',
      lastError: undefined,
    }));
  }

  function openEditReminder(reminder: Reminder) {
    updateFlow((current) => ({
      ...current,
      route: 'reminderForm',
      reminderDraft: {
        title: reminder.title,
        note: reminder.note ?? '',
        scheduledAt: reminder.scheduledAt,
      },
      selectedCharacterId: reminder.characterId,
      editingReminderId: reminder.id,
      reminderSavingStatus: 'idle',
      lastError: undefined,
    }));
  }

  function saveReminder() {
    const validationError = validateReminderDraft(flow, copy);

    if (validationError !== undefined) {
      updateFlow((current) => ({
        ...current,
        route: validationError.targetRoute ?? current.route,
        lastError: validationError,
      }));
      return;
    }

    const title = sanitizeReminderTitle(flow.reminderDraft.title);
    const savedAt = now.toISOString();

    if (flow.editingReminderId !== undefined) {
      updateFlow((current) => ({
        ...current,
        route: 'home',
        reminderFilter: 'all',
        reminders: current.reminders.map((reminder) =>
          reminder.id === current.editingReminderId
            ? {
                ...reminder,
                title,
                note: current.reminderDraft.note.trim() || null,
                scheduledAt: current.reminderDraft.scheduledAt,
                characterId: current.selectedCharacterId,
                updatedAt: savedAt,
              }
            : reminder,
        ),
        editingReminderId: undefined,
        lastError: undefined,
      }));
      return;
    }

    const reminder: Reminder = {
      id: `local-${flow.reminders.length + 1}`,
      userId: 'user-1',
      title,
      note: flow.reminderDraft.note.trim() || null,
      scheduledAt: flow.reminderDraft.scheduledAt,
      recurrenceRule: null,
      characterId: flow.selectedCharacterId,
      tagIds: [],
      status: 'active',
      createdAt: savedAt,
      updatedAt: savedAt,
    };

    updateFlow((current) => ({
      ...current,
      route: 'home',
      reminderFilter: 'all',
      reminders: [reminder, ...current.reminders],
      lastError: undefined,
    }));
  }

  function saveCustomCharacter() {
    if (!characterCreate.canSubmit) {
      updateFlow((current) => ({
        ...current,
        lastError: characterCreate.validationError,
      }));
      return;
    }

    const savedAt = now.toISOString();
    const draft = flow.customCharacterDraft;
    const character: Character = {
      id: `custom-${flow.characters.length + 1}`,
      ownerUserId: 'user-1',
      type: 'custom',
      name: sanitizeCustomCharacterText(draft.name),
      relationship: sanitizeCustomCharacterText(draft.relationship),
      tone: sanitizeCustomCharacterText(draft.tone),
      personaPrompt: `${draft.name} reminds the user with an original persona.`,
      strictness: draft.strictness,
      warmth: draft.warmth,
      catchphrases: draft.catchphrases,
      prohibitedStyle: draft.prohibitedStyle,
      iconUrl: draft.icon.status === 'ready' ? draft.icon.iconUrl : null,
      safetyReviewStatus: 'approved',
      createdAt: savedAt,
      updatedAt: savedAt,
    };

    updateFlow((current) => ({
      ...current,
      route: 'characterSelect',
      characters: [character, ...current.characters],
      selectedCharacterId: character.id,
      characterSavingStatus: 'idle',
      characterPreviewStatus: 'ready',
      lastError: undefined,
    }));
  }

  function reuseHistoryItem(item: HistoryItem) {
    updateFlow((current) => ({
      ...current,
      route: 'reminderForm',
      reminderDraft: {
        title: item.body.slice(0, 40),
        note: item.body,
        scheduledAt: createReminderDraft(now, copy.demo.defaultReminderTitle).scheduledAt,
      },
      selectedCharacterId: item.characterId,
      editingReminderId: undefined,
      lastError: undefined,
    }));
  }

  function openChatForHistory(item: HistoryItem) {
    updateFlow((current) => ({
      ...current,
      route: 'chat',
      selectedCharacterId: item.characterId,
      lastError: undefined,
    }));
  }

  function deleteHistoryItem(historyItemId: string) {
    updateSecondary((current) => ({
      ...current,
      historyItems: current.historyItems.filter((item) => item.id !== historyItemId),
    }));
  }

  function sendChatMessage() {
    if (secondary.remainingFreeChats <= 0) {
      updateFlow((current) => ({
        ...current,
        route: 'proUpsell',
        lastError: mapApiErrorToFlowError('plan_limit_exceeded', copy),
      }));
      return;
    }

    if (secondary.chatInput.toLowerCase().includes('fail')) {
      updateSecondary((current) => ({
        ...current,
        chatStatus: 'failed',
      }));
      return;
    }

    updateSecondary((current) =>
      appendChatExchange(
        current,
        {
          characterId: flow.selectedCharacterId,
          userId: 'user-1',
          body: current.chatInput,
          now: now.toISOString(),
        },
        copy,
      ),
    );
  }

  function createReminderFromChat() {
    const latestUserMessage = [...secondary.chatMessages]
      .reverse()
      .find((message) => message.role === 'user');

    updateFlow((current) => ({
      ...current,
      route: 'reminderForm',
      reminderDraft: {
        title: latestUserMessage?.body.slice(0, 40) ?? copy.chat.reminderFallbackTitle,
        note: latestUserMessage?.body ?? '',
        scheduledAt: createReminderDraft(now, copy.demo.defaultReminderTitle).scheduledAt,
      },
      editingReminderId: undefined,
      lastError: undefined,
    }));
  }

  function selectSetting(destination: SettingsDestination) {
    if (destination === 'language') {
      setLocale((current) => supportedLocales.find((item) => item !== current) ?? 'ja');
      updateSecondary((current) => ({
        ...current,
        settingsSelection: destination,
      }));
      return;
    }

    if (destination === 'logout') {
      updateFlow((current) => ({
        ...current,
        route: 'onboarding',
        authenticated: false,
        lastError: undefined,
      }));
      return;
    }

    if (destination === 'plan') {
      goTo('proUpsell');
    }

    updateSecondary((current) => ({
      ...current,
      settingsSelection: destination,
    }));
  }

  function renderOnboarding() {
    return (
      <View style={styles.stack}>
        <View style={styles.onboardingHeader}>
          <View style={styles.brandRow}>
            <PixelMotif />
            <Text style={styles.brandText}>CueUp</Text>
          </View>
          <Text style={styles.heroTitle}>{onboarding.title}</Text>
          <Text style={styles.body}>{copy.onboarding.body}</Text>
        </View>
        {onboarding.permissionNotice !== undefined ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>{onboarding.permissionNotice.title}</Text>
            <Text style={styles.noticeBody}>{onboarding.permissionNotice.body}</Text>
            <Button label={onboarding.permissionNotice.actionLabel} onPress={() => undefined} />
          </View>
        ) : null}
        <Button
          label={onboarding.primaryActionLabel}
          onPress={() => {
            if (flow.notificationPermission === 'granted') {
              startSignedInHome();
              return;
            }

            updateFlow((current) => ({
              ...current,
              notificationPermission: 'granted',
            }));
          }}
        />
        <Button
          label={onboarding.secondaryActionLabel}
          variant="secondary"
          onPress={() =>
            updateFlow((current) => ({
              ...current,
              notificationPermission: 'denied',
            }))
          }
        />
        {flow.notificationPermission !== 'unknown' ? (
          <Button
            label={copy.onboarding.loginContinue}
            variant="ghost"
            onPress={startSignedInHome}
          />
        ) : null}
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.stack}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.kicker}>{copy.home.kicker}</Text>
            <Text style={styles.title}>{copy.home.title}</Text>
          </View>
          <Button label={copy.home.newReminder} compact onPress={openCreateReminder} />
        </View>
        {home.notificationBanner !== undefined ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>{home.notificationBanner.title}</Text>
            <Button label={home.notificationBanner.actionLabel} compact onPress={() => undefined} />
          </View>
        ) : null}
        <View style={styles.segmented}>
          <Segment
            label={copy.home.filters.today}
            active={home.filter === 'today'}
            onPress={() => setFilter('today')}
          />
          <Segment
            label={copy.home.filters.all}
            active={home.filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <Segment
            label={copy.home.filters.snoozed}
            active={home.filter === 'snoozed'}
            onPress={() => setFilter('snoozed')}
          />
        </View>
        {home.isLoading ? (
          <View style={styles.stack}>
            {Array.from({ length: home.skeletonRows }, (_, index) => (
              <View key={`skeleton-${index}`} style={styles.skeletonRow} />
            ))}
          </View>
        ) : null}
        {home.emptyState !== undefined ? (
          <View style={styles.emptyState}>
            <PixelMotif />
            <Text style={styles.rowTitle}>{home.emptyState.title}</Text>
            <Text style={styles.body}>{home.emptyState.body}</Text>
            <View style={styles.inlineActions}>
              <Button label={home.emptyState.actionLabel} compact onPress={openCreateReminder} />
              <Button
                label={copy.home.sampleSync}
                compact
                variant="secondary"
                onPress={loadDemoReminders}
              />
            </View>
          </View>
        ) : null}
        {home.rows.map((row) => {
          const reminder = reminderById.get(row.id);
          const character = findCharacterById(flow.characters, reminder?.characterId);

          return (
            <View key={row.id} style={styles.reminderRow}>
              <View style={styles.rowHeader}>
                <View style={styles.reminderTitleBlock}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  {row.note !== undefined ? <Text style={styles.rowNote}>{row.note}</Text> : null}
                </View>
                <PixelBadge badge={row.stateBadge} />
              </View>
              <View style={styles.reminderMetaRow}>
                <PixelPersonaChip character={character} chip={row.personaChip} />
                <Text style={styles.meta}>{row.scheduledLabel}</Text>
              </View>
              <View style={styles.inlineActions}>
                <Button
                  label={row.actionLabels.complete}
                  compact
                  onPress={() =>
                    updateFlow((current) => ({
                      ...current,
                      reminders: completeReminder(current.reminders, row.id, now.toISOString()),
                    }))
                  }
                />
                <Button
                  label={row.actionLabels.snooze}
                  compact
                  variant="secondary"
                  onPress={() =>
                    updateFlow((current) => ({
                      ...current,
                      reminders: snoozeReminder(
                        current.reminders,
                        row.id,
                        new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
                      ),
                    }))
                  }
                />
                {reminder !== undefined && row.actionLabels.edit !== undefined ? (
                  <Button
                    label={row.actionLabels.edit}
                    compact
                    variant="ghost"
                    onPress={() => openEditReminder(reminder)}
                  />
                ) : null}
                <Button
                  label={row.actionLabels.delete}
                  compact
                  variant="danger"
                  onPress={() =>
                    updateFlow((current) => ({
                      ...current,
                      reminders: deleteReminder(current.reminders, row.id, now.toISOString()),
                    }))
                  }
                />
              </View>
            </View>
          );
        })}
        <View style={styles.statusStrip}>
          <Text style={styles.meta}>API {clientConfig.apiBaseUrl}</Text>
          <Text style={styles.meta}>
            {copy.home.freeCueLimit(FREE_PLAN_LIMITS.activeReminders)}
          </Text>
        </View>
      </View>
    );
  }

  function renderReminderForm() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>
              {reminderForm.mode === 'create'
                ? copy.reminderForm.createKicker
                : copy.reminderForm.editKicker}
            </Text>
            <Text style={styles.title}>{copy.reminderForm.title}</Text>
          </View>
          <Button label={copy.common.back} compact variant="ghost" onPress={() => goTo('home')} />
        </View>
        <Field
          label={copy.reminderForm.titleLabel}
          value={flow.reminderDraft.title}
          onChangeText={(title) =>
            updateFlow((current) => ({
              ...current,
              reminderDraft: {
                ...current.reminderDraft,
                title,
              },
            }))
          }
        />
        <Field
          label={copy.reminderForm.noteLabel}
          value={flow.reminderDraft.note}
          multiline
          onChangeText={(note) =>
            updateFlow((current) => ({
              ...current,
              reminderDraft: {
                ...current.reminderDraft,
                note,
              },
            }))
          }
        />
        <Field
          label={copy.reminderForm.scheduledAtLabel}
          value={flow.reminderDraft.scheduledAt}
          onChangeText={(scheduledAt) =>
            updateFlow((current) => ({
              ...current,
              reminderDraft: {
                ...current.reminderDraft,
                scheduledAt,
              },
            }))
          }
        />
        <View style={styles.selectorRow}>
          <View style={styles.selectorIdentity}>
            <View>
              <Text style={styles.label}>{copy.reminderForm.characterLabel}</Text>
              <PixelPersonaChip
                character={selectedCharacter}
                chip={reminderForm.selectedPersonaChip}
                selected
              />
            </View>
          </View>
          <Button label={copy.common.select} compact onPress={() => goTo('characterSelect')} />
        </View>
        {reminderForm.validationError !== undefined ? (
          <InlineError error={reminderForm.validationError} />
        ) : null}
        <Button label={reminderForm.saveLabel} onPress={saveReminder} />
      </View>
    );
  }

  function renderCharacterSelect() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>{copy.character.selectKicker}</Text>
            <Text style={styles.title}>{copy.character.selectTitle}</Text>
          </View>
          <Button label={copy.common.create} compact onPress={() => goTo('characterCreate')} />
        </View>
        <View style={styles.safetyNotice}>
          <Text style={styles.label}>{copy.persona.fictionalLabel}</Text>
          <Text style={styles.meta}>{copy.persona.safetyHelper}</Text>
        </View>
        {characterRows.map((row) => {
          const character = findCharacterById(flow.characters, row.id);

          return (
            <View key={row.id} style={styles.characterRow}>
              <View style={styles.characterIdentity}>
                <PixelPersonaChip
                  character={character}
                  chip={row.personaChip}
                  selected={row.selected}
                />
                <View style={styles.characterCopy}>
                  <View style={styles.characterMetaRow}>
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <PixelBadge badge={row.stateBadge} />
                  </View>
                  <Text style={styles.meta}>{row.detail}</Text>
                  <Text style={styles.meta}>
                    {row.archetypeLabel} / {row.toneLabel}
                  </Text>
                  <Text style={styles.characterSafety}>{row.safetyLabel}</Text>
                </View>
              </View>
              <Button
                label={row.actionLabel}
                compact
                variant={
                  row.availability === 'available'
                    ? row.selected
                      ? 'ghost'
                      : 'secondary'
                    : 'ghost'
                }
                onPress={() => {
                  if (row.availability !== 'available') {
                    updateFlow((current) => ({
                      ...current,
                      route: 'proUpsell',
                      lastError: mapApiErrorToFlowError('plan_limit_exceeded', copy),
                    }));
                    return;
                  }

                  updateFlow((current) => ({
                    ...current,
                    selectedCharacterId: row.id,
                    route: 'reminderForm',
                    lastError: undefined,
                  }));
                }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  function renderCharacterCreate() {
    const previewCharacter = createPixelCharacterFallback(
      'custom-preview',
      sanitizeCustomCharacterText(flow.customCharacterDraft.name) || 'Pixel Mate',
      'custom',
    );

    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>{copy.character.createKicker}</Text>
            <Text style={styles.title}>{copy.character.createTitle}</Text>
          </View>
          <Button
            label={copy.common.back}
            compact
            variant="ghost"
            onPress={() => goTo('characterSelect')}
          />
        </View>
        <View style={styles.safetyNotice}>
          <Text style={styles.label}>{copy.persona.fictionalLabel}</Text>
          <Text style={styles.meta}>{characterCreate.safetyHelper}</Text>
        </View>
        <Field
          label={copy.character.name}
          value={flow.customCharacterDraft.name}
          onChangeText={(name) => updateCharacterDraft({ name })}
        />
        <Field
          label={copy.character.relationship}
          value={flow.customCharacterDraft.relationship}
          onChangeText={(relationship) => updateCharacterDraft({ relationship })}
        />
        <Field
          label={copy.character.tone}
          value={flow.customCharacterDraft.tone}
          onChangeText={(tone) => updateCharacterDraft({ tone })}
        />
        <Stepper
          label={copy.character.strictness}
          value={flow.customCharacterDraft.strictness}
          onChange={(strictness) => updateCharacterDraft({ strictness })}
        />
        <Stepper
          label={copy.character.warmth}
          value={flow.customCharacterDraft.warmth}
          onChange={(warmth) => updateCharacterDraft({ warmth })}
        />
        <View style={styles.preview}>
          <View style={styles.characterIdentity}>
            <PixelAvatar character={previewCharacter} />
            <View style={styles.flexColumn}>
              <Text style={styles.label}>{copy.character.preview}</Text>
              <Text style={styles.value}>{characterCreate.previewText}</Text>
            </View>
          </View>
          <Button
            label={
              characterCreate.previewStatus === 'generating'
                ? copy.character.applyPreview
                : copy.character.generatePreview
            }
            compact
            variant="secondary"
            onPress={() =>
              updateFlow((current) => ({
                ...current,
                characterPreviewStatus:
                  current.characterPreviewStatus === 'generating' ? 'ready' : 'generating',
              }))
            }
          />
        </View>
        {characterCreate.validationError !== undefined ? (
          <InlineError error={characterCreate.validationError} />
        ) : null}
        <Button label={copy.common.save} onPress={saveCustomCharacter} />
      </View>
    );
  }

  function renderHistory() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>{copy.history.kicker}</Text>
            <Text style={styles.title}>{copy.history.title}</Text>
          </View>
          <Button
            label={copy.history.reload}
            compact
            variant="secondary"
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                historyStatus: current.historyStatus === 'failed' ? 'idle' : 'loading',
              }))
            }
          />
        </View>
        {history.isLoading ? (
          <View style={styles.stack}>
            <View style={styles.skeletonRow} />
            <Button
              label={copy.history.loadComplete}
              compact
              onPress={() =>
                updateSecondary((current) => ({
                  ...current,
                  historyStatus: 'idle',
                }))
              }
            />
          </View>
        ) : null}
        {history.emptyMessage !== undefined ? (
          <View style={styles.emptyState}>
            <Text style={styles.title}>{history.emptyMessage}</Text>
            <Text style={styles.body}>{copy.history.emptyBody}</Text>
          </View>
        ) : null}
        {history.errorMessage !== undefined ? (
          <InlineError error={{ message: history.errorMessage, actionLabel: copy.common.retry }} />
        ) : null}
        {history.rows.map((row) => {
          const item = secondary.historyItems.find((historyItem) => historyItem.id === row.id);

          if (item === undefined) {
            return null;
          }

          return (
            <View key={row.id} style={styles.historyRow}>
              <View style={styles.historyTopLine}>
                <PixelPersonaChip chip={row.personaChip} compact />
                <PixelBadge badge={row.statusBadge} />
              </View>
              <Text style={styles.historyBody}>{row.body}</Text>
              <Text style={styles.meta}>{row.detail}</Text>
              <View style={styles.inlineActions}>
                <Button
                  label={row.actionLabels.reuse}
                  compact
                  onPress={() => reuseHistoryItem(item)}
                />
                {row.canChat ? (
                  <Button
                    label={row.actionLabels.chat}
                    compact
                    variant="secondary"
                    onPress={() => openChatForHistory(item)}
                  />
                ) : null}
                <Button
                  label={row.actionLabels.delete}
                  compact
                  variant="danger"
                  onPress={() => deleteHistoryItem(row.id)}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderChat() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View style={styles.chatHeader}>
            <View style={styles.flexColumn}>
              <Text style={styles.kicker}>{copy.chat.kicker}</Text>
              <Text style={styles.title}>{chat.characterName}</Text>
            </View>
            <PixelPersonaChip chip={chat.personaChip} compact />
          </View>
          <PixelBadge badge={chat.remainingBadge} />
        </View>
        {chat.emptyGreeting !== undefined ? (
          <View style={styles.chatEmptyState}>
            <Text style={styles.rowTitle}>{chat.emptyGreeting}</Text>
            <Text style={styles.meta}>{chat.personaChip.safetyLabel}</Text>
          </View>
        ) : null}
        {chat.errorMessage !== undefined ? (
          <InlineError error={{ message: chat.errorMessage, actionLabel: copy.chat.resend }} />
        ) : null}
        {chat.messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.chatBubble,
              message.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
            ]}
          >
            <Text style={styles.chatRole}>{message.roleLabel}</Text>
            <Text style={styles.value}>{message.body}</Text>
          </View>
        ))}
        <Field
          label={copy.chat.messageLabel}
          value={secondary.chatInput}
          multiline
          onChangeText={(chatInput) =>
            updateSecondary((current) => ({
              ...current,
              chatInput,
              chatStatus: 'idle',
            }))
          }
        />
        <View style={styles.inlineActions}>
          <Button label={copy.chat.send} compact onPress={sendChatMessage} />
          <Button
            label={copy.chat.createCue}
            compact
            variant="secondary"
            onPress={createReminderFromChat}
          />
          <Button
            label={copy.chat.simulateFailure}
            compact
            variant="ghost"
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                chatStatus: 'failed',
              }))
            }
          />
        </View>
      </View>
    );
  }

  function renderProUpsell() {
    return (
      <View style={styles.stack}>
        <View style={styles.heroBand}>
          <Text style={styles.kicker}>{copy.pro.kicker}</Text>
          <Text style={styles.heroTitle}>{pro.title}</Text>
          <View style={styles.benefitPillRow}>
            {pro.benefits.map((benefit, index) => (
              <Text key={`${benefit}-${index}`} style={styles.benefitPill}>
                {benefit}
              </Text>
            ))}
          </View>
        </View>
        {flow.lastError !== undefined ? <InlineError error={flow.lastError} /> : null}
        {pro.errorMessage !== undefined ? (
          <InlineError error={{ message: pro.errorMessage }} />
        ) : null}
        <View style={styles.benefitList}>
          {pro.benefitRows.map((row, index) => (
            <View
              key={`${row.iconKey}-${index}`}
              style={[styles.planRow, row.priority === 'core' ? styles.planRowCore : undefined]}
            >
              <View style={styles.flexColumn}>
                <Text style={styles.value}>{row.label}</Text>
                <Text style={styles.meta}>{copy.pro.comparison(row.free, row.pro)}</Text>
              </View>
              <PixelBadge
                badge={{
                  label: row.priority === 'core' ? copy.pro.included : copy.packs.addOnLabel,
                  tone: row.priority === 'core' ? 'success' : 'neutral',
                }}
              />
            </View>
          ))}
        </View>
        <View style={styles.notice}>
          <View style={styles.badgeLine}>
            <PixelBadge badge={{ label: copy.packs.addOnLabel, tone: 'neutral' }} />
            <Text style={styles.noticeTitle}>{copy.packs.title}</Text>
          </View>
          <Text style={styles.noticeBody}>{pro.addOnNote}</Text>
        </View>
        <View style={styles.inlineActions}>
          <Button
            label={pro.purchaseLabel}
            compact
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                commerceStatus: 'loading',
              }))
            }
          />
          <Button
            label={pro.restoreLabel}
            compact
            variant="secondary"
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                commerceStatus: mapCommerceFailure('restore'),
              }))
            }
          />
          <Button
            label={copy.pro.showPurchaseFailure}
            compact
            variant="ghost"
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                commerceStatus: mapCommerceFailure('purchase'),
              }))
            }
          />
        </View>
        <Button label={copy.pro.home} onPress={() => goTo('home')} />
      </View>
    );
  }

  function renderPackStore() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>{copy.packs.kicker}</Text>
            <Text style={styles.title}>{copy.packs.title}</Text>
          </View>
          <Button
            label={copy.packs.restore}
            compact
            variant="secondary"
            onPress={() =>
              updateSecondary((current) => ({
                ...current,
                commerceStatus: mapCommerceFailure('restore'),
              }))
            }
          />
        </View>
        {packStore.errorMessage !== undefined ? (
          <InlineError error={{ message: packStore.errorMessage }} />
        ) : null}
        {packStore.rows.map((row) => {
          const packCharacterId = secondary.packs.find((pack) => pack.id === row.id)
            ?.characterIds[0];
          const character =
            findCharacterById(flow.characters, packCharacterId) ??
            createPixelCharacterFallback(packCharacterId ?? row.id, row.name, 'pack');

          return (
            <View key={row.id} style={styles.characterRow}>
              <View style={styles.characterIdentity}>
                <PixelAvatar character={character} />
                <View style={styles.flexColumn}>
                  <Text style={styles.rowTitle}>{row.name}</Text>
                  <Text style={styles.meta}>{row.description}</Text>
                  <View style={styles.badgeLine}>
                    <PixelBadge badge={row.stateBadge} />
                    <Text style={styles.badge}>{row.priceLabel}</Text>
                  </View>
                </View>
              </View>
              <Button
                label={row.actionLabel}
                compact
                variant={row.available ? 'secondary' : 'primary'}
                onPress={() =>
                  updateSecondary((current) =>
                    row.available ? current : markPackPurchased(current, row.id),
                  )
                }
              />
            </View>
          );
        })}
        <Button
          label={copy.packs.showPurchaseFailure}
          variant="ghost"
          onPress={() =>
            updateSecondary((current) => ({
              ...current,
              commerceStatus: mapCommerceFailure('purchase'),
            }))
          }
        />
      </View>
    );
  }

  function renderSettings() {
    return (
      <View style={styles.stack}>
        <View>
          <Text style={styles.kicker}>{copy.settings.kicker}</Text>
          <Text style={styles.title}>{copy.settings.title}</Text>
        </View>
        {settings.selectedDetail !== undefined ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>{settings.selectedDetail}</Text>
          </View>
        ) : null}
        {settings.rows.map((row) => (
          <Pressable
            key={row.destination}
            accessibilityRole="button"
            onPress={() => selectSetting(row.destination)}
            style={styles.settingsRow}
          >
            <View style={styles.flexColumn}>
              <Text style={[styles.rowTitle, row.destructive ? styles.dangerText : undefined]}>
                {row.title}
              </Text>
              <Text style={styles.meta}>{row.detail}</Text>
            </View>
            <View style={styles.settingsAction}>
              {row.stateBadge !== undefined ? <PixelBadge badge={row.stateBadge} /> : null}
              <Text style={styles.meta}>
                {row.destination === 'language' ? copy.settings.languageToggle : copy.settings.open}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  function setFilter(reminderFilter: ReminderFilter) {
    updateFlow((current) => ({
      ...current,
      reminderFilter,
      lastError: undefined,
    }));
  }

  function updateCharacterDraft(patch: Partial<MainFlowState['customCharacterDraft']>) {
    updateFlow((current) => ({
      ...current,
      customCharacterDraft: {
        ...current.customCharacterDraft,
        ...patch,
      },
      characterPreviewStatus: 'idle',
    }));
  }

  function renderRoute() {
    if (!flow.authenticated || flow.route === 'onboarding') {
      return renderOnboarding();
    }

    if (flow.route === 'reminderForm') {
      return renderReminderForm();
    }

    if (flow.route === 'characterSelect') {
      return renderCharacterSelect();
    }

    if (flow.route === 'characterCreate') {
      return renderCharacterCreate();
    }

    if (flow.route === 'proUpsell') {
      return renderProUpsell();
    }

    if (flow.route === 'history') {
      return renderHistory();
    }

    if (flow.route === 'chat') {
      return renderChat();
    }

    if (flow.route === 'packStore') {
      return renderPackStore();
    }

    if (flow.route === 'settings') {
      return renderSettings();
    }

    return renderHome();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>{renderRoute()}</ScrollView>
      {flow.authenticated ? (
        <View style={styles.tabBar}>
          <Tab label={copy.tabs.home} active={flow.route === 'home'} onPress={() => goTo('home')} />
          <Tab
            label={copy.tabs.history}
            active={flow.route === 'history'}
            onPress={() => goTo('history')}
          />
          <Tab label={copy.tabs.chat} active={flow.route === 'chat'} onPress={() => goTo('chat')} />
          <Tab
            label={copy.tabs.store}
            active={flow.route === 'packStore' || flow.route === 'proUpsell'}
            onPress={() => goTo('packStore')}
          />
          <Tab
            label={copy.tabs.settings}
            active={flow.route === 'settings'}
            onPress={() => goTo('settings')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const PixelAvatar = memo(function PixelAvatar({
  character,
  selected = false,
  size = 'medium',
}: {
  character: PixelCharacter | undefined;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
}) {
  const theme = getPixelAvatarTheme(character);
  const pixelSize = size === 'large' ? 5 : size === 'small' ? 3 : 4;

  return (
    <View
      accessibilityLabel={`${character?.name ?? 'Character'} pixel avatar`}
      style={[
        styles.pixelAvatar,
        styles[`pixelAvatar_${size}`],
        {
          backgroundColor: theme.background,
          borderColor: selected ? theme.accent : theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      {theme.pixels.map((row, rowIndex) => (
        <View key={`${row}-${rowIndex}`} style={styles.pixelRow}>
          {Array.from(row).map((token, columnIndex) => (
            <View
              key={`${rowIndex}-${columnIndex}`}
              style={[
                styles.pixelCell,
                {
                  backgroundColor: theme.colors[token as keyof typeof theme.colors],
                  height: pixelSize,
                  width: pixelSize,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

function PixelMotif() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.pixelMotif}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.pixelMotifCell,
            index === 1 || index === 5 ? styles.pixelMotifCellAccent : undefined,
          ]}
        />
      ))}
    </View>
  );
}

const PixelPersonaChip = memo(function PixelPersonaChip({
  chip,
  character,
  compact = false,
  selected = false,
}: {
  chip: PixelPersonaChipModel;
  character?: PixelCharacter | undefined;
  compact?: boolean;
  selected?: boolean;
}) {
  const chipCharacter =
    character ??
    createPixelCharacterFallback(
      chip.characterId,
      chip.label,
      chip.avatarVariant === 'custom' ? 'custom' : 'built_in',
    );

  return (
    <View
      style={[
        styles.personaChip,
        compact ? styles.personaChipCompact : undefined,
        selected ? styles.personaChipSelected : undefined,
      ]}
    >
      <PixelAvatar character={chipCharacter} selected={selected} size="small" />
      <View style={styles.personaChipText}>
        <Text numberOfLines={1} style={styles.personaChipLabel}>
          {chip.label}
        </Text>
        <Text numberOfLines={1} style={styles.personaChipMeta}>
          {chip.archetypeLabel} / {chip.toneLabel}
        </Text>
      </View>
    </View>
  );
});

const PixelBadge = memo(function PixelBadge({ badge }: { badge: PixelBadgeModel }) {
  return <Text style={[styles.pixelBadge, getPixelBadgeToneStyle(badge.tone)]}>{badge.label}</Text>;
});

function getPixelBadgeToneStyle(tone: PixelBadgeModel['tone']) {
  const toneStyles: Record<PixelBadgeModel['tone'], object> = {
    neutral: styles.pixelBadgeNeutral,
    selected: styles.pixelBadgeSelected,
    locked: styles.pixelBadgeLocked,
    success: styles.pixelBadgeSuccess,
    warning: styles.pixelBadgeWarning,
    danger: styles.pixelBadgeDanger,
  };

  return toneStyles[tone] ?? styles.pixelBadgeNeutral;
}

function findCharacterById(characters: Character[], characterId: string | undefined) {
  if (characterId === undefined) {
    return undefined;
  }

  return characters.find((character) => character.id === characterId);
}

function createPixelCharacterFallback(
  id: string,
  name: string,
  type: PixelCharacter['type'],
): PixelCharacter {
  return {
    id,
    name,
    type,
  };
}

function Button({
  label,
  onPress,
  variant = 'primary',
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        compact ? styles.buttonCompact : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
    </Pressable>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segment, active ? styles.segmentActive : undefined]}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        allowFontScaling
        multiline={multiline}
        onChangeText={onChangeText}
        style={[styles.input, multiline ? styles.inputMultiline : undefined]}
        value={value}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperControls}>
        <Button
          label="-"
          compact
          variant="secondary"
          onPress={() => onChange(Math.max(0, value - 1))}
        />
        <Text style={styles.stepperValue}>{value}</Text>
        <Button
          label="+"
          compact
          variant="secondary"
          onPress={() => onChange(Math.min(10, value + 1))}
        />
      </View>
    </View>
  );
}

function InlineError({ error }: { error: { message: string; actionLabel?: string } }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.actionLabel !== undefined ? (
        <Text style={styles.errorAction}>{error.actionLabel}</Text>
      ) : null}
    </View>
  );
}

const palette = {
  background: '#F3F5F8',
  surface: '#FFFFFF',
  ink: '#181B24',
  muted: '#596170',
  border: '#C9D0DA',
  teal: '#08746F',
  blue: '#3657D4',
  coral: '#D4514A',
  amber: '#B46B00',
  paleBlue: '#E8EEFF',
  paleTeal: '#E4F7F3',
  paleCoral: '#FFE7E1',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    paddingBottom: 96,
  },
  stack: {
    gap: 14,
  },
  onboardingHeader: {
    gap: 12,
    paddingVertical: 12,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandText: {
    color: palette.teal,
    fontSize: 17,
    fontWeight: '900',
  },
  heroBand: {
    backgroundColor: palette.paleTeal,
    borderColor: '#BFD8D3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  homeHeader: {
    alignItems: 'flex-end',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  kicker: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  title: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  body: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  benefitPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitPill: {
    backgroundColor: palette.surface,
    borderColor: '#BFD8D3',
    borderRadius: 6,
    borderWidth: 1,
    color: palette.teal,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  benefitList: {
    gap: 10,
  },
  notice: {
    backgroundColor: palette.paleBlue,
    borderColor: '#C8D6EA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  noticeTitle: {
    color: palette.blue,
    fontSize: 16,
    fontWeight: '800',
  },
  noticeBody: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  segmented: {
    backgroundColor: '#ECEFE8',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: palette.surface,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: palette.ink,
  },
  emptyState: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  skeletonRow: {
    backgroundColor: '#E1E5DD',
    borderRadius: 8,
    height: 78,
  },
  reminderRow: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  rowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  reminderIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  reminderTitleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  historyRow: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderLeftColor: '#22A6B3',
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  historyTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  historyBody: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  rowTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  rowNote: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  reminderMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: palette.paleCoral,
    borderRadius: 6,
    color: palette.coral,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pixelBadge: {
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pixelBadgeNeutral: {
    backgroundColor: '#EEF1F5',
    borderColor: palette.border,
    color: palette.muted,
  },
  pixelBadgeSelected: {
    backgroundColor: palette.paleTeal,
    borderColor: '#9DCCC4',
    color: palette.teal,
  },
  pixelBadgeLocked: {
    backgroundColor: palette.paleBlue,
    borderColor: '#C8D6EA',
    color: palette.blue,
  },
  pixelBadgeSuccess: {
    backgroundColor: '#E4F7E9',
    borderColor: '#AED8BA',
    color: '#257044',
  },
  pixelBadgeWarning: {
    backgroundColor: '#FFF3D8',
    borderColor: '#E6C06B',
    color: palette.amber,
  },
  pixelBadgeDanger: {
    backgroundColor: palette.paleCoral,
    borderColor: '#E7B7AE',
    color: palette.coral,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusStrip: {
    borderColor: palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  selectorRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  selectorIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  safetyNotice: {
    backgroundColor: palette.paleBlue,
    borderColor: '#C8D6EA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  characterRow: {
    alignItems: 'stretch',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  characterIdentity: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  characterCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  characterMetaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  characterSafety: {
    color: palette.teal,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  flexColumn: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  chatHeader: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    minWidth: 0,
  },
  personaChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
    minHeight: 44,
    padding: 6,
    paddingRight: 10,
  },
  personaChipCompact: {
    backgroundColor: '#F8FAFB',
  },
  personaChipSelected: {
    backgroundColor: palette.paleTeal,
    borderColor: '#91C9BE',
  },
  personaChipText: {
    gap: 2,
    minWidth: 0,
  },
  personaChipLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  personaChipMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  pixelAvatar: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 2,
    elevation: 2,
    justifyContent: 'center',
    shadowOffset: {
      height: 3,
      width: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  pixelAvatar_small: {
    height: 36,
    width: 36,
  },
  pixelAvatar_medium: {
    height: 48,
    width: 48,
  },
  pixelAvatar_large: {
    height: 58,
    width: 58,
  },
  pixelMotif: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    height: 21,
    width: 21,
  },
  pixelMotifCell: {
    backgroundColor: palette.teal,
    height: 5,
    width: 5,
  },
  pixelMotifCellAccent: {
    backgroundColor: palette.coral,
  },
  pixelRow: {
    flexDirection: 'row',
  },
  pixelCell: {
    borderRadius: 0,
  },
  chatEmptyState: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderLeftColor: palette.teal,
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  chatBubble: {
    borderRadius: 8,
    gap: 6,
    padding: 12,
  },
  chatRole: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: palette.paleBlue,
    maxWidth: '88%',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    maxWidth: '88%',
  },
  settingsRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  settingsAction: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dangerText: {
    color: palette.coral,
  },
  preview: {
    backgroundColor: palette.paleTeal,
    borderColor: '#BFD8D3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  planRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  planRowCore: {
    borderColor: '#9DCCC4',
    borderLeftColor: palette.teal,
    borderLeftWidth: 4,
  },
  field: {
    gap: 7,
  },
  label: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  stepperControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  stepperValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  buttonCompact: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button_primary: {
    backgroundColor: palette.teal,
    borderColor: palette.teal,
  },
  button_secondary: {
    backgroundColor: palette.paleTeal,
    borderColor: '#BFD8D3',
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.border,
  },
  button_danger: {
    backgroundColor: palette.paleCoral,
    borderColor: '#E0B5B1',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonText_primary: {
    color: '#FFFFFF',
  },
  buttonText_secondary: {
    color: palette.teal,
  },
  buttonText_ghost: {
    color: palette.ink,
  },
  buttonText_danger: {
    color: palette.coral,
  },
  pressed: {
    opacity: 0.72,
  },
  error: {
    backgroundColor: palette.paleCoral,
    borderColor: '#E0B5B1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  errorText: {
    color: palette.coral,
    fontSize: 14,
    fontWeight: '800',
  },
  errorAction: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    minHeight: 64,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: palette.teal,
  },
});

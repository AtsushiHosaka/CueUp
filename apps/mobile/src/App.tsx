import { FREE_PLAN_LIMITS, type Character, type Reminder } from '@cueup/shared';
import { useMemo, useState } from 'react';
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

const fixedNow = new Date('2026-06-01T00:00:00.000Z');

export default function App() {
  const now = useMemo(() => fixedNow, []);
  const [flow, setFlow] = useState<MainFlowState>(() => createInitialMainFlowState(now));
  const [secondary, setSecondary] = useState<SecondaryFlowState>(() =>
    createSecondaryFlowState(now.toISOString()),
  );
  const home = createHomeScreenModel(flow, now);
  const onboarding = createOnboardingScreenModel(flow);
  const reminderForm = createReminderFormModel(flow);
  const characterCreate = createCharacterCreateModel(flow);
  const characterRows = createCharacterSelectRows(flow);
  const selectedCharacter = flow.characters.find(
    (character) => character.id === flow.selectedCharacterId,
  );
  const history = createHistoryScreenModel(secondary);
  const chat = createChatScreenModel(secondary, selectedCharacter);
  const pro = createProScreenModel(secondary);
  const packStore = createPackStoreScreenModel(secondary);
  const settings = createSettingsScreenModel(secondary);

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
      reminders: createDemoReminders(now.toISOString()),
      reminderFilter: 'all',
      reminderListStatus: 'idle',
      lastError: undefined,
    }));
  }

  function openCreateReminder() {
    updateFlow((current) => ({
      ...current,
      route: 'reminderForm',
      reminderDraft: createReminderDraft(now),
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
    const validationError = validateReminderDraft(flow);

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
        scheduledAt: createReminderDraft(now).scheduledAt,
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
        lastError: mapApiErrorToFlowError('plan_limit_exceeded'),
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
      appendChatExchange(current, {
        characterId: flow.selectedCharacterId,
        userId: 'user-1',
        body: current.chatInput,
        now: now.toISOString(),
      }),
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
        title: latestUserMessage?.body.slice(0, 40) ?? 'チャットから Cue',
        note: latestUserMessage?.body ?? '',
        scheduledAt: createReminderDraft(now).scheduledAt,
      },
      editingReminderId: undefined,
      lastError: undefined,
    }));
  }

  function selectSetting(destination: SettingsDestination) {
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
        <View style={styles.heroBand}>
          <Text style={styles.kicker}>CueUp</Text>
          <Text style={styles.heroTitle}>{onboarding.title}</Text>
          <Text style={styles.body}>キャラクターの声で、忘れたくない行動を短く受け取れます。</Text>
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
          <Button label="ログインして続行" variant="ghost" onPress={startSignedInHome} />
        ) : null}
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Home</Text>
            <Text style={styles.title}>今日の Cue</Text>
          </View>
          <Button label="新規" compact onPress={openCreateReminder} />
        </View>
        {home.notificationBanner !== undefined ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>{home.notificationBanner.title}</Text>
            <Button label={home.notificationBanner.actionLabel} compact onPress={() => undefined} />
          </View>
        ) : null}
        <View style={styles.segmented}>
          <Segment
            label="今日"
            active={home.filter === 'today'}
            onPress={() => setFilter('today')}
          />
          <Segment label="すべて" active={home.filter === 'all'} onPress={() => setFilter('all')} />
          <Segment
            label="スヌーズ"
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
            <Text style={styles.title}>{home.emptyState.title}</Text>
            <Text style={styles.body}>{home.emptyState.body}</Text>
            <View style={styles.inlineActions}>
              <Button label={home.emptyState.actionLabel} compact onPress={openCreateReminder} />
              <Button
                label="サンプル同期"
                compact
                variant="secondary"
                onPress={loadDemoReminders}
              />
            </View>
          </View>
        ) : null}
        {home.rows.map((row) => {
          const reminder = flow.reminders.find((item) => item.id === row.id);

          return (
            <View key={row.id} style={styles.reminderRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                {row.badge !== undefined ? <Text style={styles.badge}>{row.badge}</Text> : null}
              </View>
              <Text style={styles.meta}>
                {row.detail} / {row.characterName}
              </Text>
              <View style={styles.inlineActions}>
                <Button
                  label="完了"
                  compact
                  onPress={() =>
                    updateFlow((current) => ({
                      ...current,
                      reminders: completeReminder(current.reminders, row.id, now.toISOString()),
                    }))
                  }
                />
                <Button
                  label="10分後"
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
                {reminder !== undefined ? (
                  <Button
                    label="編集"
                    compact
                    variant="ghost"
                    onPress={() => openEditReminder(reminder)}
                  />
                ) : null}
                <Button
                  label="削除"
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
          <Text style={styles.meta}>Free {FREE_PLAN_LIMITS.activeReminders} Cue</Text>
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
              {reminderForm.mode === 'create' ? 'New Cue' : 'Edit Cue'}
            </Text>
            <Text style={styles.title}>Cue を設定</Text>
          </View>
          <Button label="戻る" compact variant="ghost" onPress={() => goTo('home')} />
        </View>
        <Field
          label="タイトル"
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
          label="メモ"
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
          label="通知時刻"
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
          <View>
            <Text style={styles.label}>キャラクター</Text>
            <Text style={styles.value}>{reminderForm.selectedCharacterName}</Text>
          </View>
          <Button label="選択" compact onPress={() => goTo('characterSelect')} />
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
            <Text style={styles.kicker}>Character</Text>
            <Text style={styles.title}>声を選ぶ</Text>
          </View>
          <Button label="作成" compact onPress={() => goTo('characterCreate')} />
        </View>
        {characterRows.map((row) => (
          <View key={row.id} style={styles.characterRow}>
            <View>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.meta}>{row.detail}</Text>
            </View>
            <Button
              label={row.actionLabel}
              compact
              variant={row.availability === 'available' ? 'secondary' : 'ghost'}
              onPress={() => {
                if (row.availability !== 'available') {
                  updateFlow((current) => ({
                    ...current,
                    route: 'proUpsell',
                    lastError: mapApiErrorToFlowError('plan_limit_exceeded'),
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
        ))}
      </View>
    );
  }

  function renderCharacterCreate() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Custom</Text>
            <Text style={styles.title}>キャラクター作成</Text>
          </View>
          <Button label="戻る" compact variant="ghost" onPress={() => goTo('characterSelect')} />
        </View>
        <Field
          label="名前"
          value={flow.customCharacterDraft.name}
          onChangeText={(name) => updateCharacterDraft({ name })}
        />
        <Field
          label="関係性"
          value={flow.customCharacterDraft.relationship}
          onChangeText={(relationship) => updateCharacterDraft({ relationship })}
        />
        <Field
          label="話し方"
          value={flow.customCharacterDraft.tone}
          onChangeText={(tone) => updateCharacterDraft({ tone })}
        />
        <Stepper
          label="厳しさ"
          value={flow.customCharacterDraft.strictness}
          onChange={(strictness) => updateCharacterDraft({ strictness })}
        />
        <Stepper
          label="温かさ"
          value={flow.customCharacterDraft.warmth}
          onChange={(warmth) => updateCharacterDraft({ warmth })}
        />
        <View style={styles.preview}>
          <Text style={styles.label}>プレビュー</Text>
          <Text style={styles.value}>{characterCreate.previewText}</Text>
          <Button
            label={characterCreate.previewStatus === 'generating' ? '反映' : '生成'}
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
        <Button label="保存" onPress={saveCustomCharacter} />
      </View>
    );
  }

  function renderHistory() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>History</Text>
            <Text style={styles.title}>通知履歴</Text>
          </View>
          <Button
            label="再読込"
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
              label="読込完了"
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
            <Text style={styles.body}>AI 通知が届くとここから再利用できます。</Text>
          </View>
        ) : null}
        {history.errorMessage !== undefined ? (
          <InlineError error={{ message: history.errorMessage, actionLabel: '再試行' }} />
        ) : null}
        {history.rows.map((row) => {
          const item = secondary.historyItems.find((historyItem) => historyItem.id === row.id);

          if (item === undefined) {
            return null;
          }

          return (
            <View key={row.id} style={styles.reminderRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.badge}>{row.statusLabel}</Text>
              </View>
              <Text style={styles.meta}>{row.detail}</Text>
              <View style={styles.inlineActions}>
                <Button label="再利用" compact onPress={() => reuseHistoryItem(item)} />
                <Button
                  label="チャット"
                  compact
                  variant="secondary"
                  onPress={() => openChatForHistory(item)}
                />
                <Button
                  label="削除"
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
          <View>
            <Text style={styles.kicker}>Chat</Text>
            <Text style={styles.title}>{chat.characterName}</Text>
          </View>
          <Text style={styles.badge}>{chat.remainingLabel}</Text>
        </View>
        {chat.emptyGreeting !== undefined ? (
          <View style={styles.emptyState}>
            <Text style={styles.rowTitle}>{chat.emptyGreeting}</Text>
          </View>
        ) : null}
        {chat.errorMessage !== undefined ? (
          <InlineError error={{ message: chat.errorMessage, actionLabel: '再送信' }} />
        ) : null}
        {chat.messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.chatBubble,
              message.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
            ]}
          >
            <Text style={styles.meta}>{message.role === 'user' ? 'You' : chat.characterName}</Text>
            <Text style={styles.value}>{message.body}</Text>
          </View>
        ))}
        <Field
          label="メッセージ"
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
          <Button label="送信" compact onPress={sendChatMessage} />
          <Button label="Cue 化" compact variant="secondary" onPress={createReminderFromChat} />
          <Button
            label="AI失敗"
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
          <Text style={styles.kicker}>Pro</Text>
          <Text style={styles.heroTitle}>{pro.title}</Text>
          <Text style={styles.body}>{pro.benefits.join(' / ')}</Text>
        </View>
        {flow.lastError !== undefined ? <InlineError error={flow.lastError} /> : null}
        {pro.errorMessage !== undefined ? (
          <InlineError error={{ message: pro.errorMessage }} />
        ) : null}
        {pro.comparisonRows.map((row) => (
          <View key={row.label} style={styles.planRow}>
            <Text style={styles.value}>{row.label}</Text>
            <Text style={styles.meta}>
              Free {row.free} / Pro {row.pro}
            </Text>
          </View>
        ))}
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
            label="購入失敗"
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
        <Button label="ホームへ戻る" onPress={() => goTo('home')} />
      </View>
    );
  }

  function renderPackStore() {
    return (
      <View style={styles.stack}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Store</Text>
            <Text style={styles.title}>Character Pack</Text>
          </View>
          <Button
            label="復元"
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
        {packStore.rows.map((row) => (
          <View key={row.id} style={styles.characterRow}>
            <View style={styles.flexColumn}>
              <Text style={styles.rowTitle}>{row.name}</Text>
              <Text style={styles.meta}>{row.description}</Text>
              <Text style={styles.badge}>{row.priceLabel}</Text>
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
        ))}
        <Button
          label="購入失敗を表示"
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
          <Text style={styles.kicker}>Settings</Text>
          <Text style={styles.title}>設定</Text>
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
            <Text style={styles.meta}>Open</Text>
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
          <Tab label="Home" active={flow.route === 'home'} onPress={() => goTo('home')} />
          <Tab label="History" active={flow.route === 'history'} onPress={() => goTo('history')} />
          <Tab label="Chat" active={flow.route === 'chat'} onPress={() => goTo('chat')} />
          <Tab
            label="Store"
            active={flow.route === 'packStore' || flow.route === 'proUpsell'}
            onPress={() => goTo('packStore')}
          />
          <Tab
            label="Settings"
            active={flow.route === 'settings'}
            onPress={() => goTo('settings')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
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
  background: '#F6F7F1',
  surface: '#FFFFFF',
  ink: '#1F2421',
  muted: '#59625D',
  border: '#D7DBD2',
  teal: '#23666A',
  blue: '#2F5DA8',
  coral: '#B94A48',
  amber: '#9B6A17',
  paleBlue: '#E9F0FA',
  paleTeal: '#E7F3F1',
  paleCoral: '#F8E9E7',
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
    justifyContent: 'space-between',
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
  rowTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  meta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
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
  characterRow: {
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
  flexColumn: {
    flex: 1,
    gap: 6,
  },
  chatBubble: {
    borderRadius: 8,
    gap: 6,
    padding: 12,
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
    minHeight: 38,
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

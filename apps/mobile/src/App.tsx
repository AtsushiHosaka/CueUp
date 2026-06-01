import { FREE_PLAN_LIMITS } from '@cueup/shared';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { clientConfig } from './config/clientConfig';
import { createReminderDraft } from './domain/reminders';

const draft = createReminderDraft();

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>CueUp</Text>
        <Text style={styles.title}>Reminder prompts with character-backed momentum.</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>API</Text>
        <Text style={styles.value}>{clientConfig.apiBaseUrl}</Text>
        <Text style={styles.label}>Free plan</Text>
        <Text style={styles.value}>{FREE_PLAN_LIMITS.activeReminders} active reminders</Text>
        <Text style={styles.label}>Draft reminder</Text>
        <Text style={styles.value}>{draft.title}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F7F2',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    gap: 8,
    marginBottom: 24,
  },
  kicker: {
    color: '#335C67',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#1C1C1A',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D8CF',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: '#5D6460',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: '#1C1C1A',
    fontSize: 16,
    marginBottom: 8,
  },
});

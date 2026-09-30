import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/GuardianUI';
import {
  CALIBRATION_STATUS,
  type CalibrationEntry,
} from '@/constants/calibration';
import {
  getCalibrationEntries,
  saveCalibrationEntries,
} from '@/services/analysisStore';
import { useColors } from '@/hooks/useColors';

export default function CalibrationScreen() {
  const colors = useColors();
  const router = useRouter();
  const [entries, setEntries] = useState<CalibrationEntry[]>([]);
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#');
  const [referenceValue, setReferenceValue] = useState('');

  const load = useCallback(async () => {
    setEntries(await getCalibrationEntries());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addEntry = async () => {
    if (!label.trim() || !/^#[0-9a-f]{6}$/i.test(hex.trim())) {
      Alert.alert(
        'Add a valid reference',
        'Use a label and a six-digit hex colour such as #D5C98E.',
      );
      return;
    }

    const next: CalibrationEntry = {
      id: `reference-${Date.now()}`,
      label: label.trim(),
      hex: hex.trim().toUpperCase(),
      referenceValue:
        referenceValue.trim() || 'Add experimentally measured value later',
      status: 'experimental',
    };
    const updated = [...entries, next];
    setEntries(updated);
    await saveCalibrationEntries(updated);
    setLabel('');
    setHex('#');
    setReferenceValue('');
  };

  const removeEntry = (entry: CalibrationEntry) => {
    Alert.alert(
      'Delete reference?',
      `Remove ${entry.label} from the local calibration table?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = entries.filter((item) => item.id !== entry.id);
            setEntries(updated);
            await saveCalibrationEntries(updated);
          },
        },
      ],
    );
  };

  return (
    <Screen
      title="Calibration"
      eyebrow="REFERENCE TABLE"
      right={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </Pressable>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.notice,
            { backgroundColor: colors.overlay, borderColor: colors.border },
          ]}
        >
          <Feather name="alert-circle" size={17} color={colors.warning} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            {CALIBRATION_STATUS}. These references classify visual similarity
            only and must not be used for workplace decisions.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Known strip references
        </Text>
        {entries.map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.entry,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: entry.hex }]} />
            <View style={styles.entryBody}>
              <Text style={[styles.entryLabel, { color: colors.foreground }]}>
                {entry.label}
              </Text>
              <Text
                style={[styles.entryMeta, { color: colors.mutedForeground }]}
              >
                {entry.hex} · {entry.referenceValue}
              </Text>
            </View>
            <Pressable onPress={() => removeEntry(entry)} hitSlop={10}>
              <Feather
                name="trash-2"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        ))}

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.foreground, marginTop: 24 },
          ]}
        >
          Add a reference for later
        </Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Reference label"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <TextInput
          value={hex}
          onChangeText={setHex}
          autoCapitalize="characters"
          placeholder="#D5C98E"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <TextInput
          value={referenceValue}
          onChangeText={setReferenceValue}
          placeholder="Experimentally measured value (optional)"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <Pressable
          onPress={addEntry}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Feather name="plus" size={17} color={colors.primaryForeground} />
          <Text style={[styles.addText, { color: colors.primaryForeground }]}>
            Save local reference
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  notice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    marginBottom: 23,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: 'Inter_500Medium',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 11,
  },
  entry: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 9,
  },
  swatch: { width: 34, height: 46, borderRadius: 9 },
  entryBody: { flex: 1 },
  entryLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  entryMeta: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 9,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  addButton: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  addText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});
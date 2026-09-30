import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActionButton, Screen, SectionHeading, SimulatedBadge } from '@/components/GuardianUI';
import { stripReadings } from '@/constants/demoData';
import { useColors } from '@/hooks/useColors';

export default function AnalysisScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState<string | null>(null);
  const analyze = async (id: string) => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(id); };
  const result = stripReadings.find((strip) => strip.id === selected);
  return <Screen title="Strip analysis" eyebrow="PASSIVE CHECK" right={<SimulatedBadge compact />}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.introIcon, { backgroundColor: colors.primary }]}><Feather name="layers" size={20} color={colors.primaryForeground} /></View><Text style={[styles.introTitle, { color: colors.foreground }]}>Color-strip reference</Text><Text style={[styles.introCopy, { color: colors.mutedForeground }]}>Compare a passive strip appearance against the reference bands below. This screen is visual guidance only and does not use the camera.</Text></View>
    <SectionHeading title="Choose a demo appearance" />
    {stripReadings.map((strip) => <View key={strip.id} style={[styles.stripCard, { backgroundColor: colors.card, borderColor: selected === strip.id ? colors.primary : colors.border }]}><View style={styles.stripRow}><View style={[styles.colorStrip, { backgroundColor: strip.color }]} /><View style={styles.stripInfo}><Text style={[styles.stripTitle, { color: colors.foreground }]}>{strip.title}</Text><Text style={[styles.stripPpm, { color: colors.primary }]}>{strip.ppm}</Text><Text style={[styles.stripNote, { color: colors.mutedForeground }]}>{strip.note}</Text></View><ActionButton title="Analyze" icon="search" onPress={() => analyze(strip.id)} variant="secondary" /></View></View>)}
    {result ? <View style={[styles.result, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Feather name="check-circle" size={20} color={colors.primaryForeground} /><View style={styles.resultText}><Text style={[styles.resultTitle, { color: colors.primaryForeground }]}>Reference selected · {result.title}</Text><Text style={[styles.resultCopy, { color: colors.primaryForeground }]}>Demo analysis suggests {result.ppm}. Confirm with certified equipment before acting.</Text></View></View> : <View style={[styles.empty, { borderColor: colors.border }]}><Feather name="eye" size={18} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Select a band to see the passive-analysis response.</Text></View>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  intro: { borderRadius: 20, borderWidth: 1, padding: 18 },
  introIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  introTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  introCopy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  stripCard: { borderRadius: 17, borderWidth: 1, padding: 13, marginBottom: 10 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorStrip: { width: 28, height: 68, borderRadius: 8 },
  stripInfo: { flex: 1 },
  stripTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 3 },
  stripPpm: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 3 },
  stripNote: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  result: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 5 },
  resultText: { flex: 1 },
  resultTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  resultCopy: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  empty: { borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', padding: 22, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});

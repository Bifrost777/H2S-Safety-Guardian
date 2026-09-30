import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen, SectionHeading, SimulatedBadge, TinyBarChart } from '@/components/GuardianUI';
import { exposurePoints } from '@/constants/demoData';
import { useColors } from '@/hooks/useColors';

export default function ExposureScreen() {
  const colors = useColors();
  const values = exposurePoints.map((point) => point.value);
  return <Screen title="Exposure history" eyebrow="ANALYTICS" right={<SimulatedBadge compact />}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>AVERAGE EXPOSURE · TODAY</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>4.1 <Text style={[styles.summaryUnit, { color: colors.mutedForeground }]}>ppm</Text></Text></View><View style={[styles.safePill, { backgroundColor: colors.muted }]}><Feather name="check" size={14} color={colors.primary} /><Text style={[styles.safePillText, { color: colors.primary }]}>WITHIN RANGE</Text></View></View>
    <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}><SectionHeading title="Today · simulated ppm" action="09:00–17:00" /><TinyBarChart values={values} max={12} highlightIndex={3} /><View style={styles.axis}>{exposurePoints.filter((_, index) => index % 2 === 0).map((point) => <Text key={point.label} style={[styles.axisText, { color: colors.mutedForeground }]}>{point.label}</Text>)}</View><View style={[styles.threshold, { borderTopColor: colors.warning }]}><Text style={[styles.thresholdLabel, { color: colors.warning }]}>10 ppm action threshold</Text></View></View>
    <SectionHeading title="Signal notes" />
    {[{ icon: 'activity' as const, title: 'No sustained exposure', body: 'All simulated intervals stayed below the 10 ppm action threshold.' }, { icon: 'trending-up' as const, title: 'Brief peak at 11:00', body: 'A 7 ppm sample was recorded during the mid-shift process check.' }, { icon: 'radio' as const, title: 'Sensor link is simulated', body: 'The trace is generated locally for demonstration and does not represent hardware telemetry.' }].map((item) => <View key={item.title} style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.noteIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon} size={16} color={colors.primary} /></View><View style={styles.noteBody}><Text style={[styles.noteTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.noteCopy, { color: colors.mutedForeground }]}>{item.body}</Text></View></View>)}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  summary: { borderRadius: 20, borderWidth: 1, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  summaryValue: { fontSize: 32, fontFamily: 'Inter_700Bold', marginTop: 7 },
  summaryUnit: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  safePill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  safePillText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 16 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  threshold: { borderTopWidth: 1, marginTop: 16, paddingTop: 8, borderStyle: 'dashed' },
  thresholdLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  note: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 11, marginBottom: 10 },
  noteIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noteBody: { flex: 1 },
  noteTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  noteCopy: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium' },
});

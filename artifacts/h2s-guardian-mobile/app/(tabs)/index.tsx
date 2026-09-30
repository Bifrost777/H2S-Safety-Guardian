import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActionButton, MetricCard, Screen, SectionHeading, SimulatedBadge, TinyBarChart } from '@/components/GuardianUI';
import { exposurePoints } from '@/constants/demoData';
import { useColors } from '@/hooks/useColors';

export default function DashboardScreen() {
  const colors = useColors();
  const [reading, setReading] = useState<number>(4);
  const [warningActive, setWarningActive] = useState(false);
  const sequence = useMemo(() => [4, 5, 3, 4, 6, 4, 5], []);

  useEffect(() => {
    if (warningActive) return;
    let index = 0;
    const timer = setInterval(() => {
      setReading(sequence[index % sequence.length]);
      index += 1;
    }, 4200);
    return () => clearInterval(timer);
  }, [sequence, warningActive]);

  const triggerWarning = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setReading(68);
    setWarningActive(true);
  };

  const clearWarning = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReading(4);
    setWarningActive(false);
  };

  return (
    <Screen title="H2S Guardian" eyebrow="FIELD SAFETY CONSOLE" right={<SimulatedBadge compact />} >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: warningActive ? colors.destructive : colors.card, borderColor: warningActive ? colors.destructive : colors.border }]}>
          <View style={styles.heroTop}><View><Text style={[styles.heroKicker, { color: warningActive ? colors.primaryForeground : colors.primary }]}>CURRENT ATMOSPHERE</Text><Text style={[styles.heroTitle, { color: warningActive ? colors.primaryForeground : colors.foreground }]}>{warningActive ? 'EVACUATE ZONE' : 'Zone 04 is clear'}</Text></View><Feather name={warningActive ? 'alert-triangle' : 'shield'} size={26} color={warningActive ? colors.primaryForeground : colors.primary} /></View>
          <View style={styles.readingRow}><Text style={[styles.reading, { color: warningActive ? colors.primaryForeground : colors.foreground }]}>{reading}</Text><View><Text style={[styles.readingUnit, { color: warningActive ? colors.primaryForeground : colors.mutedForeground }]}>ppm H₂S</Text><Text style={[styles.readingMeta, { color: warningActive ? colors.primaryForeground : colors.mutedForeground }]}>SIMULATED READING</Text></View></View>
          <View style={[styles.statusLine, { borderTopColor: warningActive ? 'rgba(6,17,26,0.24)' : colors.border }]}><View style={[styles.statusDot, { backgroundColor: warningActive ? colors.primaryForeground : colors.primary }]} /><Text style={[styles.statusCopy, { color: warningActive ? colors.primaryForeground : colors.mutedForeground }]}>{warningActive ? 'Demo warning active · response protocol visible' : 'Below 10 ppm action threshold · monitoring normally'}</Text></View>
        </View>

        <View style={styles.metricRow}><MetricCard label="Peak this shift" value={warningActive ? '68' : '7'} unit=" ppm" icon="trending-up" tone={warningActive ? 'warn' : 'safe'} /><MetricCard label="Signal quality" value="98" unit="%" icon="radio" tone="info" /><MetricCard label="Shift elapsed" value="04:18" icon="clock" /></View>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}><SectionHeading title="Live exposure trace" action="Last 60 min" /><TinyBarChart values={exposurePoints.map((point) => warningActive && point.label === '11:00' ? 68 : point.value)} max={warningActive ? 70 : 12} highlightIndex={warningActive ? 3 : 3} /><View style={styles.axis}><Text style={[styles.axisText, { color: colors.mutedForeground }]}>08:00</Text><Text style={[styles.axisText, { color: colors.mutedForeground }]}>12:00</Text><Text style={[styles.axisText, { color: colors.mutedForeground }]}>NOW</Text></View></View>

        <SectionHeading title="Demo controls" />
        {warningActive ? <ActionButton title="Clear demo warning" icon="check-circle" onPress={clearWarning} variant="secondary" /> : <ActionButton title="Trigger demo warning" icon="alert-triangle" onPress={triggerWarning} variant="danger" />}
        <View style={[styles.note, { backgroundColor: colors.overlay, borderColor: colors.border }]}><Feather name="info" size={16} color={colors.info} /><Text style={[styles.noteText, { color: colors.mutedForeground }]}>This is a safe demonstration mode. No physical sensor, alert service, or emergency dispatch is connected.</Text></View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroKicker: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'Inter_700Bold' },
  heroTitle: { fontSize: 21, fontFamily: 'Inter_700Bold', marginTop: 7 },
  readingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 22 },
  reading: { fontSize: 65, lineHeight: 70, letterSpacing: -3, fontFamily: 'Inter_700Bold' },
  readingUnit: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 27 },
  readingMeta: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  statusLine: { borderTopWidth: 1, paddingTop: 13, marginTop: 17, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusCopy: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1 },
  metricRow: { flexDirection: 'row', gap: 9 },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 17 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 },
  axisText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  note: { marginTop: 12, padding: 13, borderWidth: 1, borderRadius: 14, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  noteText: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium', flex: 1 },
});

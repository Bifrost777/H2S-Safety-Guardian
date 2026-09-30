import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function Screen({ children, title, eyebrow, right }: { children: React.ReactNode; title: string; eyebrow?: string; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.topbar}>
        <View style={styles.brandMark}><Feather name="shield" size={16} color={colors.primaryForeground} /></View>
        <View style={styles.titleBlock}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function SimulatedBadge({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return <View style={[styles.simBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}><View style={[styles.dot, { backgroundColor: colors.info }]} /><Text style={[styles.simText, { color: colors.mutedForeground }]}>{compact ? 'SIM' : 'SIMULATED DATA'}</Text></View>;
}

export function SectionHeading({ title, action }: { title: string; action?: string }) {
  const colors = useColors();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{action ? <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text> : null}</View>;
}

export function MetricCard({ label, value, unit, tone = 'neutral', icon }: { label: string; value: string; unit?: string; tone?: 'neutral' | 'safe' | 'warn' | 'info'; icon: keyof typeof Feather.glyphMap }) {
  const colors = useColors();
  const toneColor = tone === 'safe' ? colors.primary : tone === 'warn' ? colors.warning : tone === 'info' ? colors.info : colors.mutedForeground;
  return <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.metricTop}><Feather name={icon} size={16} color={toneColor} /><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text></View><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}<Text style={[styles.metricUnit, { color: colors.mutedForeground }]}>{unit}</Text></Text></View>;
}

export function TinyBarChart({ values, max = 12, highlightIndex }: { values: number[]; max?: number; highlightIndex?: number }) {
  const colors = useColors();
  return <View style={styles.tinyChart}>{values.map((value, index) => <View key={index} style={styles.barSlot}><View style={[styles.bar, { height: Math.max(8, (value / max) * 90), backgroundColor: index === highlightIndex ? colors.warning : colors.primary }]} /></View>)}</View>;
}

export function ActionButton({ title, icon, onPress, variant = 'primary' }: { title: string; icon: keyof typeof Feather.glyphMap; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' }) {
  const colors = useColors();
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.destructive : colors.secondary;
  const foreground = variant === 'primary' || variant === 'danger' ? colors.primaryForeground : colors.foreground;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor, borderColor: variant === 'secondary' ? colors.border : backgroundColor, opacity: pressed ? 0.78 : 1 }]}><Feather name={icon} size={17} color={foreground} /><Text style={[styles.actionText, { color: foreground }]}>{title}</Text></Pressable>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  topbar: { paddingTop: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CBFF38' },
  titleBlock: { flex: 1 },
  eyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 3 },
  title: { fontSize: 25, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  simBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  simText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 11 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  sectionAction: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  metric: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, minHeight: 88 },
  metricTop: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 10 },
  metricLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metricValue: { fontSize: 25, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  metricUnit: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  tinyChart: { height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingTop: 12 },
  barSlot: { flex: 1, height: 96, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', borderRadius: 4, minHeight: 8 },
  action: { borderRadius: 14, borderWidth: 1, minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  actionText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});

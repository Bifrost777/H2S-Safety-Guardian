import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen, SectionHeading, SimulatedBadge } from '@/components/GuardianUI';
import { shiftRecords } from '@/constants/demoData';
import { useColors } from '@/hooks/useColors';

export default function ShiftsScreen() {
  const colors = useColors();
  return <Screen title="Shift records" eyebrow="LOCAL LOGBOOK" right={<SimulatedBadge compact />}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>DEMO LOGBOOK</Text><Text style={[styles.summaryTitle, { color: colors.foreground }]}>4 sample shifts</Text><Text style={[styles.summaryCopy, { color: colors.mutedForeground }]}>Stored locally for your SIH presentation.</Text></View><View style={[styles.summaryIcon, { backgroundColor: colors.primary }]}><Feather name="clipboard" size={19} color={colors.primaryForeground} /></View></View>
    <SectionHeading title="Recent shifts" action="Local only" />
    {shiftRecords.map((shift) => <View key={shift.id} style={[styles.shiftCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.shiftTop}><View><Text style={[styles.shiftId, { color: colors.primary }]}>{shift.id}</Text><Text style={[styles.location, { color: colors.foreground }]}>{shift.location}</Text></View><View style={[styles.status, { backgroundColor: shift.status === 'Clear' ? colors.muted : colors.warning }]}><Feather name={shift.status === 'Clear' ? 'check' : 'eye'} size={12} color={shift.status === 'Clear' ? colors.primary : colors.primaryForeground} /><Text style={[styles.statusText, { color: shift.status === 'Clear' ? colors.primary : colors.primaryForeground }]}>{shift.status.toUpperCase()}</Text></View></View><View style={styles.divider} /><View style={styles.metaRow}><View><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>DATE</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>{shift.date}</Text></View><View><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>DURATION</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>{shift.duration}</Text></View><View><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>PEAK</Text><Text style={[styles.metaValue, { color: shift.peak > 10 ? colors.warning : colors.foreground }]}>{shift.peak} ppm</Text></View></View></View>)}
    <View style={[styles.footerNote, { backgroundColor: colors.overlay, borderColor: colors.border }]}><Feather name="database" size={15} color={colors.info} /><Text style={[styles.footerCopy, { color: colors.mutedForeground }]}>No accounts, network sync, or hardware connections are used in this demo build.</Text></View>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  summary: { borderRadius: 20, borderWidth: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  summaryTitle: { fontSize: 21, fontFamily: 'Inter_700Bold', marginTop: 6 },
  summaryCopy: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shiftCard: { borderRadius: 17, borderWidth: 1, padding: 15, marginBottom: 10 },
  shiftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shiftId: { fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  location: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 5 },
  status: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.7 },
  divider: { height: 1, marginVertical: 13, backgroundColor: '#21465D' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 9, letterSpacing: 0.9, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  metaValue: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  footerNote: { borderRadius: 14, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 7 },
  footerCopy: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', flex: 1 },
});

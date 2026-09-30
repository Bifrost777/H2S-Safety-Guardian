import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActionButton,
  Screen,
  SectionHeading,
  SimulatedBadge,
} from '@/components/GuardianUI';
import {
  CALIBRATION_STATUS,
  type CalibrationEntry,
} from '@/constants/calibration';
import { stripReadings } from '@/constants/demoData';
import {
  deleteAnalysisRecord,
  getAnalysisRecords,
  getCalibrationEntries,
  saveAnalysisRecord,
  type AnalysisRecord,
} from '@/services/analysisStore';
import {
  analyzeBrowserImage,
  analyzeRgb,
  hexToRgb,
  type StripAnalysis,
  type StripRoi,
} from '@/services/stripAnalysis';
import { useColors } from '@/hooks/useColors';

type ImageSelection = {
  uri: string;
  originalUri: string;
  base64?: string;
};

const roiOptions: { id: StripRoi; label: string }[] = [
  { id: 'center', label: 'Center region' },
  { id: 'middle-band', label: 'Middle band' },
  { id: 'full', label: 'Full image' },
];

function imageUriFromAsset(asset: ImagePicker.ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }
  return asset.uri;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnalysisScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<ImageSelection | null>(
    null,
  );
  const [source, setSource] = useState<
    'camera' | 'gallery' | 'sample' | null
  >(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [roi, setRoi] = useState<StripRoi>('center');
  const [analysis, setAnalysis] = useState<StripAnalysis | null>(null);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [calibration, setCalibration] = useState<CalibrationEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextRecords, nextCalibration] = await Promise.all([
      getAnalysisRecords(),
      getCalibrationEntries(),
    ]);
    setRecords(nextRecords);
    setCalibration(nextCalibration);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openPicker = async (mode: 'camera' | 'gallery') => {
    setStatus(null);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      };
      const result =
        mode === 'camera' && Platform.OS !== 'web'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets[0]) {
        setStatus('No image selected. The current analysis was kept.');
        return;
      }

      const asset = result.assets[0];
      setSelectedImage({
        uri: imageUriFromAsset(asset),
        originalUri: asset.uri,
        base64: asset.base64 ?? undefined,
      });
      setSource(mode);
      setSampleId(null);
      setAnalysis(null);
      setStatus(
        mode === 'camera' && Platform.OS === 'web'
          ? 'Web preview fallback: choose an image from your device to stand in for the camera.'
          : 'Image ready. Select a strip region, then run the local analysis.',
      );
    } catch {
      setStatus(
        mode === 'camera'
          ? 'Camera access was unavailable. Use Choose from Gallery or Sample mode instead.'
          : 'The gallery picker was unavailable. Use Sample mode instead.',
      );
    }
  };

  const chooseSample = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImage(null);
    setSource('sample');
    setSampleId(id);
    setAnalysis(null);
    setStatus('Synthetic sample selected. It is not a sensor measurement.');
  };

  const runAnalysis = async () => {
    if (!source) {
      setStatus('Choose a photo or a synthetic sample before analyzing.');
      return;
    }
    setIsAnalyzing(true);
    setStatus(null);

    try {
      const result =
        source === 'sample' && sampleId
          ? analyzeRgb(
              hexToRgb(
                stripReadings.find((strip) => strip.id === sampleId)?.color ??
                  '#D5C98E',
              ),
              'synthetic-sample',
              roi,
              calibration,
            )
          : Platform.OS === 'web' && selectedImage
            ? await analyzeBrowserImage(selectedImage.uri, roi, calibration)
            : null;

      if (!result) {
        setStatus(
          'Photo captured. Native pixel sampling is not reported in this preview. Use Sample mode for a complete demo analysis or run the web preview for browser pixel sampling.',
        );
        return;
      }

      setAnalysis(result);
      const record: AnalysisRecord = {
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        source,
        sourceLabel:
          source === 'sample'
            ? stripReadings.find((strip) => strip.id === sampleId)?.title ??
              'Synthetic sample'
            : source === 'camera'
              ? 'Captured strip photo'
              : 'Gallery strip photo',
        imageUri: source === 'sample' ? undefined : selectedImage?.uri,
        roi,
        analysis: result,
        calibrationStatus: 'experimental',
      };
      await saveAnalysisRecord(record);
      setRecords((current) => [record, ...current].slice(0, 25));
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      setStatus('Analysis saved locally on this device.');
    } catch (error) {
      setAnalysis(null);
      setStatus(
        error instanceof Error
          ? error.message
          : 'The image could not be analyzed. Try another region or sample.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmDelete = (record: AnalysisRecord) => {
    const remove = async () => {
      await deleteAnalysisRecord(record.id);
      setRecords((current) =>
        current.filter((item) => item.id !== record.id),
      );
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete ${record.sourceLabel}?`)) void remove();
      return;
    }
    Alert.alert('Delete analysis?', `Remove ${record.sourceLabel} from local history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const exportReport = async (record: AnalysisRecord) => {
    const report = [
      'H2S Guardian — local strip analysis report',
      `Created: ${new Date(record.createdAt).toISOString()}`,
      `Source: ${record.sourceLabel}`,
      `ROI: ${record.roi}`,
      `RGB: ${record.analysis.rgb.r}, ${record.analysis.rgb.g}, ${record.analysis.rgb.b}`,
      `HSV: ${record.analysis.hsv.h}°, ${record.analysis.hsv.s}%, ${record.analysis.hsv.v}%`,
      `Closest reference: ${record.analysis.classification}`,
      `Relative match: ${record.analysis.relativeMatch ?? 'n/a'}%`,
      CALIBRATION_STATUS,
      'Do not use this prototype report for workplace safety decisions.',
    ].join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
      link.download = 'h2s-guardian-analysis.txt';
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    await Share.share({ title: 'H2S Guardian analysis report', message: report });
  };

  const activeSample = stripReadings.find((strip) => strip.id === sampleId);

  return (
    <Screen
      title="Strip analysis"
      eyebrow="PASSIVE CHECK"
      right={<SimulatedBadge compact />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.intro,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.introIcon, { backgroundColor: colors.primary }]}
          >
            <Feather name="layers" size={20} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>
            Passive strip reader
          </Text>
          <Text style={[styles.introCopy, { color: colors.mutedForeground }]}>
            Capture or upload a strip photo, choose the region of interest, and
            compare its colour locally. No H₂S concentration is invented.
          </Text>
        </View>

        <SectionHeading title="Add a strip image" />
        <View style={styles.actionRow}>
          <View style={styles.actionHalf}>
            <ActionButton
              title="Capture strip photo"
              icon="camera"
              onPress={() => void openPicker('camera')}
              variant="primary"
            />
          </View>
          <View style={styles.actionHalf}>
            <ActionButton
              title="Choose from gallery"
              icon="image"
              onPress={() => void openPicker('gallery')}
              variant="secondary"
            />
          </View>
        </View>

        {selectedImage ? (
          <View
            style={[
              styles.imageCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Image source={{ uri: selectedImage.uri }} style={styles.image} />
            <View style={styles.imageCopy}>
              <Text style={[styles.imageTitle, { color: colors.foreground }]}>
                {source === 'camera' ? 'Captured photo' : 'Gallery photo'}
              </Text>
              <Text
                style={[styles.imageMeta, { color: colors.mutedForeground }]}
              >
                {Platform.OS === 'web'
                  ? 'Browser pixels available for local sampling'
                  : 'Photo selected · analysis needs a native decoder'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedImage(null);
                setSource(null);
                setAnalysis(null);
              }}
              hitSlop={10}
            >
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : null}

        <SectionHeading title="Demo mode" action="SAFE TO REPLAY" />
        <View style={styles.sampleRow}>
          {stripReadings.map((strip) => (
            <Pressable
              key={strip.id}
              onPress={() => void chooseSample(strip.id)}
              style={[
                styles.sampleButton,
                {
                  backgroundColor:
                    sampleId === strip.id ? colors.primary : colors.card,
                  borderColor:
                    sampleId === strip.id ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[styles.sampleSwatch, { backgroundColor: strip.color }]}
              />
              <Text
                style={[
                  styles.sampleText,
                  {
                    color:
                      sampleId === strip.id
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {strip.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.demoNote, { color: colors.mutedForeground }]}>
          Synthetic examples are clearly separated from uploaded or captured
          photos and never represent a live sensor measurement.
        </Text>

        <SectionHeading title="Select strip region" />
        <View
          style={[
            styles.roiGroup,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          {roiOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => {
                setRoi(option.id);
                setAnalysis(null);
              }}
              style={[
                styles.roiOption,
                {
                  backgroundColor:
                    roi === option.id ? colors.card : 'transparent',
                  borderColor:
                    roi === option.id ? colors.border : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.roiText,
                  {
                    color:
                      roi === option.id
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ActionButton
          title={isAnalyzing ? 'Analyzing locally…' : 'Analyze selected region'}
          icon={isAnalyzing ? 'loader' : 'search'}
          onPress={() => void runAnalysis()}
          variant="primary"
        />
        <Pressable
          onPress={() => router.push('/calibration')}
          style={({ pressed }) => [
            styles.calibrationLink,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Feather name="sliders" size={15} color={colors.primary} />
          <Text style={[styles.calibrationText, { color: colors.primary }]}>
            Manage experimental calibration references
          </Text>
        </Pressable>

        {status ? (
          <View
            style={[
              styles.statusBox,
              { backgroundColor: colors.overlay, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={15} color={colors.info} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {status}
            </Text>
          </View>
        ) : null}

        {activeSample ? (
          <View
            style={[
              styles.activeSample,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.activeSampleSwatch,
                { backgroundColor: activeSample.color },
              ]}
            />
            <View style={styles.activeSampleCopy}>
              <Text style={[styles.activeSampleTitle, { color: colors.foreground }]}>
                {activeSample.title}
              </Text>
              <Text
                style={[styles.activeSampleMeta, { color: colors.mutedForeground }]}
              >
                Synthetic example · no hardware reading
              </Text>
            </View>
          </View>
        ) : null}

        {analysis ? (
          <View
            style={[
              styles.result,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleWrap}>
                <Feather
                  name="check-circle"
                  size={19}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[styles.resultTitle, { color: colors.primaryForeground }]}
                >
                  Experimental colour result
                </Text>
              </View>
              <Text style={[styles.resultHex, { color: colors.primaryForeground }]}>
                {analysis.dominantHex}
              </Text>
            </View>
            <Text style={[styles.resultClass, { color: colors.primaryForeground }]}>
              Closest reference: {analysis.classification}
            </Text>
            <Text style={[styles.resultCopy, { color: colors.primaryForeground }]}>
              This is a colour classification, not a scientifically validated
              exposure estimate.
            </Text>
            <View style={styles.valueRow}>
              <View>
                <Text style={[styles.valueLabel, { color: colors.primaryForeground }]}>
                  RGB
                </Text>
                <Text style={[styles.value, { color: colors.primaryForeground }]}>
                  {analysis.rgb.r}, {analysis.rgb.g}, {analysis.rgb.b}
                </Text>
              </View>
              <View>
                <Text style={[styles.valueLabel, { color: colors.primaryForeground }]}>
                  HSV
                </Text>
                <Text style={[styles.value, { color: colors.primaryForeground }]}>
                  {analysis.hsv.h}°, {analysis.hsv.s}%, {analysis.hsv.v}%
                </Text>
              </View>
              <View>
                <Text style={[styles.valueLabel, { color: colors.primaryForeground }]}>
                  MATCH
                </Text>
                <Text style={[styles.value, { color: colors.primaryForeground }]}>
                  {analysis.relativeMatch ?? '—'}%
                </Text>
              </View>
            </View>
            <Text style={[styles.quality, { color: colors.primaryForeground }]}>
              {analysis.quality.notes.join(' ')}
            </Text>
            <Text style={[styles.calibrationStatus, { color: colors.primaryForeground }]}>
              {CALIBRATION_STATUS}
            </Text>
          </View>
        ) : null}

        <SectionHeading title="Saved local analyses" action={`${records.length} RECORDS`} />
        {records.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="archive" size={18} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Run a sample or analyze an image to create the first local record.
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <View
              key={record.id}
              style={[
                styles.record,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.recordTop}>
                <View>
                  <Text style={[styles.recordTitle, { color: colors.foreground }]}>
                    {record.sourceLabel}
                  </Text>
                  <Text style={[styles.recordMeta, { color: colors.mutedForeground }]}>
                    {formatTimestamp(record.createdAt)} · {record.roi}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(record)} hitSlop={10}>
                  <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <Text style={[styles.recordClass, { color: colors.primary }]}>
                {record.analysis.classification}
              </Text>
              <Text style={[styles.recordValues, { color: colors.mutedForeground }]}>
                RGB {record.analysis.rgb.r}/{record.analysis.rgb.g}/{record.analysis.rgb.b}
                {'  '}·{'  '}HSV {record.analysis.hsv.h}°/{record.analysis.hsv.s}%/
                {record.analysis.hsv.v}%
              </Text>
              <Pressable
                onPress={() => void exportReport(record)}
                style={({ pressed }) => [
                  styles.exportButton,
                  { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <Feather name="download" size={13} color={colors.foreground} />
                <Text style={[styles.exportText, { color: colors.foreground }]}>
                  Export report
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  intro: { borderRadius: 20, borderWidth: 1, padding: 18 },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  introCopy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  actionRow: { flexDirection: 'row', gap: 9 },
  actionHalf: { flex: 1 },
  imageCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  image: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#d5c98e' },
  imageCopy: { flex: 1 },
  imageTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  imageMeta: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  sampleRow: { flexDirection: 'row', gap: 8 },
  sampleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  sampleSwatch: { width: 20, height: 20, borderRadius: 7, marginBottom: 8 },
  sampleText: { fontSize: 10, lineHeight: 13, fontFamily: 'Inter_700Bold' },
  demoNote: { fontSize: 10, lineHeight: 15, marginTop: 8, fontFamily: 'Inter_500Medium' },
  roiGroup: { borderWidth: 1, borderRadius: 14, padding: 4, flexDirection: 'row', marginBottom: 13 },
  roiOption: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  roiText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  calibrationLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  calibrationText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  statusBox: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 2 },
  statusText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  activeSample: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  activeSampleSwatch: { width: 32, height: 42, borderRadius: 9 },
  activeSampleCopy: { flex: 1 },
  activeSampleTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  activeSampleMeta: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  result: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 12 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  resultTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  resultHex: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  resultClass: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 14 },
  resultCopy: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', marginTop: 5 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  valueLabel: { fontSize: 9, letterSpacing: 1, fontFamily: 'Inter_700Bold', opacity: 0.7 },
  value: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 4 },
  quality: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 14 },
  calibrationStatus: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.6, marginTop: 12 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, padding: 22, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  record: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 9 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  recordTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  recordMeta: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 4 },
  recordClass: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 13 },
  recordValues: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 5 },
  exportButton: { borderWidth: 1, borderRadius: 10, minHeight: 34, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, marginTop: 12 },
  exportText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
});
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Camera, Check, ChevronRight, ClipboardList, Clock3, Download, FileSearch, Image as ImageIcon, Info, LayoutDashboard, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type Page = 'dashboard' | 'history' | 'shifts' | 'analysis';
const chartData = [0.06, 0.08, 0.07, 0.11, 0.1, 0.14, 0.2, 0.17, 0.23, 0.19, 0.28, 0.24, 0.34, 0.31, 0.27, 0.22, 0.16, 0.18, 0.13, 0.11, 0.1, 0.08, 0.09, 0.07];
const readings = [
  { name: 'Mixing bay 02', ppm: '0.08', time: '14:32:08', tone: 'good' },
  { name: 'Pump gallery', ppm: '0.21', time: '14:32:07', tone: 'good' },
  { name: 'Scrubber outlet', ppm: '0.37', time: '14:32:06', tone: 'amber' },
  { name: 'Tank farm east', ppm: '0.11', time: '14:32:04', tone: 'good' },
];
type Roi = 'full' | 'center' | 'middle-band';
type CalibrationEntry = { id: string; label: string; hex: string; referenceValue: string };
type WebAnalysis = {
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  dominantHex: string;
  roi: Roi;
  brightness: number;
  contrast: number;
  notes: string[];
  closestCalibration: { label: string; referenceValue: string; distance: number } | null;
  relativeMatch: number | null;
  classification: string;
};
type AnalysisRecord = {
  id: string;
  createdAt: string;
  sourceLabel: string;
  roi: Roi;
  analysis: WebAnalysis;
  imageData?: string;
};
const calibrationDefaults: CalibrationEntry[] = [
  { id: 'clear-reference', label: 'Clear reference tone', hex: '#D5C98E', referenceValue: 'Add experimentally measured value later' },
  { id: 'caution-reference', label: 'Caution reference tone', hex: '#B78A52', referenceValue: 'Add experimentally measured value later' },
  { id: 'alert-reference', label: 'Alert reference tone', hex: '#7D4E3A', referenceValue: 'Add experimentally measured value later' },
];
const calibrationStatus = 'Experimental colour analysis — not calibrated';

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255; const green = g / 255; const blue = b / 255;
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h: Math.round(h), s: Math.round((max === 0 ? 0 : delta / max) * 100), v: Math.round(max * 100) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function makeAnalysis(rgb: { r: number; g: number; b: number }, roi: Roi, calibration: CalibrationEntry[], contrast = 28): WebAnalysis {
  const brightness = Math.round(rgb.r * .299 + rgb.g * .587 + rgb.b * .114);
  const notes: string[] = [];
  if (brightness < 35) notes.push('The sampled region is very dark.');
  if (brightness > 235) notes.push('The sampled region is very bright.');
  if (contrast < 8) notes.push('The sampled region has low contrast and may be blurry or blank.');
  if (!notes.length) notes.push('Brightness and contrast are suitable for an experimental colour comparison.');
  const sorted = calibration.map((entry) => {
    const ref = hexToRgb(entry.hex);
    return { entry, distance: Math.sqrt((rgb.r - ref.r) ** 2 + (rgb.g - ref.g) ** 2 + (rgb.b - ref.b) ** 2) };
  }).sort((a, b) => a.distance - b.distance);
  const closest = sorted[0];
  return {
    rgb: { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) },
    hsv: rgbToHsv(rgb),
    dominantHex: rgbToHex(rgb),
    roi,
    brightness,
    contrast: Math.round(contrast),
    notes,
    closestCalibration: closest ? { label: closest.entry.label, referenceValue: closest.entry.referenceValue, distance: Math.round(closest.distance) } : null,
    relativeMatch: closest ? Math.max(0, Math.round((1 - closest.distance / 442) * 100)) : null,
    classification: closest?.entry.label ?? 'No calibration reference available',
  };
}

async function analyzeBrowserFile(dataUrl: string, roi: Roi, calibration: CalibrationEntry[]): Promise<WebAnalysis> {
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The selected image could not be read.')); });
  const canvas = document.createElement('canvas');
  canvas.width = 180; canvas.height = Math.min(180, Math.max(1, Math.round((image.height / image.width) * 180)));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The browser image sampler is unavailable.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const bounds = roi === 'full' ? { left: 0, top: 0, right: canvas.width, bottom: canvas.height } : roi === 'center' ? { left: canvas.width * .2, top: canvas.height * .2, right: canvas.width * .8, bottom: canvas.height * .8 } : { left: canvas.width * .15, top: canvas.height * .38, right: canvas.width * .85, bottom: canvas.height * .62 };
  const data = context.getImageData(Math.floor(bounds.left), Math.floor(bounds.top), Math.max(1, Math.floor(bounds.right - bounds.left)), Math.max(1, Math.floor(bounds.bottom - bounds.top))).data;
  const pixels: { r: number; g: number; b: number }[] = [];
  for (let index = 0; index < data.length; index += 16) if (data[index + 3] > 20) pixels.push({ r: data[index], g: data[index + 1], b: data[index + 2] });
  if (!pixels.length) throw new Error('No usable pixels were found in the selected region.');
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; };
  const rgb = { r: median(pixels.map((pixel) => pixel.r)), g: median(pixels.map((pixel) => pixel.g)), b: median(pixels.map((pixel) => pixel.b)) };
  const brightnesses = pixels.map((pixel) => pixel.r * .299 + pixel.g * .587 + pixel.b * .114);
  const mean = brightnesses.reduce((sum, value) => sum + value, 0) / brightnesses.length;
  const contrast = Math.sqrt(brightnesses.reduce((sum, value) => sum + (value - mean) ** 2, 0) / brightnesses.length);
  return makeAnalysis(rgb, roi, calibration, contrast);
}
const navItems = [
  { href: '/', label: 'Live dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'Exposure history', icon: BarChart3 },
  { href: '/shifts', label: 'Shift records', icon: ClipboardList },
  { href: '/analysis', label: 'Strip analysis', icon: FileSearch },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const current = location === '/' ? 'dashboard' : location.slice(1);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">H₂S</div><div className="brand-name">H2S Guardian<small>SAFETY CONTROL ROOM</small></div></div>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${current === (href === '/' ? 'dashboard' : href.slice(1)) ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon /><span>{label}</span></Link>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sim-badge"><strong>DEMO ENVIRONMENT</strong>All readings are deterministic simulated data. No hardware is connected.</div>
        <div className="sidebar-footer">SIH 2026 / CONTROL SET 04</div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="crumb"><b>North Process Unit</b> <span>/</span> Simulated shift</div>
          <div className="top-right"><div className="clock">14 JUN 2026 · 14:32:08</div><div className="operator"><div className="avatar">SL</div><span>Safety lead</span></div></div>
        </header>
        <main>{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={current === (href === '/' ? 'dashboard' : href.slice(1)) ? 'active' : ''} data-testid={`mobile-link-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon /><span>{label.replace('Live ', '')}</span></Link>)}</nav>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{description}</p></div>{action || <div className="sample-chip"><span className="pulse-dot" /> SIMULATION STABLE</div>}</div>;
}

function MetricCard({ label, value, unit, foot, primary, children }: { label: string; value: string; unit: string; foot: string; primary?: boolean; children?: ReactNode }) {
  return <div className={`card metric-card ${primary ? 'primary' : ''}`}><div className="metric-label">{label}</div><div className="metric-value">{value}<span className="metric-unit">{unit}</span></div><div className="metric-foot">{children || foot}</div>{primary && <div className="metric-accent" />}</div>;
}

function ExposureChart({ compact = false }: { compact?: boolean }) {
  const width = 720; const height = compact ? 205 : 260; const pad = { l: 37, r: 14, t: 17, b: 29 };
  const points = chartData.map((v, i) => `${pad.l + i * ((width - pad.l - pad.r) / (chartData.length - 1))},${pad.t + (0.5 - v) * (height - pad.t - pad.b)}`).join(' ');
  const area = `${pad.l},${height - pad.b} ${points} ${width - pad.r},${height - pad.b}`;
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" role="img" aria-label="Simulated H2S exposure over the last 24 hours"><defs><linearGradient id={compact ? 'areaFillCompact' : 'areaFill'} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#df8d26" stopOpacity=".22" /><stop offset="100%" stopColor="#df8d26" stopOpacity="0" /></linearGradient></defs>{[0, .1, .2, .3, .4].map((v) => <g key={v}><line className="chart-gridline" x1={pad.l} x2={width - pad.r} y1={pad.t + (0.5 - v) * (height - pad.t - pad.b)} y2={pad.t + (0.5 - v) * (height - pad.t - pad.b)} /><text className="chart-label" x="0" y={pad.t + (0.5 - v) * (height - pad.t - pad.b) + 3}>{v.toFixed(1)}</text></g>)}<line className="chart-threshold" x1={pad.l} x2={width - pad.r} y1={pad.t + (.5 - .3) * (height - pad.t - pad.b)} y2={pad.t + (.5 - .3) * (height - pad.t - pad.b)} /><text className="threshold-label" x={width - 55} y={pad.t + (.5 - .3) * (height - pad.t - pad.b) - 5}>WATCH 0.30</text><polygon className="chart-area" points={area} style={{ fill: `url(#${compact ? 'areaFillCompact' : 'areaFill'})` }} /><polyline className="chart-line" points={points} />{chartData.filter((_, i) => i % 4 === 0).map((v, i) => { const x = pad.l + i * 4 * ((width - pad.l - pad.r) / (chartData.length - 1)); const y = pad.t + (.5 - v) * (height - pad.t - pad.b); return <circle key={i} className="chart-point" cx={x} cy={y} r="3.3" />; })}<text className="chart-label" x={pad.l} y={height - 7}>15:00</text><text className="chart-label" x={width / 2 - 20} y={height - 7}>03:00</text><text className="chart-label" x={width - 47} y={height - 7}>14:00</text></svg></div>;
}

function Dashboard() {
  const [warning, setWarning] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  return <div className="content">
    <PageHeader eyebrow="Live overview / Shift 04" title="A calm read on the room." description="A single view of simulated hydrogen sulfide signals across the North Process Unit." action={<div className="sample-chip"><span className="pulse-dot" /> SIMULATED · UPDATED 14:32:08</div>} />
    {warning && <div className="warning-banner" data-testid="status-warning"><div><div className="warning-title">DEMO WARNING · SCRUBBER OUTLET</div><p>Simulated reading reached 0.42 ppm. Review the signal before continuing the shift.</p></div><button onClick={() => setWarning(false)} data-testid="button-dismiss-warning"><X size={14} /> Dismiss</button></div>}
    <div className="grid metrics">
      <MetricCard label="Current H₂S reading" value={warning ? '0.42' : '0.21'} unit="ppm" foot="Highest simulated zone · pump gallery" primary><span className="status-line"><span className="pulse-dot" /> BELOW WATCH LEVEL</span></MetricCard>
      <MetricCard label="Monitored zones" value="04" unit="zones" foot="All zones reporting · simulated" />
      <MetricCard label="Shift elapsed" value="06:32" unit="hrs" foot="Shift 04 · 08:00 — 16:00" />
    </div>
    <div className="grid dashboard-grid">
      <section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Exposure signal · last 24 hours</h2><p className="panel-kicker">Unit average · ppm H₂S · deterministic demo trace</p></div><Link href="/history" className="outline-button" data-testid="link-open-history">View history <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div><ExposureChart compact /></section>
      <section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Zone readings</h2><p className="panel-kicker">Most recent sample by location</p></div><Activity size={16} color="#72928a" /></div><div className="reading-list">{readings.map((reading) => <div className="reading-row" key={reading.name}><div className="reading-room"><span className={`room-dot ${reading.tone === 'amber' ? 'amber' : ''}`} />{reading.name}</div><div><span className="reading-number">{warning && reading.name === 'Scrubber outlet' ? '0.42' : reading.ppm}</span> <small>ppm</small></div></div>)}</div><div className="source-note"><Info size={14} /> Simulation values are intentionally bounded and labeled. This control room is not connected to field instruments.</div></section>
    </div>
    <section className="card panel section-spacer"><div className="panel-head"><div><h2 className="panel-title">Demo controls</h2><p className="panel-kicker">Use these interactions to demonstrate a response workflow.</p></div><SlidersHorizontal size={16} color="#72928a" /></div><div className="action-row"><button className="solid-button" onClick={() => setWarning(true)} data-testid="button-trigger-warning"><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Trigger demo warning</button><button className="outline-button" onClick={() => { setWarning(false); setResetCount((count) => count + 1); }} data-testid="button-reset-simulation"><RotateCcw size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Reset simulation {resetCount > 0 ? `(${resetCount})` : ''}</button></div></section>
  </div>;
}

function History() {
  const [range, setRange] = useState('24 hours');
  return <div className="content"><PageHeader eyebrow="Signal archive / Unit average" title="Exposure history." description="Read the shape of the simulated shift before you make a decision. Peaks are surfaced against the watch level." action={<div className="sample-chip"><Clock3 size={13} /> 24 HOUR WINDOW</div>} /><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Unit average H₂S trace</h2><p className="panel-kicker">Samples are replayed from a fixed demo sequence</p></div><div style={{ display: 'flex', gap: 5 }}>{['8 hours', '24 hours', '7 days'].map((item) => <button key={item} className={range === item ? 'solid-button' : 'outline-button'} onClick={() => setRange(item)} data-testid={`button-range-${item.replace(' ', '-')}`}>{item}</button>)}</div></div><ExposureChart /></section><div className="grid dashboard-grid section-spacer"><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Signal notes</h2><p className="panel-kicker">What this trace says at a glance</p></div></div><div className="reading-list"><div className="reading-row"><div className="reading-room"><span className="room-dot" />Baseline</div><strong className="reading-number">0.07 <small>ppm</small></strong></div><div className="reading-row"><div className="reading-room"><span className="room-dot amber" />Peak</div><strong className="reading-number">0.34 <small>ppm</small></strong></div><div className="reading-row"><div className="reading-room"><span className="room-dot" />Latest</div><strong className="reading-number">0.21 <small>ppm</small></strong></div></div></section><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Reading context</h2><p className="panel-kicker">Boundaries used in this demo</p></div><ShieldCheck size={16} color="#4b9a76" /></div><div className="source-note" style={{ marginTop: 0 }}><Info size={14} /> Watch level is represented at 0.30 ppm for this demo. It is a visual training boundary, not a field safety standard.</div></section></div></div>;
}

function Shifts() {
  const shifts = useMemo(() => [{ id: '04', date: '14 Jun 2026', lead: 'S. Lal', duration: '08:00 – 16:00', status: 'In progress' }, { id: '03', date: '13 Jun 2026', lead: 'M. Rao', duration: '16:00 – 00:00', status: 'Complete' }, { id: '02', date: '13 Jun 2026', lead: 'S. Lal', duration: '08:00 – 16:00', status: 'Complete' }, { id: '01', date: '12 Jun 2026', lead: 'A. Menon', duration: '00:00 – 08:00', status: 'Review' }], []);
  return <div className="content"><PageHeader eyebrow="Record book / Deterministic sample" title="Shift records." description="A compact handoff trail for the simulated unit. Every entry is local demo data, ready to show how a shift might be reviewed." action={<div className="sample-chip"><ClipboardList size={13} /> 04 SAMPLE RECORDS</div>} /><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Recent shifts</h2><p className="panel-kicker">North Process Unit · June 2026</p></div><button className="solid-button" onClick={() => window.alert('New shift records are intentionally outside this local demo.')} data-testid="button-new-shift">New shift record</button></div><div className="table-wrap"><table><thead><tr><th>Shift</th><th>Date</th><th>Safety lead</th><th>Window</th><th>State</th><th /></tr></thead><tbody>{shifts.map((shift) => <tr key={shift.id}><td>Shift {shift.id}</td><td>{shift.date}</td><td>{shift.lead}</td><td>{shift.duration}</td><td><span className={`table-status ${shift.status === 'Review' ? 'review' : ''}`}>{shift.status}</span></td><td><button className="outline-button" onClick={() => window.alert(`Shift ${shift.id} is a local sample record.`)} data-testid={`button-view-shift-${shift.id}`}>View</button></td></tr>)}</tbody></table></div></section><section className="card panel section-spacer"><div className="empty-box">No additional shift notes attached to this demo set.<br /><span style={{ fontSize: 10 }}>The intentional empty state keeps the handoff surface honest.</span></div></section></div>;
}

function Analysis() {
  const [selectedSample, setSelectedSample] = useState('strip-b');
  const [source, setSource] = useState<'camera' | 'gallery' | 'sample' | null>('sample');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [roi, setRoi] = useState<Roi>('center');
  const [calibration, setCalibration] = useState<CalibrationEntry[]>(calibrationDefaults);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [result, setResult] = useState<WebAnalysis | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const samples = [
    { id: 'strip-a', label: 'Sample A · gatehouse', time: '13:12', hex: '#D5C98E' },
    { id: 'strip-b', label: 'Sample B · scrubber', time: '13:48', hex: '#B78A52' },
    { id: 'strip-c', label: 'Sample C · tank farm', time: '14:04', hex: '#7D4E3A' },
  ];

  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('h2s-guardian-analysis-records-v1');
      const savedCalibration = localStorage.getItem('h2s-guardian-calibration-v1');
      if (savedRecords) setRecords(JSON.parse(savedRecords) as AnalysisRecord[]);
      if (savedCalibration) setCalibration(JSON.parse(savedCalibration) as CalibrationEntry[]);
    } catch {
      setStatus('Local analysis history could not be loaded; new records still work for this session.');
    }
  }, []);

  const persistRecords = (next: AnalysisRecord[]) => {
    setRecords(next);
    localStorage.setItem('h2s-guardian-analysis-records-v1', JSON.stringify(next.slice(0, 25)));
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>, nextSource: 'camera' | 'gallery') => {
    const file = event.target.files?.[0];
    if (!file) {
      setStatus('No image selected. The current analysis was kept.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result));
      setImageName(file.name);
      setSource(nextSource);
      setResult(null);
      setStatus('Image ready. Select a region, then run local colour analysis.');
    };
    reader.onerror = () => setStatus('The selected image could not be read.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const chooseSample = (sample: (typeof samples)[number]) => {
    setSelectedSample(sample.id);
    setSource('sample');
    setImageData(null);
    setImageName('');
    setResult(null);
    setStatus('Synthetic sample selected. It is not a sensor measurement.');
  };

  const runAnalysis = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const sample = samples.find((item) => item.id === selectedSample) ?? samples[0];
      const nextResult = source === 'sample' ? makeAnalysis(hexToRgb(sample.hex), roi, calibration) : imageData ? await analyzeBrowserFile(imageData, roi, calibration) : null;
      if (!nextResult) {
        setStatus('Choose a photo or synthetic sample before analyzing.');
        return;
      }
      setResult(nextResult);
      const record: AnalysisRecord = {
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        sourceLabel: source === 'sample' ? sample.label : imageName || 'Uploaded strip photo',
        roi,
        analysis: nextResult,
        imageData: source === 'sample' ? undefined : imageData ?? undefined,
      };
      persistRecords([record, ...records]);
      setStatus('Analysis saved locally in this browser.');
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : 'The image could not be analyzed.');
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = (record: AnalysisRecord) => {
    if (!window.confirm(`Delete ${record.sourceLabel}?`)) return;
    persistRecords(records.filter((item) => item.id !== record.id));
  };

  const exportRecord = (record: AnalysisRecord) => {
    const report = [
      'H2S Guardian — local strip analysis report',
      `Created: ${new Date(record.createdAt).toISOString()}`,
      `Source: ${record.sourceLabel}`,
      `ROI: ${record.roi}`,
      `RGB: ${record.analysis.rgb.r}, ${record.analysis.rgb.g}, ${record.analysis.rgb.b}`,
      `HSV: ${record.analysis.hsv.h}°, ${record.analysis.hsv.s}%, ${record.analysis.hsv.v}%`,
      `Closest reference: ${record.analysis.classification}`,
      `Relative match: ${record.analysis.relativeMatch ?? 'n/a'}%`,
      calibrationStatus,
      'Do not use this prototype report for workplace safety decisions.',
    ].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    link.download = 'h2s-guardian-analysis.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="content">
    <PageHeader eyebrow="Passive check / Local pixel reader" title="Strip analysis." description="Capture or upload a strip photo, select its region of interest, and compare colour locally. This screen never turns colour into a workplace exposure estimate." action={<div className="sample-chip"><FileSearch size={13} /> EXPERIMENTAL · NOT CALIBRATED</div>} />
    <div className="strip-layout">
      <section className="card panel">
        <div className="panel-head"><div><h2 className="panel-title">Add a strip image</h2><p className="panel-kicker">Camera access is requested only after you press the button.</p></div></div>
        <input ref={cameraInputRef} className="visually-hidden-input" type="file" accept="image/*" capture="environment" onChange={(event) => handleFile(event, 'camera')} />
        <input ref={galleryInputRef} className="visually-hidden-input" type="file" accept="image/*" onChange={(event) => handleFile(event, 'gallery')} />
        <div className="capture-actions">
          <button className="solid-button" onClick={() => cameraInputRef.current?.click()} data-testid="button-capture-strip-photo"><Camera size={13} /> Capture strip photo</button>
          <button className="outline-button" onClick={() => galleryInputRef.current?.click()} data-testid="button-choose-gallery"><Upload size={13} /> Choose from gallery</button>
        </div>
        {imageData ? <div className="selected-photo"><img src={imageData} alt="Selected strip preview" /><div><strong>{source === 'camera' ? 'Captured strip photo' : 'Gallery strip photo'}</strong><span>{imageName || 'Selected image'} · browser pixel sampling available</span></div><button className="icon-button" onClick={() => { setImageData(null); setResult(null); setSource(null); }} aria-label="Remove selected image"><X size={15} /></button></div> : <div className="drop-zone" onClick={() => galleryInputRef.current?.click()} role="button" tabIndex={0} data-testid="dropzone-strip"><div><div className="strip-illustration"><div className="strip-paper" /><div className="strip-band" /><div className="strip-cap" /></div><h3>Passive strip reader</h3><p>Web preview uses an image-upload fallback when a camera is unavailable.<br />Nothing is sent to a server.</p></div></div>}
        <div className="analysis-subhead"><h3>Demo mode</h3><span>SAFE TO REPLAY</span></div>
        <div className="sample-options">{samples.map((sample) => <button key={sample.id} className={`sample-option ${selectedSample === sample.id && source === 'sample' ? 'selected' : ''}`} onClick={() => chooseSample(sample)} data-testid={`button-${sample.id}`}><span><span className="sample-color" style={{ background: sample.hex }} />{sample.label}</span><span className="sample-meta">{sample.time}</span></button>)}</div>
        <p className="small-disclaimer">Synthetic examples are separated from uploaded photos and never represent live sensor data.</p>
      </section>
      <section className="card panel">
        <div className="panel-head"><div><h2 className="panel-title">Local colour analysis</h2><p className="panel-kicker">Median RGB sampling across the selected region</p></div><Search size={17} color="#72928a" /></div>
        <div className="roi-controls"><strong>Region of interest</strong>{(['center', 'middle-band', 'full'] as Roi[]).map((option) => <button key={option} className={roi === option ? 'solid-button' : 'outline-button'} onClick={() => { setRoi(option); setResult(null); }} data-testid={`button-roi-${option}`}>{option === 'middle-band' ? 'Middle band' : option === 'center' ? 'Center region' : 'Full image'}</button>)}</div>
        <button className="solid-button analysis-run-button" onClick={() => void runAnalysis()} disabled={busy} data-testid="button-run-analysis"><Search size={13} /> {busy ? 'Analyzing locally…' : 'Analyze selected region'}</button>
        <Link href="/calibration" className="calibration-link" data-testid="link-calibration"><SlidersHorizontal size={14} /> Manage experimental calibration references <ChevronRight size={12} /></Link>
        {status ? <div className="analysis-status"><Info size={14} />{status}</div> : null}
        {result ? <div className="analysis-result" data-testid="status-analysis-confirmed"><div className="result-head"><div><h3>Experimental colour result</h3><p>Closest reference · {result.classification}</p></div><strong>{result.dominantHex}</strong></div><div className="analysis-values"><div><span>RGB</span><b>{result.rgb.r}, {result.rgb.g}, {result.rgb.b}</b></div><div><span>HSV</span><b>{result.hsv.h}°, {result.hsv.s}%, {result.hsv.v}%</b></div><div><span>RELATIVE MATCH</span><b>{result.relativeMatch ?? '—'}%</b></div></div><p className="result-copy">This is a colour classification, not a scientifically validated exposure estimate. {result.notes.join(' ')}</p><div className="source-note"><Info size={14} /> {calibrationStatus}. No H₂S concentration or cumulative dose is inferred.</div></div> : <div className="empty-box"><FileSearch size={22} style={{ marginBottom: 10, color: '#879c91' }} /><br />Choose a photo or sample, then run analysis.</div>}
      </section>
    </div>
    <section className="card panel section-spacer"><div className="panel-head"><div><h2 className="panel-title">Saved local analyses</h2><p className="panel-kicker">Metadata and optional image data stay in this browser only.</p></div><span className="sample-meta">{records.length} records</span></div>{records.length ? <div className="analysis-history">{records.map((record) => <div className="history-card" key={record.id}><div className="history-card-main"><strong>{record.sourceLabel}</strong><span>{new Date(record.createdAt).toLocaleString()} · {record.roi}</span><b>{record.analysis.classification}</b><small>RGB {record.analysis.rgb.r}/{record.analysis.rgb.g}/{record.analysis.rgb.b} · HSV {record.analysis.hsv.h}°/{record.analysis.hsv.s}%/{record.analysis.hsv.v}%</small></div><div className="history-actions"><button className="outline-button" onClick={() => exportRecord(record)}><Download size={12} /> Export report</button><button className="icon-button" onClick={() => deleteRecord(record)} aria-label={`Delete ${record.sourceLabel}`}><Trash2 size={14} /></button></div></div>)}</div> : <div className="empty-box">Run a sample or analyze an image to create the first local record.</div>}</section>
  </div>;
}

function Calibration() {
  const [entries, setEntries] = useState<CalibrationEntry[]>(calibrationDefaults);
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#');
  const [referenceValue, setReferenceValue] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('h2s-guardian-calibration-v1');
    if (saved) {
      try { setEntries(JSON.parse(saved) as CalibrationEntry[]); } catch { /* keep defaults */ }
    }
  }, []);

  const persist = (next: CalibrationEntry[]) => {
    setEntries(next);
    localStorage.setItem('h2s-guardian-calibration-v1', JSON.stringify(next));
  };

  const add = () => {
    if (!label.trim() || !/^#[0-9a-f]{6}$/i.test(hex.trim())) return;
    persist([...entries, { id: `reference-${Date.now()}`, label: label.trim(), hex: hex.trim().toUpperCase(), referenceValue: referenceValue.trim() || 'Add experimentally measured value later' }]);
    setLabel(''); setHex('#'); setReferenceValue('');
  };

  return <div className="content"><PageHeader eyebrow="Reference table / Local only" title="Calibration references." description="Store known strip colours now and add experimentally measured values later. This table does not claim a validated H₂S conversion." action={<Link href="/analysis" className="outline-button"><X size={12} /> Back to analysis</Link>} /><section className="card panel calibration-panel"><div className="source-note"><Info size={14} /> {calibrationStatus}. Colour matching is a visual classification only and cannot be used for workplace safety decisions.</div><h2 className="panel-title">Known strip references</h2><div className="calibration-list">{entries.map((entry) => <div className="calibration-entry" key={entry.id}><span className="calibration-swatch" style={{ background: entry.hex }} /><div><strong>{entry.label}</strong><span>{entry.hex} · {entry.referenceValue}</span></div><button className="icon-button" onClick={() => persist(entries.filter((item) => item.id !== entry.id))} aria-label={`Delete ${entry.label}`}><Trash2 size={14} /></button></div>)}</div><h2 className="panel-title calibration-add-title">Add a reference for later</h2><div className="calibration-form"><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Reference label" /><input value={hex} onChange={(event) => setHex(event.target.value)} placeholder="#D5C98E" /><input value={referenceValue} onChange={(event) => setReferenceValue(event.target.value)} placeholder="Experimentally measured value (optional)" /><button className="solid-button" onClick={add}><Check size={13} /> Save local reference</button></div></section></div>;
}

function Router() {
  const [location] = useLocation();
  return <Shell><ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/history" component={History} /><Route path="/shifts" component={Shifts} /><Route path="/analysis" component={Analysis} /><Route path="/calibration" component={Calibration} /><Route component={NotFound} /></Switch></ErrorBoundary></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
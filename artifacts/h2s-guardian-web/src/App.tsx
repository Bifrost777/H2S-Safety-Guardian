import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Check, ChevronRight, ClipboardList, Clock3, FileSearch, Info, LayoutDashboard, Menu, RotateCcw, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { type ReactNode } from 'react';
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
  const [selected, setSelected] = useState('strip-b');
  const [analysed, setAnalysed] = useState(false);
  const samples = [{ id: 'strip-a', label: 'Sample A · gatehouse', time: '13:12', result: 'clear' }, { id: 'strip-b', label: 'Sample B · scrubber', time: '13:48', result: '0.18 ppm' }, { id: 'strip-c', label: 'Sample C · tank farm', time: '14:04', result: '0.09 ppm' }];
  return <div className="content"><PageHeader eyebrow="Passive check / Visual reader" title="Strip analysis." description="Select a simulated passive color-strip sample to demonstrate a measured handoff. This screen never claims to read a physical strip." action={<div className="sample-chip"><FileSearch size={13} /> PASSIVE METHOD</div>} /><div className="strip-layout"><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Choose a demo sample</h2><p className="panel-kicker">Three deterministic records are available.</p></div></div><div className="drop-zone" onClick={() => setAnalysed(false)} role="button" tabIndex={0} data-testid="dropzone-strip"><div><div className="strip-illustration"><div className="strip-paper" /><div className="strip-band" /><div className="strip-cap" /></div><h3>Passive strip reader</h3><p>Use a sample below to run the local analysis flow.<br />No upload or camera access is used.</p></div></div><div className="sample-options">{samples.map((sample) => <div key={sample.id} className={`sample-option ${selected === sample.id ? 'selected' : ''}`} onClick={() => { setSelected(sample.id); setAnalysed(false); }} data-testid={`button-${sample.id}`}><span>{sample.label}</span><span className="sample-meta">{sample.time}</span></div>)}</div></section><section className="card panel"><div className="panel-head"><div><h2 className="panel-title">Analysis confirmation</h2><p className="panel-kicker">Review the reading before recording it.</p></div><Check size={17} color={analysed ? '#4b9a76' : '#a3ada5'} /></div>{analysed ? <div className="analysis-result" data-testid="status-analysis-confirmed"><h3>Analysis complete · {samples.find((sample) => sample.id === selected)?.label}</h3><p>The sample was matched to the fixed demo reference. This confirmation is simulated and not a field measurement.</p><div className="result-measure">{samples.find((sample) => sample.id === selected)?.result} <span className="metric-unit">H₂S</span></div><button className="outline-button" onClick={() => setAnalysed(false)} data-testid="button-analyse-another">Analyse another sample</button></div> : <div className="empty-box"><FileSearch size={22} style={{ marginBottom: 10, color: '#879c91' }} /><br />Select a sample, then run analysis.<div className="action-row" style={{ justifyContent: 'center' }}><button className="solid-button" onClick={() => setAnalysed(true)} data-testid="button-run-analysis">Run demo analysis <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></button></div></div>}<div className="source-note"><Info size={14} /> Passive color-strip analysis is a demonstration flow only. It does not connect to a camera, sensor, or laboratory result.</div></section></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <Shell><ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/history" component={History} /><Route path="/shifts" component={Shifts} /><Route path="/analysis" component={Analysis} /><Route component={NotFound} /></Switch></ErrorBoundary></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
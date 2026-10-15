'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, ChevronDown, CircleHelp, Layers3, ListMusic, LoaderCircle, Minus, Music2, Pause, Play, Plus, RotateCcw, Search, Shuffle, SlidersHorizontal, Sparkles, Volume2, X } from 'lucide-react';

type Chord = { name: string; annotation: string; note: string; emphasized: boolean };
type Exercise = { id: string; title: string; category: string; guidance: string; chords: Chord[] };
type Card = { exercise: Exercise; chords: Chord[]; bpm: number; fretStart: number; fretEnd: number };
type Settings = { bpm: number; fretMode: string };
const STORAGE_KEY = 'guitar-practice-settings-v1';
const DEFAULT_SETTINGS: Settings = { bpm: 100, fretMode: 'random' };

function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      bpm: Number.isInteger(saved?.bpm) && saved.bpm >= 20 && saved.bpm <= 300 ? saved.bpm : 100,
      fretMode: saved?.fretMode === 'random' || /^[1-8]$/.test(saved?.fretMode) ? saved.fretMode : 'random',
    };
  } catch { return DEFAULT_SETTINGS; }
}

async function requestDeck(settings: Settings, shuffle: boolean, signal?: AbortSignal): Promise<Card[]> {
  const response = await fetch('/api/decks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ bpm: settings.bpm, fretStart: settings.fretMode === 'random' ? null : Number(settings.fretMode), shuffle }),
  });
  if (!response.ok) throw new Error('The practice deck couldn’t load. Check that the Spring Boot server is running, then try again.');
  return response.json();
}

function Fretboard({ start, end }: { start: number; end: number }) {
  const left = 27;
  const width = 39;
  return <svg className="fretboard" viewBox="0 0 515 150" role="img" aria-label={`Guitar fretboard. Frets ${start} through ${end} highlighted.`}>
    <rect x={left} y="28" width={12 * width} height="83" rx="4" fill="#f4f1e9" />
    <rect x={left + (start - 1) * width} y="28" width={width * 5} height="83" fill="#e3e7d7" />
    {Array.from({ length: 13 }, (_, i) => <line key={`f${i}`} x1={left + i * width} x2={left + i * width} y1="28" y2="111" stroke={i === 0 ? '#8a8c78' : '#c2bfaf'} strokeWidth={i === 0 ? 4 : 1.5} />)}
    {[3, 5, 7, 9, 12].map(fret => <g key={fret}>{(fret === 12 ? [53, 85] : [69]).map(y => <circle key={y} cx={left + (fret - 0.5) * width} cy={y} r="4" fill={fret >= start && fret <= end ? '#8c9879' : '#d4d0c4'} />)}</g>)}
    {Array.from({ length: 6 }, (_, i) => <line key={`s${i}`} x1={left} x2={left + 12 * width} y1={30 + i * 16} y2={30 + i * 16} stroke="#a8a592" strokeWidth={0.6 + i * 0.24} />)}
    {Array.from({ length: 12 }, (_, i) => <text key={`n${i}`} x={left + (i + 0.5) * width} y="135" textAnchor="middle" fill={i + 1 >= start && i + 1 <= end ? '#4d573b' : '#9a998d'} fontSize="11" fontWeight={i + 1 >= start && i + 1 <= end ? '700' : '400'}>{i + 1}</text>)}
    <path d={`M${left + (start - 1) * width + 5} 19v-4h${width * 5 - 10}v4`} stroke="#6d7b52" strokeWidth="1.5" fill="none" />
  </svg>;
}

function useMetronome(bpm: number) {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [audioError, setAudioError] = useState('');
  const context = useRef<AudioContext | null>(null);
  const sounds = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    if (!running || !context.current) return;
    const audio = context.current;
    let nextTime = audio.currentTime + 0.05;
    let count = 0;
    const updates = new Set<ReturnType<typeof setTimeout>>();
    function schedule() {
      while (nextTime < audio.currentTime + 0.1) {
        const tick = count % 4;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = tick === 0 ? 1200 : 850;
        gain.gain.setValueAtTime(0, nextTime);
        gain.gain.linearRampToValueAtTime(0.22, nextTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, nextTime + 0.045);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(nextTime);
        oscillator.stop(nextTime + 0.05);
        sounds.current.push(oscillator);
        oscillator.onended = () => {
          oscillator.disconnect(); gain.disconnect();
          sounds.current = sounds.current.filter(sound => sound !== oscillator);
        };
        const update = setTimeout(() => { setBeat(tick); updates.delete(update); }, Math.max(0, (nextTime - audio.currentTime) * 1000));
        updates.add(update);
        nextTime += 60 / bpm;
        count += 1;
      }
    }
    schedule();
    const timer = setInterval(schedule, 25);
    return () => {
      clearInterval(timer);
      updates.forEach(clearTimeout);
      sounds.current.forEach(sound => { try { sound.stop(); } catch { /* Already stopped. */ } });
      sounds.current = [];
    };
  }, [running, bpm]);

  useEffect(() => () => { void context.current?.close(); }, []);

  async function toggle() {
    if (running) { setRunning(false); setBeat(-1); return; }
    try {
      if (!context.current || context.current.state === 'closed') context.current = new AudioContext();
      await context.current.resume();
      setAudioError('');
      setRunning(true);
    } catch { setAudioError('Audio is unavailable in this browser. Try another browser to hear the metronome.'); }
  }
  return { running, beat, toggle, audioError };
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tempoText, setTempoText] = useState('100');
  const [view, setView] = useState<'practice' | 'library'>('practice');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [activeChord, setActiveChord] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const metronome = useMetronome(settings.bpm);
  const card = cards[index];

  useEffect(() => {
    const saved = readSettings();
    setSettings(saved); setTempoText(String(saved.bpm));
    const controller = new AbortController();
    requestDeck(saved, false, controller.signal)
      .then(deck => { setCards(deck); setLoading(false); })
      .catch(reason => { if (reason.name !== 'AbortError') { setError(reason.message); setLoading(false); } });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading && cards.length) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Practice still works without storage. */ }
    }
  }, [settings, loading, cards.length]);
  useEffect(() => { setActiveChord(0); }, [index, cards]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const navigate = useCallback((direction: number) => {
    setIndex(value => cards.length ? (value + direction + cards.length) % cards.length : 0);
  }, [cards.length]);

  async function shuffleDeck() {
    setLoading(true); setError('');
    try {
      const deck = await requestDeck(settings, true);
      setCards(deck); setIndex(0); setView('practice');
      setNotice('Fresh deck. Fresh perspective.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not shuffle the deck.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest('input, select, textarea, button') || event.target.isContentEditable)) return;
      if (dialog.current?.open || loading || view !== 'practice') return;
      if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [navigate, loading, view]);

  function changeTempo(value: number) {
    const bpm = Math.min(300, Math.max(20, Math.round(value)));
    setSettings(previous => ({ ...previous, bpm }));
    setTempoText(String(bpm));
    setCards(previous => previous.map(item => ({ ...item, bpm })));
  }

  function commitTempo() {
    if (tempoText.trim() && Number.isFinite(Number(tempoText))) changeTempo(Number(tempoText));
    else setTempoText(String(settings.bpm));
  }

  function changeRange(mode: string) {
    setSettings(previous => ({ ...previous, fretMode: mode }));
    setCards(previous => previous.map(item => {
      const fretStart = mode === 'random' ? Math.floor(Math.random() * 8) + 1 : Number(mode);
      return { ...item, fretStart, fretEnd: fretStart + 4 };
    }));
  }

  const filtered = cards.filter(item => `${item.exercise.title} ${item.exercise.category}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Guitar Practice home"><img src="/pick.svg" width="39" height="39" alt="" /><span>Guitar<br />Practice<span className="brand-dot">.</span></span></a>
      <div className="workspace-label">YOUR PRACTICE SPACE</div>
      <nav aria-label="Main navigation">
        <button aria-label="Practice deck" aria-current={view === 'practice' ? 'page' : undefined} className={`nav-item ${view === 'practice' ? 'active' : ''}`} onClick={() => setView('practice')}><Layers3 size={18} /><span>Practice deck</span><span className="nav-dot" /></button>
        <button aria-label="Exercise library" aria-current={view === 'library' ? 'page' : undefined} className={`nav-item ${view === 'library' ? 'active' : ''}`} onClick={() => setView('library')}><BookOpen size={18} /><span>Exercise library</span><span className="nav-count">16</span></button>
      </nav>
      <div className="sidebar-note"><div className="string-art" aria-hidden="true">{[0,1,2,3,4,5].map(i => <span key={i} />)}<i /><i /></div><p>Small sessions.<br />Lasting progress.</p><span>Just you, six strings,<br />and a little consistency.</span></div>
      <div className="sidebar-footer"><span className="online-dot" /> A good day to play.</div>
    </aside>

    <main>
      <header className="topbar"><div className="breadcrumb">Your workspace <span>/</span> <strong>{view === 'practice' ? 'Practice deck' : 'Exercise library'}</strong></div><button className="help-button" onClick={() => dialog.current?.showModal()}><CircleHelp size={16} /> How it works</button></header>
      <div className="main-content">
        <section className="page-heading"><div><div className="eyebrow"><span /> FIND YOUR FLOW</div><h1>{view === 'practice' ? <>A little practice.<br className="mobile-break" /> A lot of progress.</> : 'Your practice library.'}</h1><p>{view === 'practice' ? 'Two chords. One exercise. Make it musical.' : 'Sixteen ways to find something new in those six strings.'}</p></div><div className="heading-badge"><Music2 size={17} /><span>Built for your daily rhythm</span></div></section>

        {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={shuffleDeck} disabled={loading}><RotateCcw size={15} /> Try again</button></div>}
        <div className="sr-only" role="status">{notice}</div>

        {view === 'practice' ? <>
          <div className="practice-grid">
            <section className="deck-column" aria-label="Practice card">
              <div className="section-heading"><h2><Layers3 size={17} /> Your practice deck</h2><span>2 chords <span className="tiny-dot">+</span> 1 library exercise</span></div>
              <div className="card-stack">
                <div className="practice-card">
                  {loading && !card ? <div className="loading-state"><LoaderCircle className="spin" size={26} /><p>Tuning up your practice deck…</p></div> : card ? <>
                    <div className="card-topline"><span className="category-pill"><span />{card.exercise.category}</span><span className="card-number">CARD <b>{String(index + 1).padStart(2, '0')}</b><span>/</span>{cards.length}</span></div>
                    <div className="exercise-heading" key={card.exercise.id}><div className="exercise-kicker">YOUR EXERCISE FROM THE LIBRARY</div><h2>{card.exercise.title}</h2><p>{card.exercise.guidance}</p></div>
                    <div className="progression">
                      <div className="mini-heading"><span>YOUR TWO CHORDS</span><span>Focus · {card.chords[activeChord]?.name}</span></div>
                      <div className="chord-grid chord-pair">{card.chords.map((chord, chordIndex) => <button key={chord.name} title={chord.note || `Focus on ${chord.name}`} onClick={() => setActiveChord(chordIndex)} aria-pressed={activeChord === chordIndex} className={`chord ${activeChord === chordIndex ? 'selected' : ''}`}><span className={chord.emphasized ? 'emphasized' : ''}>{chord.name}</span><small title="Original exercise annotation">{chord.annotation || '—'}</small></button>)}</div>
                      <p className="pair-guidance">{card.exercise.chords.length ? 'Work through the exercise, moving between these two chords.' : 'Explore the scale over each chord, then connect the two.'}</p>
                      {card.chords[activeChord]?.note && <p className="chord-note">{card.chords[activeChord].note}</p>}
                    </div>
                    <div className="card-position"><div className="mini-heading"><span>YOUR PATCH OF THE FRETBOARD</span><span>5 frets. Plenty to explore.</span></div><Fretboard start={card.fretStart} end={card.fretEnd} /></div>
                    <div className="card-bottom"><span><AudioLines size={16} /><strong>{card.bpm}</strong> BPM</span><span className="bottom-separator" /><span><SlidersHorizontal size={15} /> Frets <strong>{card.fretStart}–{card.fretEnd}</strong></span><span className="position-caption">Stay in your five-fret window</span></div>
                  </> : <div className="loading-state"><Music2 size={28} /><p>Your next practice is one retry away.</p></div>}
                </div>
              </div>
              <div className="deck-actions"><button className="shuffle-button" onClick={shuffleDeck} disabled={loading}><Shuffle size={17} className={loading ? 'spin' : ''} />{loading ? 'Shuffling…' : 'Shuffle deck'}</button><div className="navigation-buttons"><button className="icon-button" aria-label="Previous card" onClick={() => navigate(-1)} disabled={loading || !card}><ArrowLeft size={18} /></button><button className="next-button" onClick={() => navigate(1)} disabled={loading || !card}>Next card <ArrowRight size={17} /></button></div></div>
              <div className="keyboard-hint"><span><kbd>←</kbd><kbd>→</kbd> to move through your deck</span><span>Keep it fresh. Keep it fun.</span></div>
            </section>

            <aside className="settings-column" aria-label="Practice settings">
              <div className="section-heading"><h2><SlidersHorizontal size={16} /> Make it your own</h2></div>
              <section className="settings-panel"><div className="control-heading"><label htmlFor="bpm">TEMPO</label><span>BPM</span></div><div className="tempo-control"><button className="round-button" aria-label="Decrease BPM" onClick={() => changeTempo(settings.bpm - 5)} disabled={loading || settings.bpm <= 20}><Minus size={17} /></button><input id="bpm" disabled={loading} type="number" inputMode="numeric" min="20" max="300" value={tempoText} onChange={event => setTempoText(event.target.value)} onBlur={commitTempo} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button className="round-button" aria-label="Increase BPM" onClick={() => changeTempo(settings.bpm + 5)} disabled={loading || settings.bpm >= 300}><Plus size={17} /></button></div><div className="tempo-caption">Your pace. Your progress.</div><div className="metronome"><button onClick={metronome.toggle} aria-pressed={metronome.running} className={metronome.running ? 'playing' : ''}>{metronome.running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />} Metronome</button><div className="beat-dots" aria-label={metronome.running ? 'Metronome running' : 'Metronome stopped'}>{[0,1,2,3].map(beat => <i key={beat} className={metronome.running && metronome.beat === beat ? 'lit' : ''} />)}</div><Volume2 size={14} /></div>{metronome.audioError && <p className="audio-error" role="alert">{metronome.audioError}</p>}<div className="panel-divider" /><div className="control-heading"><label htmlFor="fret-range">FRET RANGE</label><span className="five-frets">5 frets</span></div><div className="select-wrapper"><Shuffle size={15} /><select id="fret-range" disabled={loading} value={settings.fretMode} onChange={event => changeRange(event.target.value)}><option value="random">Random position</option>{Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={i + 1}>Frets {i + 1}–{i + 5}</option>)}</select><ChevronDown size={14} /></div><p className="range-caption">{settings.fretMode === 'random' ? 'A fresh five-fret window on every card.' : 'One position. A whole world of possibilities.'}</p><div className="settings-footnote"><span /> Settings apply to your whole deck.</div></section>
              <div className="practice-tip"><Sparkles size={17} /><div><strong>Make space for the music.</strong><p>Start slow. Stay curious. A clean phrase beats a fast one.</p></div></div>
            </aside>
          </div>
          <section className="up-next"><div className="up-next-icon"><ListMusic size={21} /></div><div><div className="eyebrow">WAITING IN YOUR DECK</div><p>{cards.length ? cards[(index + 1) % cards.length].exercise.title : 'Sixteen exercises. A new perspective.'}</p></div><button onClick={() => setView('library')}>Explore all exercises <ArrowRight size={16} /></button></section>
        </> : <section className="library"><div className="library-toolbar"><h2>All exercises <span>16</span></h2><label className="search-input"><Search size={17} /><input placeholder="Find an exercise…" aria-label="Search exercises" value={query} onChange={event => setQuery(event.target.value)} /></label></div>{loading && !cards.length ? <div className="loading-state"><LoaderCircle className="spin" /> Loading your library…</div> : <div className="library-grid">{filtered.map(item => <button className="library-card" key={item.exercise.id} onClick={() => { setIndex(cards.findIndex(entry => entry.exercise.id === item.exercise.id)); setView('practice'); }}><div className="library-card-top"><span className="category-pill">{item.exercise.category}</span><ArrowRight size={17} /></div><h3>{item.exercise.title}</h3><p>{item.exercise.guidance}</p><div className="library-card-bottom"><span>{item.bpm} BPM</span><span>Frets {item.fretStart}–{item.fretEnd}</span></div></button>)}</div>}{!loading && !filtered.length && <div className="empty-library"><Search size={25} /><h3>{cards.length ? 'No exercises found' : 'Your library couldn’t load'}</h3><p>{cards.length ? 'Try another name or category.' : 'Use Try again above to reconnect to your practice deck.'}</p>{cards.length > 0 && <button className="text-button" onClick={() => setQuery('')}>Clear search</button>}</div>}</section>}
        <footer className="page-footer"><span>Less overthinking. More playing.</span><span>GUITAR PRACTICE <span className="footer-dot">✳</span></span></footer>
      </div>
    </main>

    <dialog ref={dialog} className="help-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="dialog-inner"><button className="dialog-close icon-button" onClick={() => dialog.current?.close()} aria-label="Close help"><X size={19} /></button><div className="eyebrow">YOUR DAILY PRACTICE, SIMPLIFIED</div><h2>Pick up. Shuffle. Play.</h2><p>Each card combines two distinct chords with one exercise from your library. Shuffle to refresh the chord pairings, exercise order, and fret positions.</p><ol><li><strong>Set your pace.</strong> Tempo starts at 100 BPM. Type a value from 20–300 or use the ± buttons. The optional metronome gives you an audible four-beat pulse.</li><li><strong>Find your position.</strong> Every range contains exactly five frets, within frets 1–12. Choose random or lock in a position for the whole deck.</li><li><strong>Follow the card.</strong> Apply the library exercise to the two chords shown. Click either chord to focus on it. Scale exercises also receive a chord pair. The small numbers preserve the original annotations; a dash means none was supplied.</li><li><strong>Keep moving.</strong> Use the arrows to browse at your own pace, or shuffle for a fresh combination. Tempo and range preferences stay saved in this browser.</li></ol><button className="primary-button" onClick={() => dialog.current?.close()}>Let’s play <ArrowRight size={16} /></button></div></dialog>
  </div>;
}

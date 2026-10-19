'use client';

import { cn } from '@/lib/cn';
import { ChordTarget } from '@/components/chord-target';
import { StringRange } from '@/components/string-range';
import type { Card } from '@/lib/practice';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Layers3,
  ListMusic,
  LoaderCircle,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

type Settings = { bpm: number; fretMode: string; stringMode: string; keepChords: boolean };
const STORAGE_KEY = 'guitar-practice-settings-v1';
const DEFAULT_SETTINGS: Settings = {
  bpm: 100,
  fretMode: 'random',
  stringMode: 'random',
  keepChords: false,
};

function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      bpm: Number.isInteger(saved?.bpm) && saved.bpm >= 20 && saved.bpm <= 300 ? saved.bpm : 100,
      keepChords: saved?.keepChords === true,
      fretMode:
        saved?.fretMode === 'random' || /^[1-8]$/.test(saved?.fretMode) ? saved.fretMode : 'random',
      stringMode:
        saved?.stringMode === 'random' || /^[1-4]$/.test(saved?.stringMode)
          ? saved.stringMode
          : Number.isInteger(saved?.stringStart) && saved.stringStart >= 1 && saved.stringStart <= 4
            ? String(saved.stringStart)
            : 'random',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function differentPosition(current: number, positions: number): number {
  const position = Math.floor(Math.random() * (positions - 1)) + 1;
  return position >= current ? position + 1 : position;
}

async function requestDeck(
  settings: Settings,
  shuffle: boolean,
  signal?: AbortSignal,
): Promise<Card[]> {
  const response = await fetch('/api/decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      bpm: settings.bpm,
      fretStart: settings.fretMode === 'random' ? null : Number(settings.fretMode),
      stringStart: settings.stringMode === 'random' ? null : Number(settings.stringMode),
      shuffle,
    }),
  });
  if (!response.ok)
    throw new Error(
      'The practice deck couldn’t load. Check that the Spring Boot server is running, then try again.',
    );
  return response.json();
}

function Fretboard({
  start,
  end,
  stringStart,
  stringEnd,
}: {
  start: number;
  end: number;
  stringStart: number;
  stringEnd: number;
}) {
  const left = 36;
  const width = 39;
  return (
    <svg
      className={cn(
        'fretboard',
        'mx-auto mt-0 mb-1 block h-auto max-h-36.25 w-full',
        'wide:max-h-41.75',
      )}
      viewBox="0 0 515 150"
      role="img"
      aria-label={`Guitar fretboard. Frets ${start} through ${end}, strings ${stringStart} through ${stringEnd} highlighted.`}
    >
      <rect x={left} y="22" width={12 * width} height="96" rx="4" fill="#f4f1e9" />
      <rect
        x={left + (start - 1) * width}
        y={22 + (6 - stringEnd) * 16}
        width={width * 5}
        height="48"
        rx="3"
        fill="#e0eacf"
        stroke="#7e9560"
        strokeWidth="1.5"
      />
      {Array.from({ length: 13 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={left + i * width}
          x2={left + i * width}
          y1="22"
          y2="118"
          stroke={i === 0 ? '#8a8c78' : '#d1cec1'}
          strokeWidth={i === 0 ? 4 : 1.5}
        />
      ))}
      {[3, 5, 7, 9, 12].map((fret) => (
        <g key={fret}>
          {(fret === 12 ? [53, 85] : [69]).map((y) => (
            <circle key={y} cx={left + (fret - 0.5) * width} cy={y} r="4" fill="#d4d0c4" />
          ))}
        </g>
      ))}
      {Array.from({ length: 6 }, (_, i) => {
        const string = 6 - i;
        const selected = string >= stringStart && string <= stringEnd;
        return (
          <g key={`s${i}`} data-string={string} data-selected={selected}>
            <rect
              x="2"
              y={22 + i * 16}
              width="22"
              height="16"
              rx="5"
              fill={selected ? '#4d6337' : '#eeeee5'}
            />
            <text
              x="13"
              y={34 + i * 16}
              textAnchor="middle"
              fontSize="11"
              fontWeight={selected ? '700' : '400'}
              fill={selected ? '#ffffff' : '#999c8e'}
            >
              {string}
            </text>
            <line
              x1={left}
              x2={left + 12 * width}
              y1={30 + i * 16}
              y2={30 + i * 16}
              stroke={selected ? '#879c6c' : '#d1cfc3'}
              strokeWidth={(selected ? 1.2 : 0.6) + (string - 1) * 0.24}
            />
            {selected && (
              <line
                x1={left + (start - 1) * width}
                x2={left + end * width}
                y1={30 + i * 16}
                y2={30 + i * 16}
                stroke="#405b2a"
                strokeWidth={2.6 + (string - 1) * 0.24}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <text
          key={`n${i}`}
          x={left + (i + 0.5) * width}
          y="135"
          textAnchor="middle"
          fill={i + 1 >= start && i + 1 <= end ? '#4d573b' : '#9a998d'}
          fontSize="11"
          fontWeight={i + 1 >= start && i + 1 <= end ? '700' : '400'}
        >
          {i + 1}
        </text>
      ))}
      <path
        d={`M${left + (start - 1) * width + 5} 19v-4h${width * 5 - 10}v4`}
        stroke="#6d7b52"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
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
          oscillator.disconnect();
          gain.disconnect();
          sounds.current = sounds.current.filter((sound) => sound !== oscillator);
        };
        const update = setTimeout(
          () => {
            setBeat(tick);
            updates.delete(update);
          },
          Math.max(0, (nextTime - audio.currentTime) * 1000),
        );
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
      sounds.current.forEach((sound) => {
        try {
          sound.stop();
        } catch {
          /* Already stopped. */
        }
      });
      sounds.current = [];
    };
  }, [running, bpm]);

  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );

  async function toggle() {
    if (running) {
      setRunning(false);
      setBeat(-1);
      return;
    }
    try {
      if (!context.current || context.current.state === 'closed')
        context.current = new AudioContext();
      await context.current.resume();
      setAudioError('');
      setRunning(true);
    } catch {
      setAudioError(
        'Audio is unavailable in this browser. Try another browser to hear the metronome.',
      );
    }
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
    setSettings(saved);
    setTempoText(String(saved.bpm));
    const controller = new AbortController();
    requestDeck(saved, false, controller.signal)
      .then((deck) => {
        setCards(deck);
        setLoading(false);
      })
      .catch((reason) => {
        if (reason.name !== 'AbortError') {
          setError(reason.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading && cards.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        /* Practice still works without storage. */
      }
    }
  }, [settings, loading, cards.length]);
  useEffect(() => {
    setActiveChord(0);
  }, [index]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const navigate = useCallback(
    (direction: number) => {
      setIndex((value) => (cards.length ? (value + direction + cards.length) % cards.length : 0));
    },
    [cards.length],
  );

  async function shuffleDeck() {
    setLoading(true);
    setError('');
    try {
      const shuffledSettings = { ...settings, fretMode: 'random', stringMode: 'random' };
      if (settings.keepChords && cards.length) {
        setCards((previous) =>
          previous.map((item) => {
            const fretStart = differentPosition(item.fretStart, 8);
            const stringStart = differentPosition(item.stringStart, 4);
            return {
              ...item,
              fretStart,
              fretEnd: fretStart + 4,
              stringStart,
              stringEnd: stringStart + 2,
            };
          }),
        );
        setSettings(shuffledSettings);
        setView('practice');
        setNotice('New fret and string ranges. Chords and target notes kept.');
        return;
      }
      const deck = await requestDeck(shuffledSettings, true);
      setSettings(shuffledSettings);
      setCards(deck);
      setIndex(0);
      setActiveChord(0);
      setView('practice');
      setNotice('Fresh deck. Fresh perspective.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not shuffle the deck.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest('input, select, textarea, button') || event.target.isContentEditable)
      )
        return;
      if (dialog.current?.open || loading || view !== 'practice') return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [navigate, loading, view]);

  function changeTempo(value: number) {
    const bpm = Math.min(300, Math.max(20, Math.round(value)));
    setSettings((previous) => ({ ...previous, bpm }));
    setTempoText(String(bpm));
    setCards((previous) => previous.map((item) => ({ ...item, bpm })));
  }

  function commitTempo() {
    if (tempoText.trim() && Number.isFinite(Number(tempoText))) changeTempo(Number(tempoText));
    else setTempoText(String(settings.bpm));
  }

  function changeRange(mode: string) {
    setSettings((previous) => ({ ...previous, fretMode: mode }));
    setCards((previous) =>
      previous.map((item) => {
        const fretStart = mode === 'random' ? Math.floor(Math.random() * 8) + 1 : Number(mode);
        return { ...item, fretStart, fretEnd: fretStart + 4 };
      }),
    );
  }

  function changeTargetNote(chordIndex: number, note: string) {
    if (!card?.chords[chordIndex].targetNoteOptions.some((option) => option.name === note)) return;
    setCards((previous) =>
      previous.map((item, cardIndex) =>
        cardIndex === index
          ? {
              ...item,
              targetNotes: item.targetNotes.map((target, i) => (i === chordIndex ? note : target)),
            }
          : item,
      ),
    );
    setActiveChord(chordIndex);
  }

  function changeStringRange(mode: string) {
    setSettings((previous) => ({ ...previous, stringMode: mode }));
    setCards((previous) =>
      previous.map((item) => {
        const stringStart = mode === 'random' ? Math.floor(Math.random() * 4) + 1 : Number(mode);
        return { ...item, stringStart, stringEnd: stringStart + 2 };
      }),
    );
  }

  const filtered = cards.filter((item) =>
    `${item.exercise.title} ${item.exercise.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className={cn(
        'app-shell',
        'flex min-h-screen',
        '[&>main]:ml-56.5 [&>main]:w-[calc(100%-226px)]',
        'compact:[&>main]:ml-50 compact:[&>main]:w-[calc(100%-200px)]',
        'narrow:[&>main]:ml-44.5 narrow:[&>main]:w-[calc(100%-178px)]',
      )}
    >
      <aside
        className={cn(
          'sidebar',
          'fixed top-0 right-auto bottom-0 left-0 z-10 flex w-56.5 flex-col border-r border-solid border-r-[#e1e2d7] bg-sidebar px-5.5 pt-9.75 pb-5.25',
          'compact:w-50 compact:px-3.75',
          'narrow:w-44.5 narrow:px-2.5',
        )}
      >
        <a
          className={cn(
            'brand',
            'mt-0 mr-0 mb-14.25 ml-1.75 flex items-center gap-2.75',
            '[&>span]:font-display [&>span]:text-[19px] [&>span]:leading-[1.17] [&>span]:font-extrabold [&>span]:tracking-[-0.65px]',
            'narrow:ml-2.25 narrow:gap-2',
            'narrow:[&>span]:text-[17px]',
            'narrow:[&_img]:h-8.5 narrow:[&_img]:w-8.5',
          )}
          href="/"
          aria-label="Guitar Practice home"
        >
          <img src="/pick.svg" width="39" height="39" alt="" />
          <span>
            Guitar
            <br />
            Practice<span className={cn('brand-dot', 'text-[#859263]')}>.</span>
          </span>
        </a>
        <div
          className={cn(
            'workspace-label',
            'mx-2.5 mt-0 mb-4 text-[9px] font-[650] tracking-[1.5px] text-[#909383]',
            'narrow:text-[8px] narrow:tracking-[1.1px]',
          )}
        >
          YOUR PRACTICE SPACE
        </div>
        <nav className={'flex flex-col gap-2'} aria-label="Main navigation">
          <button
            aria-label="Practice deck"
            aria-current={view === 'practice' ? 'page' : undefined}
            className={cn(
              `nav-item ${view === 'practice' ? cn('active', '[&_.nav-dot]:opacity-100') : ''}`,
              'flex w-full items-center gap-2.75 rounded-md border-0 bg-transparent px-3 py-3.25 text-left text-[12px] text-[#787d6b]',
              'hover:bg-[#e5e7d9]',
              '[&.active]:bg-[#e0e5d3] [&.active]:font-semibold [&.active]:text-[#445333]',
              '[&_svg]:stroke-[1.6]',
              'narrow:gap-2 narrow:pl-2.5 narrow:text-[11px]',
            )}
            onClick={() => setView('practice')}
          >
            <Layers3 size={18} />
            <span>Practice deck</span>
            <span
              className={cn('nav-dot', 'ml-auto h-1.25 w-1.25 rounded-full bg-[#6b7d49] opacity-0')}
            />
          </button>
          <button
            aria-label="Exercise library"
            aria-current={view === 'library' ? 'page' : undefined}
            className={cn(
              `nav-item ${view === 'library' ? cn('active', '[&_.nav-dot]:opacity-100') : ''}`,
              'flex w-full items-center gap-2.75 rounded-md border-0 bg-transparent px-3 py-3.25 text-left text-[12px] text-[#787d6b]',
              'hover:bg-[#e5e7d9]',
              '[&.active]:bg-[#e0e5d3] [&.active]:font-semibold [&.active]:text-[#445333]',
              '[&_svg]:stroke-[1.6]',
              'narrow:gap-2 narrow:pl-2.5 narrow:text-[11px]',
            )}
            onClick={() => setView('library')}
          >
            <BookOpen size={18} />
            <span>Exercise library</span>
            <span className={cn('nav-count', 'ml-auto text-[10px] text-[#929681]')}>16</span>
          </button>
        </nav>
        <div
          className={cn(
            'sidebar-note',
            'mt-auto mb-15.75 px-3.25 py-0',
            '[&_p]:mx-0 [&_p]:mt-6 [&_p]:mb-2.5 [&_p]:font-display [&_p]:text-[20px] [&_p]:leading-normal [&_p]:font-[650] [&_p]:tracking-[-0.6px]',
            '[&>span]:text-[11px] [&>span]:leading-[1.9] [&>span]:text-[#969889]',
          )}
        >
          <div
            className={cn(
              'string-art',
              'relative h-20.75 w-33.25 -rotate-9 overflow-hidden opacity-65',
              '[&>span]:absolute [&>span]:top-3.75 [&>span]:h-px [&>span]:w-32.5 [&>span]:bg-[#a8b08e]',
              '[&>span:nth-child(2)]:top-6.5',
              '[&>span:nth-child(3)]:top-9.25',
              '[&>span:nth-child(4)]:top-12',
              '[&>span:nth-child(5)]:top-14.75',
              '[&>span:nth-child(6)]:top-17.5',
              '[&_i]:absolute [&_i]:left-8.25 [&_i]:h-20.25 [&_i]:w-px [&_i]:bg-[#a8b08e]',
              '[&_i:last-child]:left-24.25',
            )}
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} />
            ))}
            <i />
            <i />
          </div>
          <p>
            Small sessions.
            <br />
            Lasting progress.
          </p>
          <span>
            Just you, six strings,
            <br />
            and a little consistency.
          </span>
        </div>
        <div
          className={cn(
            'sidebar-footer',
            'flex items-center gap-2 border-t border-solid border-t-[#dfe1d2] px-2 pt-5.25 pb-0 text-[10px] text-[#888d7c]',
          )}
        >
          <span
            className={cn('online-dot', 'inline-block h-1.25 w-1.25 rounded-full bg-[#7f8e62]')}
          />{' '}
          A good day to play.
        </div>
      </aside>

      <main>
        <header
          className={cn(
            'topbar',
            'flex h-19.75 items-center justify-between border-b border-solid border-b-line px-12 py-0',
            'compact:px-7.5 compact:py-0',
            'narrow:px-6',
          )}
        >
          <div
            className={cn(
              'breadcrumb',
              'text-[11px] text-[#93968a]',
              '[&_span]:mx-3.25 [&_span]:my-0 [&_span]:text-[#babdb1]',
              '[&_strong]:font-medium [&_strong]:text-[#656c5a]',
            )}
          >
            Your workspace <span>/</span>{' '}
            <strong>{view === 'practice' ? 'Practice deck' : 'Exercise library'}</strong>
          </div>
          <button
            className={cn(
              'help-button',
              'flex items-center gap-1.75 border-0 bg-transparent px-0 py-2 text-[11px] text-[#7b806e]',
              'hover:text-olive',
            )}
            onClick={() => dialog.current?.showModal()}
          >
            <CircleHelp size={16} /> How it works
          </button>
        </header>
        <div
          className={cn(
            'main-content',
            'mx-auto my-0 max-w-350 px-12 pt-10.75 pb-0',
            'wide:pt-13.75',
            'compact:px-7.5 compact:pt-8.75 compact:pb-0',
            'narrow:px-6',
          )}
        >
          <section
            className={cn(
              'page-heading',
              'mb-9.25 flex items-end justify-between gap-5',
              '[&_p]:m-0 [&_p]:text-[12px] [&_p]:leading-[1.6] [&_p]:text-[#8a8e7f]',
              'wide:mb-10.75',
            )}
          >
            <div>
              <div
                className={cn(
                  'eyebrow',
                  '[&>span]:inline-block [&>span]:h-1.25 [&>span]:w-1.25 [&>span]:rounded-full [&>span]:bg-[#7f8e62]',
                  'flex items-center gap-1.75 text-[9px] font-[650] tracking-[1.8px] text-[#8a9279]',
                )}
              >
                <span /> FIND YOUR FLOW
              </div>
              <h1
                className={cn(
                  'mx-0 mt-3.25 mb-3 font-display text-[32px] leading-[1.3] font-[650] tracking-[-1.3px]',
                  'narrow:text-[28px]',
                )}
              >
                {view === 'practice'
                  ? 'A little practice. A lot of progress.'
                  : 'Your practice library.'}
              </h1>
              <p>
                {view === 'practice'
                  ? 'Two chords. One exercise. Make it musical.'
                  : 'Sixteen ways to find something new in those six strings.'}
              </p>
            </div>
            <div
              className={cn(
                'heading-badge',
                'flex items-center gap-1.75 pb-0.75 text-[10px] whitespace-nowrap text-[#929a81]',
                '[&_svg]:stroke-[1.4]',
                'wide:text-[11px]',
                'compact:hidden',
              )}
            >
              <Music2 size={17} />
              <span>Built for your daily rhythm</span>
            </div>
          </section>

          {error && (
            <div
              className={cn(
                'error-message',
                'mx-0 mt-0 mb-5.5 flex items-center justify-between gap-3.75 rounded-md border border-solid border-[#ebd4b5] bg-[#faf0e3] px-3.75 py-3.25 text-[12px] text-[#907247]',
                '[&_button]:flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[11px] [&_button]:whitespace-nowrap [&_button]:text-[#907247]',
              )}
              role="alert"
            >
              <span>{error}</span>
              <button onClick={shuffleDeck} disabled={loading}>
                <RotateCcw size={15} /> Try again
              </button>
            </div>
          )}
          <div
            className={cn(
              'sr-only',
              'absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]',
            )}
            role="status"
          >
            {notice}
          </div>

          {view === 'practice' ? (
            <>
              <div
                className={cn(
                  'practice-grid',
                  'grid grid-cols-[minmax(0,1fr)_272px] gap-6.75',
                  'wide:grid-cols-[minmax(0,1fr)_300px] wide:gap-8.75',
                  'compact:grid-cols-[minmax(0,1fr)_245px] compact:gap-5.25',
                  'narrow:grid-cols-[minmax(0,1fr)_218px] narrow:gap-4.25',
                )}
              >
                <section className={'deck-column'} aria-label="Practice card">
                  <div
                    className={cn(
                      'section-heading',
                      'mb-4 flex h-5 items-center justify-between gap-2',
                      '[&_h2]:m-0 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2]:text-[11px] [&_h2]:font-[550] [&_h2]:text-[#626b54]',
                      '[&_h2_svg]:stroke-[1.5]',
                      '[&>span]:text-[9px] [&>span]:text-[#949886]',
                      'compact:[&>span]:text-[8px]',
                      'narrow:[&>span]:hidden',
                    )}
                  >
                    <h2>
                      <Layers3 size={17} /> Your practice deck
                    </h2>
                    <span>
                      2 chords <span className={cn('tiny-dot', 'px-1 py-0')}>+</span> 1 library
                      exercise
                    </span>
                  </div>
                  <div
                    className={cn(
                      'card-stack',
                      'relative mb-5.75',
                      "before:absolute before:right-4.25 before:-bottom-4 before:left-4.25 before:z-0 before:h-1/2 before:rounded-[11px] before:border before:border-solid before:border-[#e0e1d4] before:bg-[#eeeee3] before:content-['']",
                      "after:absolute after:right-2.25 after:-bottom-2.25 after:left-2.25 after:z-0 after:h-1/2 after:rounded-[11px] after:border after:border-solid after:border-[#e0e1d4] after:bg-[#f1f1e8] after:content-['']",
                    )}
                  >
                    <div
                      className={cn(
                        'practice-card',
                        'relative z-1 flex min-h-124.5 flex-col overflow-hidden rounded-[10px] border border-solid border-[#dedfd1] bg-paper px-7 pt-6.25 pb-0 shadow-[0_4px_12px_#4c553407]',
                        'wide:min-h-138.75 wide:px-9.5 wide:pt-8 wide:pb-0',
                        'compact:px-5.25',
                        'narrow:px-4.5',
                      )}
                    >
                      {loading && !card ? (
                        <div
                          className={cn(
                            'loading-state',
                            'flex min-h-115 flex-col items-center justify-center gap-3 text-center text-[#8d9c77]',
                            '[&_p]:text-[12px]',
                          )}
                        >
                          <LoaderCircle className={cn('spin', 'animate-spin')} size={26} />
                          <p>Tuning up your practice deck…</p>
                        </div>
                      ) : card ? (
                        <>
                          <div className={cn('card-topline', 'flex items-center justify-between')}>
                            <span
                              className={cn(
                                'category-pill',
                                'inline-flex items-center gap-1.5 rounded-sm bg-[#edf0e4] px-2.25 py-1.25 text-[9px] font-[550] text-[#7b875f]',
                                '[&>span]:h-1 [&>span]:w-1 [&>span]:rounded-full [&>span]:bg-[#94a477]',
                              )}
                            >
                              <span />
                              {card.exercise.category}
                            </span>
                            <span
                              className={cn(
                                'card-number',
                                'flex items-center gap-1.75 text-[9px] tracking-[0.5px] text-[#999c8e]',
                                '[&_b]:font-semibold [&_b]:text-[#6c745f]',
                                '[&>span]:ml-0 [&>span]:text-[#c0c3b4]',
                              )}
                            >
                              CARD <b>{String(index + 1).padStart(2, '0')}</b>
                              <span>/</span>
                              {cards.length}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'exercise-heading',
                              'animate-rise pt-7.5',
                              '[&_h2]:mx-0 [&_h2]:mt-0 [&_h2]:mb-3 [&_h2]:max-w-145 [&_h2]:font-display [&_h2]:text-[31px] [&_h2]:leading-tight [&_h2]:font-semibold [&_h2]:tracking-[-1.15px]',
                              '[&_p]:m-0 [&_p]:min-h-10 [&_p]:max-w-127.5 [&_p]:text-[11px] [&_p]:leading-[1.85] [&_p]:text-[#919581]',
                              'wide:[&_h2]:text-[37px]',
                              'wide:[&_p]:text-[12px]',
                              'compact:[&_h2]:text-[28px]',
                              'narrow:[&_h2]:text-[25px]',
                              'narrow:[&_p]:text-[10px]',
                            )}
                            key={card.exercise.id}
                          >
                            <div
                              className={cn(
                                'exercise-kicker',
                                'mb-2.75 text-[8px] tracking-[1.8px] text-[#abae9e]',
                              )}
                            >
                              YOUR EXERCISE FROM THE LIBRARY
                            </div>
                            <h2>{card.exercise.title}</h2>
                            <p>{card.exercise.guidance}</p>
                          </div>
                          <div
                            className={cn('progression', 'mx-0 mt-5.5 mb-4.75', 'narrow:mb-3.75')}
                          >
                            <div
                              className={cn(
                                'mini-heading',
                                'flex items-center justify-between gap-2',
                                '[&>span:first-child]:text-[8px] [&>span:first-child]:font-[550] [&>span:first-child]:tracking-[1.2px] [&>span:first-child]:text-[#929780]',
                                '[&>span:last-child]:text-[8px] [&>span:last-child]:text-[#a6aa98]',
                                'compact:[&>span:last-child]:text-[7px]',
                                'narrow:[&>span:last-child]:hidden',
                              )}
                            >
                              <span>YOUR TWO CHORDS</span>
                              <span>Focus · {card.chords[activeChord]?.name}</span>
                            </div>
                            <div className="chord-pair mt-3 grid grid-cols-2 gap-3">
                              {card.chords.map((chord, chordIndex) => (
                                <ChordTarget
                                  key={chord.name}
                                  chord={chord}
                                  id={`${card.exercise.id}-target-${chordIndex}`}
                                  selected={activeChord === chordIndex}
                                  targetNote={card.targetNotes[chordIndex]}
                                  disabled={loading}
                                  onSelectChord={() => setActiveChord(chordIndex)}
                                  onTargetChange={(note) => changeTargetNote(chordIndex, note)}
                                />
                              ))}
                            </div>
                            <p
                              className={cn(
                                'pair-guidance',
                                'mx-0 mt-3 mb-0 text-[10px] leading-[1.8] text-[#919581]',
                              )}
                            >
                              {card.exercise.chords.length
                                ? 'Work through the exercise, moving between these two chords.'
                                : 'Explore the scale over each chord, then connect the two.'}
                            </p>
                            {card.chords[activeChord]?.note && (
                              <p
                                className={cn(
                                  'chord-note',
                                  'mx-0 mt-1.75 -mb-2.5 text-[9px] text-[#7a8664]',
                                )}
                              >
                                {card.chords[activeChord].note}
                              </p>
                            )}
                          </div>
                          <div className={cn('card-position', 'mt-auto pt-1.25')}>
                            <div
                              className={cn(
                                'mini-heading',
                                'flex items-center justify-between gap-2',
                                '[&>span:first-child]:text-[8px] [&>span:first-child]:font-[550] [&>span:first-child]:tracking-[1.2px] [&>span:first-child]:text-[#929780]',
                                '[&>span:last-child]:shrink-0 [&>span:last-child]:rounded [&>span:last-child]:bg-[#e6eddb] [&>span:last-child]:px-2 [&>span:last-child]:py-1 [&>span:last-child]:text-[9px] [&>span:last-child]:font-semibold [&>span:last-child]:text-[#405b2a]',
                                'compact:[&>span:last-child]:text-[7px]',
                              )}
                            >
                              <span>YOUR PATCH OF THE FRETBOARD</span>
                              <span>
                                Strings {card.stringStart}–{card.stringEnd} selected
                              </span>
                            </div>
                            <Fretboard
                              start={card.fretStart}
                              end={card.fretEnd}
                              stringStart={card.stringStart}
                              stringEnd={card.stringEnd}
                            />
                          </div>
                          <div
                            className={cn(
                              'card-bottom',
                              '-mx-7 my-0 flex min-h-13.25 flex-wrap items-center gap-x-3 gap-y-2 border-t border-solid border-t-[#edede2] bg-[#fbfbf5] px-6.75 py-4 text-[9px] text-[#919680]',
                              '[&>span]:flex [&>span]:items-center [&>span]:gap-1.25',
                              '[&_svg]:mr-0.5 [&_svg]:text-[#949e7d]',
                              '[&_strong]:font-semibold [&_strong]:text-[#6f7a5c]',
                              '[&_.bottom-separator]:mx-0.75 [&_.bottom-separator]:my-0 [&_.bottom-separator]:h-3.25 [&_.bottom-separator]:w-px [&_.bottom-separator]:bg-[#dddfd1]',
                              'wide:-mx-9.5 wide:my-0 wide:px-9.25',
                              'compact:-mx-5.25 compact:px-5',
                              'narrow:-mx-4.5 narrow:px-4.25',
                            )}
                          >
                            <span>
                              <AudioLines size={16} />
                              <strong>{card.bpm}</strong> BPM
                            </span>
                            <span className={'bottom-separator'} />
                            <span>
                              <SlidersHorizontal size={15} /> Frets{' '}
                              <strong>
                                {card.fretStart}–{card.fretEnd}
                              </strong>
                            </span>
                            <span>
                              <ListMusic size={15} /> Strings{' '}
                              <strong>
                                {card.stringStart}–{card.stringEnd}
                              </strong>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div
                          className={cn(
                            'loading-state',
                            'flex min-h-115 flex-col items-center justify-center gap-3 text-center text-[#8d9c77]',
                            '[&_p]:text-[12px]',
                          )}
                        >
                          <Music2 size={28} />
                          <p>Your next practice is one retry away.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'deck-actions',
                      'flex items-center justify-between gap-3 pt-3.25',
                    )}
                  >
                    <button
                      className={cn(
                        'shuffle-button',
                        'flex items-center justify-center gap-2.25 rounded-[5px] border border-solid border-olive bg-olive px-4.75 py-3 text-[11px] font-medium text-[#fffdf3] shadow-[0_2px_3px_#4852390c]',
                        'hover:bg-[#435032]',
                      )}
                      onClick={shuffleDeck}
                      disabled={loading}
                    >
                      <Shuffle size={17} className={loading ? cn('spin', 'animate-spin') : ''} />
                      {loading ? 'Shuffling…' : 'Shuffle deck'}
                    </button>
                    <div className={cn('navigation-buttons', 'flex items-center gap-2')}>
                      <button
                        className={cn(
                          'icon-button',
                          'grid h-9.25 w-9.25 place-items-center rounded-[5px] border border-solid border-[#dfe2d4] bg-transparent text-[#929b82]',
                          'hover:bg-[#eaeedf]',
                        )}
                        aria-label="Previous card"
                        onClick={() => navigate(-1)}
                        disabled={loading || !card}
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <button
                        className={cn(
                          'next-button',
                          'flex h-9.5 items-center gap-4.25 rounded-[5px] border border-solid border-[#dce0ce] bg-[#edeee3] px-3.5 py-0 text-[10px] text-[#687553]',
                          'hover:bg-[#e2e7d6]',
                        )}
                        onClick={() => navigate(1)}
                        disabled={loading || !card}
                      >
                        Next card <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'keyboard-hint',
                      'mt-4 flex justify-between text-[8px] text-[#a8ad98]',
                      '[&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-1',
                      '[&_kbd]:mr-0 [&_kbd]:h-3.75 [&_kbd]:min-w-4 [&_kbd]:rounded-[3px] [&_kbd]:border [&_kbd]:border-solid [&_kbd]:border-[#e0e3d5] [&_kbd]:text-center [&_kbd]:font-[inherit] [&_kbd]:text-[#9ca48a]',
                      '[&_kbd:last-of-type]:mr-1',
                      'compact:[&>span:last-child]:hidden',
                    )}
                  >
                    <span>
                      <kbd>←</kbd>
                      <kbd>→</kbd> to move through your deck
                    </span>
                    <span>Keep it fresh. Keep it fun.</span>
                  </div>
                </section>

                <aside className="settings-column" aria-label="Practice settings">
                  <div
                    className={cn(
                      'section-heading',
                      'mb-4 flex h-5 items-center justify-between gap-2',
                      '[&_h2]:m-0 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2 [&_h2]:text-[11px] [&_h2]:font-[550] [&_h2]:text-[#626b54]',
                      '[&_h2_svg]:stroke-[1.5]',
                      '[&>span]:text-[9px] [&>span]:text-[#949886]',
                      'compact:[&>span]:text-[8px]',
                      'narrow:[&>span]:hidden',
                    )}
                  >
                    <h2>
                      <SlidersHorizontal size={16} /> Make it your own
                    </h2>
                  </div>
                  <section
                    className={cn(
                      'settings-panel',
                      'overflow-hidden rounded-lg border border-solid border-[#e0e2d4] bg-[#f1f2e9] px-5.5 pt-5.5 pb-0',
                      'wide:pt-6.75',
                      'compact:px-4.5',
                      'narrow:px-3.75',
                    )}
                  >
                    <div
                      className={cn(
                        'control-heading',
                        'flex items-center justify-between text-[9px] tracking-[1.2px] text-[#899375]',
                        '[&_label]:font-[550]',
                        '[&>span]:text-[8px] [&>span]:tracking-[0.5px] [&>span]:text-[#a2aa90]',
                      )}
                    >
                      <label htmlFor="bpm">TEMPO</label>
                      <span>BPM</span>
                    </div>
                    <div
                      className={cn(
                        'tempo-control',
                        'mt-3.5 flex items-center justify-between',
                        '[&_input]:h-15.5 [&_input]:w-27.5 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-center [&_input]:font-display [&_input]:text-[49px] [&_input]:font-medium [&_input]:tracking-[-2.5px] [&_input]:text-[#546242] [&_input]:outline-none',
                        '[&_input:focus-visible]:rounded-[5px] [&_input:focus-visible]:outline-1 [&_input:focus-visible]:outline-offset-0 [&_input:focus-visible]:outline-[#a1ae87] [&_input:focus-visible]:outline-solid',
                        'wide:mt-5.25',
                        'narrow:[&_input]:w-21.25 narrow:[&_input]:text-[45px]',
                      )}
                    >
                      <button
                        className={cn(
                          'round-button',
                          'grid h-6.75 w-6.75 place-items-center rounded-full border border-solid border-[#dce0cd] bg-[#f6f7ed] p-0 text-[#8d9878]',
                          'hover:bg-[#e3e9d5]',
                        )}
                        aria-label="Decrease BPM"
                        onClick={() => changeTempo(settings.bpm - 5)}
                        disabled={loading || settings.bpm <= 20}
                      >
                        <Minus size={17} />
                      </button>
                      <input
                        id="bpm"
                        disabled={loading}
                        type="number"
                        min="20"
                        max="300"
                        value={tempoText}
                        onChange={(event) => setTempoText(event.target.value)}
                        onBlur={commitTempo}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                      />
                      <button
                        className={cn(
                          'round-button',
                          'grid h-6.75 w-6.75 place-items-center rounded-full border border-solid border-[#dce0cd] bg-[#f6f7ed] p-0 text-[#8d9878]',
                          'hover:bg-[#e3e9d5]',
                        )}
                        aria-label="Increase BPM"
                        onClick={() => changeTempo(settings.bpm + 5)}
                        disabled={loading || settings.bpm >= 300}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                    <div
                      className={cn(
                        'tempo-caption',
                        'mx-0 mt-1 mb-5.25 text-center text-[9px] text-[#a0a68f]',
                      )}
                    >
                      Your pace. Your progress.
                    </div>
                    <div
                      className={cn(
                        'metronome',
                        'flex items-center justify-between gap-2 text-[#a5ae93]',
                        '[&_button]:flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[9px] [&_button]:text-[#87956d]',
                        '[&_button.playing]:text-[#485b31]',
                      )}
                    >
                      <button
                        onClick={metronome.toggle}
                        aria-pressed={metronome.running}
                        className={metronome.running ? 'playing' : ''}
                      >
                        {metronome.running ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}{' '}
                        Metronome
                      </button>
                      <div
                        className={cn(
                          'beat-dots',
                          'mr-1.5 ml-auto flex gap-1.25',
                          '[&_i]:h-1.25 [&_i]:w-1.25 [&_i]:rounded-full [&_i]:bg-[#d0d7bf] [&_i]:[transition:background_0.06s]',
                          '[&_i.lit]:bg-[#5b713e] [&_i.lit]:shadow-[0_0_0_3px_#dbe4cc]',
                        )}
                        aria-label={metronome.running ? 'Metronome running' : 'Metronome stopped'}
                      >
                        {[0, 1, 2, 3].map((beat) => (
                          <i
                            key={beat}
                            className={metronome.running && metronome.beat === beat ? 'lit' : ''}
                          />
                        ))}
                      </div>
                      <Volume2 size={14} />
                    </div>
                    {metronome.audioError && (
                      <p
                        className={cn('audio-error', 'text-[10px] leading-[1.6] text-[#9c764a]')}
                        role="alert"
                      >
                        {metronome.audioError}
                      </p>
                    )}
                    <div
                      className={cn(
                        'panel-divider',
                        'mx-0 mt-6 mb-5 border-t border-solid border-t-[#dfe3d0]',
                        'wide:mx-0 wide:mt-7.25 wide:mb-6',
                      )}
                    />
                    <div
                      className={cn(
                        'control-heading',
                        'flex items-center justify-between text-[9px] tracking-[1.2px] text-[#899375]',
                        '[&_label]:font-[550]',
                        '[&>span]:text-[8px] [&>span]:tracking-[0.5px] [&>span]:text-[#a2aa90]',
                      )}
                    >
                      <label htmlFor="fret-range">FRET RANGE</label>
                      <span
                        className={cn('five-frets', 'rounded-[3px] bg-[#e4e9d8] px-1.25 py-0.75')}
                      >
                        5 frets
                      </span>
                    </div>
                    <div
                      className={cn(
                        'select-wrapper',
                        'relative mt-3.25 flex h-9.75 items-center rounded-[5px] border border-solid border-[#dce1cc] bg-[#f8f9f0] text-[#93a078]',
                        '[&>svg:first-child]:pointer-events-none [&>svg:first-child]:absolute [&>svg:first-child]:left-2.75',
                        '[&>svg:last-child]:pointer-events-none [&>svg:last-child]:absolute [&>svg:last-child]:right-2.25',
                        '[&_select]:relative [&_select]:w-full [&_select]:cursor-pointer [&_select]:appearance-none [&_select]:border-0 [&_select]:bg-transparent [&_select]:py-2.5 [&_select]:pr-6.5 [&_select]:pl-8.75 [&_select]:text-[10px] [&_select]:text-[#717e5e]',
                      )}
                    >
                      <Shuffle size={15} />
                      <select
                        id="fret-range"
                        disabled={loading}
                        value={settings.fretMode}
                        onChange={(event) => changeRange(event.target.value)}
                      >
                        <option value="random">Random position</option>
                        {Array.from({ length: 8 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Frets {i + 1}–{i + 5}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                    <p
                      className={cn(
                        'range-caption',
                        'mx-0 mt-2.5 mb-4.75 text-[9px] leading-[1.7] text-[#a0a78d]',
                        'wide:mb-6.25',
                        'narrow:text-[8px]',
                      )}
                    >
                      {settings.fretMode === 'random'
                        ? 'A fresh five-fret window on every card.'
                        : 'One position. A whole world of possibilities.'}
                    </p>
                    <StringRange
                      mode={settings.stringMode}
                      disabled={loading}
                      onChange={changeStringRange}
                    />
                    <div className="mb-5 border-t border-[#dfe3d0] pt-5">
                      <label className="flex cursor-pointer items-center gap-2 text-[10px] text-[#717e5e]">
                        <input
                          type="checkbox"
                          checked={settings.keepChords}
                          disabled={loading}
                          aria-describedby="keep-chords-description"
                          onChange={(event) =>
                            setSettings((previous) => ({
                              ...previous,
                              keepChords: event.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 shrink-0 accent-olive"
                        />
                        Keep chords when shuffling
                      </label>
                      <p
                        id="keep-chords-description"
                        className="mt-2.5 mb-0 text-[9px] leading-[1.7] text-[#a0a78d]"
                      >
                        Only fret and string ranges change. Target notes and card order stay the
                        same.
                      </p>
                    </div>
                    <div
                      className={cn(
                        'settings-footnote',
                        '-mx-5.5 my-0 flex items-center gap-1.5 border-t border-solid border-t-[#e0e4d3] bg-[#e9edde] px-5.5 py-3 text-[8px] text-[#96a180]',
                        '[&_span]:h-1 [&_span]:w-1 [&_span]:rounded-full [&_span]:bg-[#a3b08a]',
                        'compact:-mx-4.5 compact:px-4.5',
                        'narrow:-mx-3.75 narrow:px-3.75 narrow:text-[7px]',
                      )}
                    >
                      <span /> Settings apply to your whole deck.
                    </div>
                  </section>
                  <div
                    className={cn(
                      'practice-tip',
                      'mx-1 mt-6 mb-0 flex gap-2.5 text-[#96a17e]',
                      '[&_svg]:mt-px [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
                      '[&_strong]:text-[9px] [&_strong]:font-medium [&_strong]:text-[#818e69]',
                      '[&_p]:mx-0 [&_p]:mt-1.25 [&_p]:mb-0 [&_p]:text-[9px] [&_p]:leading-[1.8] [&_p]:text-[#a4ad95]',
                      'narrow:gap-1.75',
                      'narrow:[&_p]:text-[8px]',
                    )}
                  >
                    <Sparkles size={17} />
                    <div>
                      <strong>Make space for the music.</strong>
                      <p>Start slow. Stay curious. A clean phrase beats a fast one.</p>
                    </div>
                  </div>
                </aside>
              </div>
              <section
                className={cn(
                  'up-next',
                  'mt-8.75 flex items-center gap-4 rounded-[7px] border border-solid border-[#e6e8db] bg-[#f0f1e8] px-6 py-5.5',
                  '[&_.eyebrow]:text-[7px] [&_.eyebrow]:tracking-[1.4px]',
                  '[&_p]:mx-0 [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:text-[#7a8668]',
                  '[&_button]:ml-auto [&_button]:flex [&_button]:items-center [&_button]:gap-2.5 [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[9px] [&_button]:text-[#8d9a76]',
                  '[&_button:hover]:text-[#4e6638]',
                  'narrow:p-4.5',
                  'narrow:[&_button]:gap-1.5 narrow:[&_button]:text-[8px]',
                  'narrow:[&_.eyebrow]:text-[6px]',
                )}
              >
                <div
                  className={cn(
                    'up-next-icon',
                    'grid h-9.5 w-9.5 place-items-center rounded-md border border-solid border-[#dfe3d1] bg-[#f5f6ec] text-[#8d9a75]',
                  )}
                >
                  <ListMusic size={21} />
                </div>
                <div>
                  <div
                    className={cn(
                      'eyebrow',
                      '[&>span]:inline-block [&>span]:h-1.25 [&>span]:w-1.25 [&>span]:rounded-full [&>span]:bg-[#7f8e62]',
                      'flex items-center gap-1.75 text-[9px] font-[650] tracking-[1.8px] text-[#8a9279]',
                    )}
                  >
                    WAITING IN YOUR DECK
                  </div>
                  <p>
                    {cards.length
                      ? cards[(index + 1) % cards.length].exercise.title
                      : 'Sixteen exercises. A new perspective.'}
                  </p>
                </div>
                <button onClick={() => setView('library')}>
                  Explore all exercises <ArrowRight size={16} />
                </button>
              </section>
            </>
          ) : (
            <section className={'library'}>
              <div
                className={cn(
                  'library-toolbar',
                  'mb-5.75 flex items-center justify-between gap-5',
                  '[&_h2]:m-0 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2.5 [&_h2]:font-display [&_h2]:text-[17px] [&_h2]:font-semibold',
                  '[&_h2_span]:rounded-sm [&_h2_span]:bg-[#e8eddb] [&_h2_span]:px-1.5 [&_h2_span]:py-1 [&_h2_span]:text-[10px] [&_h2_span]:text-[#92a078]',
                )}
              >
                <h2>
                  All exercises <span>16</span>
                </h2>
                <label
                  className={cn(
                    'search-input',
                    'flex items-center gap-2.25 rounded-md border border-solid border-[#dfe3d2] bg-[#fbfcf6] px-3 py-2.5 text-[#a2ac91]',
                    '[&_input]:w-45 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[11px] [&_input]:text-[#657353] [&_input]:outline-none',
                    '[&_input::placeholder]:text-[#a6ad98]',
                    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#97a47f] focus-within:outline-solid',
                  )}
                >
                  <Search size={17} />
                  <input
                    placeholder="Find an exercise…"
                    aria-label="Search exercises"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              {loading && !cards.length ? (
                <div
                  className={cn(
                    'loading-state',
                    'flex min-h-115 flex-col items-center justify-center gap-3 text-center text-[#8d9c77]',
                    '[&_p]:text-[12px]',
                  )}
                >
                  <LoaderCircle className={cn('spin', 'animate-spin')} /> Loading your library…
                </div>
              ) : (
                <div
                  className={cn('library-grid', 'grid grid-cols-3 gap-4', 'compact:grid-cols-2')}
                >
                  {filtered.map((item) => (
                    <button
                      className={cn(
                        'library-card',
                        'flex min-h-58.75 flex-col rounded-lg border border-solid border-[#e0e3d4] bg-paper p-5 text-left',
                        'hover:-translate-y-0.5 hover:border-[#a4b18c] hover:bg-[#fcfdf6]',
                        '[&_h3]:mx-0 [&_h3]:mt-4.75 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[17px] [&_h3]:leading-[1.4] [&_h3]:font-semibold [&_h3]:tracking-[-0.4px]',
                        '[&_p]:mx-0 [&_p]:mt-0 [&_p]:mb-5 [&_p]:text-[10px] [&_p]:leading-[1.8] [&_p]:text-[#949e85]',
                      )}
                      key={item.exercise.id}
                      onClick={() => {
                        setIndex(
                          cards.findIndex((entry) => entry.exercise.id === item.exercise.id),
                        );
                        setView('practice');
                      }}
                    >
                      <div
                        className={cn(
                          'library-card-top',
                          'flex items-center justify-between text-[#a1af89]',
                        )}
                      >
                        <span
                          className={cn(
                            'category-pill',
                            'inline-flex items-center gap-1.5 rounded-sm bg-[#edf0e4] px-2.25 py-1.25 text-[9px] font-[550] text-[#7b875f]',
                            '[&>span]:h-1 [&>span]:w-1 [&>span]:rounded-full [&>span]:bg-[#94a477]',
                          )}
                        >
                          {item.exercise.category}
                        </span>
                        <ArrowRight size={17} />
                      </div>
                      <h3>{item.exercise.title}</h3>
                      <p>{item.exercise.guidance}</p>
                      <div
                        className={cn(
                          'library-card-bottom',
                          'mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-solid border-t-[#eceddf] pt-3 text-[9px] text-[#9ba78a]',
                        )}
                      >
                        <span>{item.bpm} BPM</span>
                        <span>
                          Frets {item.fretStart}–{item.fretEnd}
                        </span>
                        <span>
                          Strings {item.stringStart}–{item.stringEnd}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!loading && !filtered.length && (
                <div
                  className={cn(
                    'empty-library',
                    'px-5 py-18.75 text-center text-[#92a179]',
                    '[&_h3]:text-[19px] [&_h3]:font-medium',
                    '[&_p]:text-[12px]',
                  )}
                >
                  <Search size={25} />
                  <h3>{cards.length ? 'No exercises found' : 'Your library couldn’t load'}</h3>
                  <p>
                    {cards.length
                      ? 'Try another name or category.'
                      : 'Use Try again above to reconnect to your practice deck.'}
                  </p>
                  {cards.length > 0 && (
                    <button
                      className={cn(
                        'text-button',
                        'border-0 bg-transparent p-3 text-[10px] text-[#839368]',
                      )}
                      onClick={() => setQuery('')}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
          <footer
            className={cn(
              'page-footer',
              'flex items-center justify-between px-0 pt-7 pb-6 text-[8px] text-[#b2b7a4]',
              '[&>span:last-child]:flex [&>span:last-child]:items-center [&>span:last-child]:gap-2.75 [&>span:last-child]:text-[7px] [&>span:last-child]:tracking-[1.5px]',
            )}
          >
            <span>Less overthinking. More playing.</span>
            <span>
              GUITAR PRACTICE{' '}
              <span className={cn('footer-dot', 'text-[16px] text-[#9ba886]')}>✳</span>
            </span>
          </footer>
        </div>
      </main>

      <dialog
        ref={dialog}
        className={cn(
          'help-dialog',
          'w-[min(520px,calc(100%-32px))] rounded-xl border border-solid border-[#dfe3d2] bg-paper p-0 text-ink shadow-[0_20px_100px_#27321c30]',
          'backdrop:bg-[#2b33225c] backdrop:[backdrop-filter:blur(4px)]',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div
          className={cn(
            'dialog-inner',
            'relative p-9.25',
            '[&>.eyebrow]:pr-3.75 [&>.eyebrow]:text-[8px] [&>.eyebrow]:tracking-[1px]',
            '[&_h2]:mx-0 [&_h2]:my-3.75 [&_h2]:font-display [&_h2]:text-[29px] [&_h2]:tracking-[-1px]',
            '[&>p]:text-[12px] [&>p]:leading-[1.9] [&>p]:text-[#8c947e]',
            '[&_li]:mb-3.25 [&_li]:pl-1.5 [&_li]:text-[12px] [&_li]:leading-[1.9] [&_li]:text-[#8c947e]',
            '[&_ol]:mx-0 [&_ol]:mt-5.5 [&_ol]:mb-7 [&_ol]:pl-4.5',
            '[&_li_strong]:font-semibold [&_li_strong]:text-[#667652]',
          )}
        >
          <button
            className={cn(
              'dialog-close icon-button',
              'absolute top-3.75 right-3.75 grid h-7.25 w-7.25 place-items-center rounded-[5px] border border-solid border-[#dfe2d4] bg-transparent text-[#929b82]',
              'hover:bg-[#eaeedf]',
            )}
            onClick={() => dialog.current?.close()}
            aria-label="Close help"
          >
            <X size={19} />
          </button>
          <div
            className={cn(
              'eyebrow',
              '[&>span]:inline-block [&>span]:h-1.25 [&>span]:w-1.25 [&>span]:rounded-full [&>span]:bg-[#7f8e62]',
              'flex items-center gap-1.75 text-[9px] font-[650] tracking-[1.8px] text-[#8a9279]',
            )}
          >
            YOUR DAILY PRACTICE, SIMPLIFIED
          </div>
          <h2>Pick up. Shuffle. Play.</h2>
          <p>
            Each card combines two distinct chords with one exercise from your library. Shuffle to
            refresh the chord pairings, target notes, exercise order, and random fret and string
            positions. Enable “Keep chords when shuffling” to change only the fret and string
            ranges, keeping your chords, target notes, card order, and current card.
          </p>
          <ol>
            <li>
              <strong>Set your pace.</strong> Tempo starts at 100 BPM. Type a value from 20–300 or
              use the ± buttons. The optional metronome gives you an audible four-beat pulse.
            </li>
            <li>
              <strong>Find your position.</strong> Every range contains exactly five frets, within
              frets 1–12. Choose random or lock in a position for the whole deck. Select three
              consecutive strings: 1–3, 2–4, 3–5, or 4–6. Shuffle Deck always switches both ranges
              to Random position and picks fresh fret and string windows for every card.
            </li>
            <li>
              <strong>Follow the card.</strong> Apply the library exercise to the two chords shown.
              Click either chord to focus on it and choose a chord tone from its Target note
              selector. Each card remembers your choices while you browse; shuffling randomizes both
              targets unless “Keep chords when shuffling” is enabled. Scale exercises also receive a
              chord pair. The small numbers preserve the original annotations; a dash means none was
              supplied.
            </li>
            <li>
              <strong>Keep moving.</strong> Use the arrows to browse at your own pace, or shuffle
              for a fresh combination. Tempo and range preferences stay saved in this browser.
            </li>
          </ol>
          <button
            className={cn(
              'primary-button',
              'flex items-center justify-center gap-2.25 rounded-[5px] border border-solid border-olive bg-olive px-4.75 py-3 text-[11px] font-medium text-[#fffdf3] shadow-[0_2px_3px_#4852390c]',
              'hover:bg-[#435032]',
            )}
            onClick={() => dialog.current?.close()}
          >
            Let’s play <ArrowRight size={16} />
          </button>
        </div>
      </dialog>
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Chord } from '@/lib/practice';

type ChordTargetProps = {
  chord: Chord;
  id: string;
  selected: boolean;
  targetNote: string;
  disabled: boolean;
  onSelectChord: () => void;
  onTargetChange: (note: string) => void;
};

export function ChordTarget({
  chord,
  id,
  selected,
  targetNote,
  disabled,
  onSelectChord,
  onTargetChange,
}: ChordTargetProps) {
  return (
    <div
      data-active={selected}
      className={cn(
        'min-w-0 rounded-[5px] border border-solid border-[#eaeade] bg-[#fafaf5] p-3 text-[#818970]',
        'data-[active=true]:border-[#acb692] data-[active=true]:bg-[#e8ecdd] data-[active=true]:text-[#53623d]',
        'hover:border-[#aeb895]',
      )}
    >
      <button
        type="button"
        title={chord.note || `Focus on ${chord.name}`}
        onClick={onSelectChord}
        aria-pressed={selected}
        disabled={disabled}
        className="chord flex min-h-16 w-full flex-col items-center justify-center gap-2.5 border-0 bg-transparent p-0 text-inherit aria-pressed:[&>small]:text-[#809263]"
      >
        <span
          className={cn(
            'font-display text-[24px] tracking-[-0.5px] whitespace-nowrap',
            chord.emphasized ? 'font-bold' : 'font-medium',
          )}
        >
          {chord.name}
        </span>
        <small className="text-[9px] text-[#b0b39e]" title="Original exercise annotation">
          {chord.annotation || '—'}
        </small>
      </button>

      <label
        htmlFor={id}
        className="mt-3 flex flex-col gap-1.5 text-[9px] tracking-[0.8px] text-[#879477]"
      >
        <span>TARGET NOTE</span>
        <span className="relative block">
          <select
            id={id}
            aria-label={`Target note for ${chord.name}`}
            disabled={disabled}
            value={targetNote}
            onChange={(event) => onTargetChange(event.target.value)}
            className="w-full min-w-0 appearance-none rounded-sm border border-solid border-[#dce1cc] bg-paper py-2 pr-6 pl-2 text-[12px] font-medium tracking-normal text-[#53623d] disabled:opacity-50"
          >
            {chord.targetNoteOptions.map((note) => (
              <option key={note.name} value={note.name}>
                {note.name} · {note.degree === '1' ? 'Root' : note.degree}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
          />
        </span>
      </label>
    </div>
  );
}

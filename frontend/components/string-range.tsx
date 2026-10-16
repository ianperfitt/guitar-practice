import { ChevronDown, ListMusic, Shuffle } from 'lucide-react';

type StringRangeProps = {
  mode: string;
  disabled: boolean;
  onChange: (mode: string) => void;
};

export function StringRange({ mode, disabled, onChange }: StringRangeProps) {
  const Icon = mode === 'random' ? Shuffle : ListMusic;
  return (
    <div className="mb-5 border-t border-[#dfe3d0] pt-5">
      <div className="flex items-center justify-between text-[9px] tracking-[1.2px] text-[#899375]">
        <label htmlFor="string-range" className="font-[550]">
          STRING RANGE
        </label>
        <span className="rounded-[3px] bg-[#e4e9d8] px-1.25 py-0.75 text-[8px] tracking-[0.5px] text-[#a2aa90]">
          3 strings
        </span>
      </div>
      <div className="relative mt-3.25 flex h-9.75 items-center rounded-[5px] border border-[#dce1cc] bg-[#f8f9f0] text-[#93a078]">
        <Icon size={15} className="pointer-events-none absolute left-2.75" />
        <select
          id="string-range"
          disabled={disabled}
          value={mode}
          onChange={(event) => onChange(event.target.value)}
          className="relative w-full cursor-pointer appearance-none border-0 bg-transparent py-2.5 pr-6.5 pl-8.75 text-[10px] text-[#717e5e]"
        >
          <option value="random">Random position</option>
          {[1, 2, 3, 4].map((string) => (
            <option key={string} value={string}>
              Strings {string}–{string + 2}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.25" />
      </div>
      <p className="mt-2.5 mb-0 text-[9px] leading-[1.7] text-[#a0a78d]">
        {mode === 'random'
          ? 'A fresh three-string window on every card.'
          : 'Three neighboring strings. String 1 is at the bottom.'}
      </p>
    </div>
  );
}

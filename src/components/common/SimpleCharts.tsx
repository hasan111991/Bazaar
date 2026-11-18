import React from 'react';

interface BarDatum {
  label: string;
  value: number;
  subLabel?: string;
}

export const SimpleBarChart: React.FC<{
  data: BarDatum[];
  height?: number;
  barColor?: string;
  valuePrefix?: string;
}> = ({ data, height = 160, barColor = '#065f46', valuePrefix = '' }) => {
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((item, i) => {
          const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="relative w-full flex-1 flex items-end justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition text-[10px] font-semibold text-slate-700 tabular-nums absolute -top-5 whitespace-nowrap">
                  {valuePrefix}
                  {item.value.toLocaleString('en-PK')}
                </span>
                <div
                  className="w-full max-w-[38px] rounded-t-md transition-all duration-300 group-hover:opacity-85"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <span className="mt-2 text-[11px] font-medium text-slate-500 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DistributionMeters: React.FC<{
  items: { label: string; count: number; color?: string }[];
}> = ({ items }) => {
  const total = Math.max(1, items.reduce((s, it) => s + it.count, 0));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {item.count} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color || '#065f46',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

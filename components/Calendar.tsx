'use client';

import { useMemo, useState } from 'react';

type CalendarProps = {
  selectedDate?: string; // YYYY-MM-DD
  onSelect?: (date: string) => void;
  highlightDates?: string[]; // YYYY-MM-DD
  title?: string;
};

function formatDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function Calendar({ selectedDate, onSelect, highlightDates = [], title }: CalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const initialMonth = useMemo(() => {
    if (!selectedDate) return new Date(today);
    const [year, month, day] = selectedDate.split('-').map(Number);
    if (!year || !month || !day) return new Date(today);
    return new Date(year, month - 1, 1);
  }, [selectedDate, today]);

  const [month, setMonth] = useState<Date>(initialMonth);

  const highlightSet = useMemo(() => new Set(highlightDates), [highlightDates]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const startWeekday = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, monthIndex, day));
  }

  const selectedKey = selectedDate || '';

  const goToPrevMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="w-full rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          {title && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
          )}
          <p className="font-headline text-sm font-semibold text-foreground">
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground hover:bg-muted"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground hover:bg-muted"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />;
          }

          const key = formatDateKey(day);
          const isToday = key === formatDateKey(today);
          const isSelected = key === selectedKey;
          const isHighlighted = highlightSet.has(key);

          const isPast = day < today;

          let base =
            'relative flex h-9 w-9 items-center justify-center rounded-full text-xs transition-colors';

          if (isPast) {
            base += ' text-muted-foreground/60 cursor-not-allowed';
          } else if (isSelected) {
            base += ' bg-primary text-primary-foreground shadow cursor-pointer';
          } else if (isHighlighted) {
            base +=
              ' bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground cursor-pointer';
          } else if (isToday) {
            base +=
              ' border border-primary/40 text-primary hover:bg-primary/5 cursor-pointer';
          } else {
            base +=
              ' text-foreground hover:bg-muted cursor-pointer';
          }

          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => {
                if (isPast) return;
                onSelect?.(key);
              }}
              className={base}
            >
              <span>{day.getDate()}</span>
              {isHighlighted && !isSelected && (
                <span className="pointer-events-none absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


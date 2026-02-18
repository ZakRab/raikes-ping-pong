import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import AvailabilityLegend from "./AvailabilityLegend";
import { useIsMobile } from "../../hooks/useIsMobile";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 8;
const END_HOUR = 22;
const SLOT_MINUTES = 30;

function generateTimeSlots() {
  const slots: string[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let min = 0; min < 60; min += SLOT_MINUTES) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(min).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatTime(time: string) {
  const [hh, mm] = time.split(":");
  const hour = parseInt(hh);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${mm} ${ampm}`;
}

const PREF_COLORS: Record<number, string> = {
  0: "bg-raikes-gray",
  1: "bg-green-400",
};

export default function AvailabilityGrid({
  slots,
  onChange,
}: {
  slots: Record<string, number>;
  onChange: (slots: Record<string, number>) => void;
}) {
  const isMobile = useIsMobile();
  const [selectedDay, setSelectedDay] = useState(0);
  const [dragPref, setDragPref] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const getSlotKey = (day: string, time: string) => `${day}-${time}`;

  const cyclePref = (current: number) => (current === 0 ? 1 : 0);

  const handleMouseDown = useCallback(
    (day: string, time: string) => {
      const key = getSlotKey(day, time);
      const current = slots[key] ?? 0;
      const next = cyclePref(current);
      setDragPref(next);
      setIsDragging(true);
      const updated = { ...slots };
      if (next === 0) {
        delete updated[key];
      } else {
        updated[key] = next;
      }
      onChange(updated);
    },
    [slots, onChange]
  );

  const handleMouseEnter = useCallback(
    (day: string, time: string) => {
      if (!isDragging || dragPref === null) return;
      const key = getSlotKey(day, time);
      const updated = { ...slots };
      if (dragPref === 0) {
        delete updated[key];
      } else {
        updated[key] = dragPref;
      }
      onChange(updated);
    },
    [isDragging, dragPref, slots, onChange]
  );

  // Touch drag support for mobile
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || dragPref === null) return;
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!el?.dataset.slotKey) return;
      const key = el.dataset.slotKey;
      const updated = { ...slots };
      if (dragPref === 0) {
        delete updated[key];
      } else {
        updated[key] = dragPref;
      }
      onChange(updated);
    },
    [isDragging, dragPref, slots, onChange]
  );

  const handleTouchStart = useCallback(
    (day: string, time: string) => {
      const key = getSlotKey(day, time);
      const current = slots[key] ?? 0;
      const next = cyclePref(current);
      setDragPref(next);
      setIsDragging(true);
      const updated = { ...slots };
      if (next === 0) {
        delete updated[key];
      } else {
        updated[key] = next;
      }
      onChange(updated);
    },
    [slots, onChange]
  );

  useEffect(() => {
    const handleUp = () => {
      setIsDragging(false);
      setDragPref(null);
    };
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, []);

  if (isMobile) {
    const day = DAYS[selectedDay];
    return (
      <div>
        <div className="mb-4">
          <AvailabilityLegend />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-raikes-black/40">
            Tap to toggle. Drag to paint.
          </p>
          {Object.keys(slots).length > 0 && (
            <button
              onClick={() => onChange({})}
              className="rounded-md px-3 py-1 text-xs font-medium text-raikes-black/40 transition-colors hover:bg-raikes-gray hover:text-raikes-black"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Day selector tabs */}
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {DAY_LABELS.map((label, idx) => (
            <button
              key={label}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                idx === selectedDay
                  ? "bg-raikes-red text-white"
                  : "bg-raikes-gray text-raikes-black/60 hover:bg-raikes-gray-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Single column of time slots */}
        <div
          ref={gridRef}
          className="select-none"
          onTouchMove={handleTouchMove}
          onDragStart={(e) => e.preventDefault()}
        >
          {TIME_SLOTS.map((time) => {
            const key = getSlotKey(day, time);
            const pref = slots[key] ?? 0;
            return (
              <div
                key={key}
                data-slot-key={key}
                className={`flex cursor-pointer items-center border-b border-white/60 px-3 transition-colors ${PREF_COLORS[pref]}`}
                style={{ height: 44 }}
                onMouseDown={() => handleMouseDown(day, time)}
                onMouseEnter={() => handleMouseEnter(day, time)}
                onTouchStart={() => handleTouchStart(day, time)}
              >
                <span className="text-sm text-raikes-black/60">
                  {formatTime(time)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: original 7-column grid
  return (
    <div>
      <div className="mb-4">
        <AvailabilityLegend />
      </div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-raikes-black/40">
          Click to cycle preference level. Click and drag to paint multiple slots.
        </p>
        {Object.keys(slots).length > 0 && (
          <button
            onClick={() => onChange({})}
            className="rounded-md px-3 py-1 text-xs font-medium text-raikes-black/40 transition-colors hover:bg-raikes-gray hover:text-raikes-black"
          >
            Clear All
          </button>
        )}
      </div>
      <div
        ref={gridRef}
        className="overflow-x-auto select-none"
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="inline-grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
          {/* Header row */}
          <div />
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-1 pb-1 text-center text-xs font-medium text-raikes-black/60"
            >
              {label}
            </div>
          ))}

          {/* Time rows */}
          {TIME_SLOTS.map((time) => (
            <Fragment key={time}>
              <div
                className="flex items-center pr-2 text-right text-[10px] text-raikes-black/40"
                style={{ height: 24 }}
              >
                {time.endsWith(":00") ? formatTime(time) : ""}
              </div>
              {DAYS.map((day) => {
                const key = getSlotKey(day, time);
                const pref = slots[key] ?? 0;
                return (
                  <div
                    key={key}
                    className={`cursor-pointer border border-white/60 transition-colors ${PREF_COLORS[pref]}`}
                    style={{ height: 24, minWidth: 48 }}
                    onMouseDown={() => handleMouseDown(day, time)}
                    onMouseEnter={() => handleMouseEnter(day, time)}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

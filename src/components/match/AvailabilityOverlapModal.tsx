import { Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

export default function AvailabilityOverlapModal({
  player1Id,
  player2Id,
  player1Name,
  player2Name,
}: {
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  player1Name: string;
  player2Name: string;
}) {
  const data = useQuery(api.availability.getAvailabilityForPlayers, {
    player1Id,
    player2Id,
  });

  if (data === undefined) {
    return <p className="py-2 text-center text-xs text-raikes-black/40">Loading availability...</p>;
  }

  const { player1Slots, player2Slots, overlapSlots } = data;

  const getSlotColor = (day: string, time: string) => {
    const key = `${day}-${time}`;
    const p1 = (player1Slots[key] ?? 0) > 0;
    const p2 = (player2Slots[key] ?? 0) > 0;
    if (p1 && p2) return "bg-green-400"; // overlap
    if (p1) return "bg-blue-200"; // player 1 only
    if (p2) return "bg-yellow-200"; // player 2 only
    return "bg-raikes-gray"; // neither
  };

  const overlapCount = Object.keys(overlapSlots).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-200 border border-blue-300" />
          <span className="text-xs text-raikes-black/60">{player1Name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-yellow-200 border border-yellow-300" />
          <span className="text-xs text-raikes-black/60">{player2Name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-400 border border-green-500" />
          <span className="text-xs text-raikes-black/60">
            Both available ({overlapCount} slots)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto select-none">
        <div
          className="inline-grid"
          style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}
        >
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
                style={{ height: 20 }}
              >
                {time.endsWith(":00") ? formatTime(time) : ""}
              </div>
              {DAYS.map((day) => (
                <div
                  key={`${day}-${time}`}
                  className={`border border-white/60 ${getSlotColor(day, time)}`}
                  style={{ height: 20, minWidth: 40 }}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

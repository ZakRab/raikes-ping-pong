import type { Id } from "./_generated/dataModel";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const START_HOUR = 8;
export const END_HOUR = 22;
export const SLOT_MINUTES = 30;

export function generateAllSlotKeys(): string[] {
  const keys: string[] = [];
  for (const day of DAYS) {
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const hh = String(hour).padStart(2, "0");
        const mm = String(min).padStart(2, "0");
        keys.push(`${day}-${hh}:${mm}`);
      }
    }
  }
  return keys;
}

type MatchInput = {
  _id: Id<"matches">;
  player1Id: Id<"users">;
  player2Id: Id<"users">;
};

type ScheduleResult = {
  matchId: Id<"matches">;
  scheduledDay: string;
  scheduledTime: string;
};

// Convert a slot key to a linear index (minutes from start of week)
// Used to measure distance between slots for spacing
function slotToMinutes(slot: string): number {
  const [day, time] = slot.split("-");
  const dayIdx = DAYS.indexOf(day as (typeof DAYS)[number]);
  const [hh, mm] = time.split(":").map(Number);
  return dayIdx * 24 * 60 + hh * 60 + mm;
}

// Minimum distance in minutes between a player's assigned slots
// to get the spacing bonus. Slots closer than this get penalized.
function spacingScore(
  slot: string,
  assignedSlots: Set<string>
): number {
  if (assignedSlots.size === 0) return 0;

  const slotMin = slotToMinutes(slot);
  let minDist = Infinity;
  for (const assigned of assignedSlots) {
    const dist = Math.abs(slotToMinutes(assigned) - slotMin);
    if (dist < minDist) minDist = dist;
  }

  // Normalize: full week = 7*24*60 = 10080 min
  // Return a bonus 0-3 based on how far from other games.
  // Max bonus at 24h+ apart, linearly decreasing to 0 at same time.
  const DAY_MINUTES = 24 * 60;
  return Math.min(minDist / DAY_MINUTES, 1) * 3;
}

type ExistingMatch = {
  _id: Id<"matches">;
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  scheduledDay?: string;
  scheduledTime?: string;
  status: string;
};

export function autoScheduleMatches(
  matches: MatchInput[],
  availabilityMap: Map<string, Record<string, number>>,
  allWeekMatches?: ExistingMatch[]
): ScheduleResult[] {
  const allSlots = generateAllSlotKeys();
  const results: ScheduleResult[] = [];

  // Pre-populate occupied slots from already-scheduled matches
  const tableSlots = new Set<string>();
  const assignedSlots = new Map<string, Set<string>>();
  const getAssigned = (playerId: string) => {
    if (!assignedSlots.has(playerId)) assignedSlots.set(playerId, new Set());
    return assignedSlots.get(playerId)!;
  };

  if (allWeekMatches) {
    for (const m of allWeekMatches) {
      if (m.scheduledDay && m.scheduledTime) {
        const slot = `${m.scheduledDay}-${m.scheduledTime}`;
        tableSlots.add(slot);
        getAssigned(m.player1Id).add(slot);
        getAssigned(m.player2Id).add(slot);
      }
    }
  }

  // For each match, compute candidate slots with base preference scores
  const matchCandidates = matches.map((match) => {
    const p1Avail = availabilityMap.get(match.player1Id) ?? {};
    const p2Avail = availabilityMap.get(match.player2Id) ?? {};

    const candidates: { slot: string; baseScore: number }[] = [];
    for (const slot of allSlots) {
      const p1Pref = p1Avail[slot] ?? 0;
      const p2Pref = p2Avail[slot] ?? 0;
      if (p1Pref > 0 && p2Pref > 0) {
        candidates.push({ slot, baseScore: p1Pref + p2Pref });
      }
    }

    return { match, candidates };
  });

  // Sort matches by fewest candidates first (most-constrained-first)
  matchCandidates.sort((a, b) => a.candidates.length - b.candidates.length);

  for (const { match, candidates } of matchCandidates) {
    const p1Assigned = getAssigned(match.player1Id);
    const p2Assigned = getAssigned(match.player2Id);

    // Score each candidate: base preference + spacing bonus for both players
    // This spreads games across the week while still respecting preferences
    let best: { slot: string; totalScore: number } | null = null;
    for (const { slot, baseScore } of candidates) {
      // Table must be free + neither player already booked
      if (tableSlots.has(slot)) continue;
      if (p1Assigned.has(slot) || p2Assigned.has(slot)) continue;

      const totalScore =
        baseScore +
        spacingScore(slot, p1Assigned) +
        spacingScore(slot, p2Assigned);

      if (!best || totalScore > best.totalScore) {
        best = { slot, totalScore };
      }
    }

    if (best) {
      const [day, time] = best.slot.split("-");
      results.push({
        matchId: match._id,
        scheduledDay: day,
        scheduledTime: time,
      });
      tableSlots.add(best.slot);
      p1Assigned.add(best.slot);
      p2Assigned.add(best.slot);
    }
  }

  return results;
}

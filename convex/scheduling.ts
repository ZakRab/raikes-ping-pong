import type { Id } from "./_generated/dataModel";

export type MatchAssignment = {
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  weekNumber: number;
};

export function generateRoundRobinSchedule(
  playerIds: Id<"users">[],
  totalWeeks: number
): MatchAssignment[] {
  if (playerIds.length < 2) return [];

  const players = [...playerIds];
  const hasBye = players.length % 2 !== 0;
  const BYE = "BYE" as Id<"users">;
  if (hasBye) {
    players.push(BYE);
  }

  const n = players.length;
  const totalRounds = n - 1;
  const roundsPerWeek = Math.max(1, Math.ceil(totalRounds / totalWeeks));

  const rounds: Array<Array<[Id<"users">, Id<"users">]>> = [];

  const fixed = players[0];
  const rotating = players.slice(1);

  for (let round = 0; round < totalRounds; round++) {
    const pairings: Array<[Id<"users">, Id<"users">]> = [];
    const current = [fixed, ...rotating];

    for (let i = 0; i < n / 2; i++) {
      const p1 = current[i];
      const p2 = current[n - 1 - i];
      if (p1 !== BYE && p2 !== BYE) {
        pairings.push([p1, p2]);
      }
    }

    rounds.push(pairings);

    // Rotate: move last element to front
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  const assignments: MatchAssignment[] = [];
  for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
    const weekNumber = Math.min(
      Math.floor(roundIdx / roundsPerWeek) + 1,
      totalWeeks
    );
    for (const [p1, p2] of rounds[roundIdx]) {
      assignments.push({
        player1Id: p1,
        player2Id: p2,
        weekNumber,
      });
    }
  }

  return assignments;
}

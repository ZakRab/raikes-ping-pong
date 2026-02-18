export default function RulesContent() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          Match Format
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          Best of 5 games. Each game is played to 11 points, win by 2.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          Serving
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          Standard table tennis serving rules apply. There are no double faults
          — a let (net serve) is simply replayed.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          Playing Environment
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          There is no "terrain" rule. If the ball hits the ceiling, it is out
          and the point goes to the other player.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          League Priority
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          League matches always have precedence over casual play. If a table is
          needed for a scheduled league match, casual players should yield.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          Scheduling
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          Set your weekly availability in the Availability tab. Matches are
          auto-scheduled based on overlapping free times. If your match shows
          "Time TBD," it means there was no overlap — use the "View Availability"
          button to see each other's schedules, then hit "Reschedule" to pick a
          time that works. You can also reschedule any auto-assigned time if
          something comes up. Matches should be completed within the week they
          are scheduled.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
          Reporting
        </h3>
        <p className="mt-2 text-sm text-raikes-black/70">
          After your match, hit "Report Result" on the match card and enter the
          score. Both players will get a DM confirmation. Both players are
          responsible for ensuring results are recorded promptly.
        </p>
      </section>
    </div>
  );
}

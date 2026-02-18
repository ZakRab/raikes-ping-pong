const LEVELS = [
  { value: 0, label: "Unavailable", color: "bg-raikes-gray" },
  { value: 1, label: "Available", color: "bg-green-400" },
];

export default function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {LEVELS.map((l) => (
        <div key={l.value} className="flex items-center gap-1.5">
          <div className={`h-4 w-4 rounded ${l.color} border border-raikes-gray-dark`} />
          <span className="text-xs text-raikes-black/60">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

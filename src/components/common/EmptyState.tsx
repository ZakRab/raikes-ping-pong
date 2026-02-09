export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-12 text-center">
      <h3 className="text-lg font-medium text-raikes-black">{title}</h3>
      <p className="mt-1 text-sm text-raikes-black/50">{description}</p>
    </div>
  );
}

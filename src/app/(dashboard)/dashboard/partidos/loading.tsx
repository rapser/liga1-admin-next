export default function PartidosLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-32 bg-muted rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
}

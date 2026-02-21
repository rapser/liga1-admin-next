export default function NoticiasLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-28 bg-muted rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

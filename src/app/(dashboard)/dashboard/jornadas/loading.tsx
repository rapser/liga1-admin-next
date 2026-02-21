export default function JornadasLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 bg-muted rounded-md" />
      <div className="h-12 w-full max-w-md bg-muted rounded-md" />
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

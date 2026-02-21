export default function ConfiguracionLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-36 bg-muted rounded-md" />
      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

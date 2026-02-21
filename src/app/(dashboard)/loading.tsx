/**
 * Loading UI del dashboard - skeleton que respeta la estructura del panel
 * (sidebar + área de contenido). Se muestra mientras carga cualquier página del dashboard.
 */

export default function DashboardLoading() {
  return (
    <div className="min-h-[calc(100vh-5rem)] p-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

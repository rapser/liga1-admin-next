/**
 * Botón para disparar manualmente el refresco de clima de las sedes.
 * Llama a POST /api/weather/refresh con la cookie de sesión de admin.
 * El mismo endpoint lo ejecuta Vercel Cron de forma automática (ver vercel.json).
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CloudSun, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshSummary {
  ok?: boolean;
  actualizados?: number;
  sinSede?: number;
  fueraDeHorizonte?: number;
  errores?: number;
  error?: string;
  details?: string;
}

export function WeatherRefreshButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weather/refresh", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as RefreshSummary;

      if (!res.ok || data.ok !== true) {
        toast.error("No se pudo actualizar el clima", {
          description: data.error ?? data.details ?? `HTTP ${res.status}`,
        });
        return;
      }

      const partes = [`${data.actualizados ?? 0} partido(s) actualizados`];
      if (data.sinSede) partes.push(`${data.sinSede} sin sede`);
      if (data.fueraDeHorizonte) partes.push(`${data.fueraDeHorizonte} fuera de rango`);
      if (data.errores) partes.push(`${data.errores} con error`);

      toast.success("Clima actualizado", { description: partes.join(" · ") });
    } catch (error) {
      toast.error("No se pudo actualizar el clima", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CloudSun className="h-4 w-4" />
      )}
      {loading ? "Actualizando…" : "Actualizar clima"}
    </Button>
  );
}

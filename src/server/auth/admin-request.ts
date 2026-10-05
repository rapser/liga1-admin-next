/**
 * Autorización de las rutas API de administración:
 * Bearer `CRON_SECRET` (scripts/cron) o cookie de sesión de un admin del panel.
 */

import { NextRequest } from "next/server";
import { adminAuth } from "@/core/config/firebase-admin";

const SESSION_COOKIE_NAME = "__session";

export async function isAuthorizedAdminRequest(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return false;

  try {
    await adminAuth.verifySessionCookie(session, true);
    return true;
  } catch {
    return false;
  }
}

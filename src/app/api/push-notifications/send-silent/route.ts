/**
 * API Route para enviar push notifications silenciosas (solo data, sin notification)
 * POST /api/push-notifications/send-silent
 *
 * Usado para score updates que no deben mostrar banner pero deben despertar la app
 */

import { NextRequest, NextResponse } from "next/server";
import { messaging } from "@/core/config/firebase-admin";
import { type Message } from "firebase-admin/messaging";

interface SendSilentNotificationRequest {
  topic: string;
  data: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendSilentNotificationRequest = await request.json();
    const { topic, data } = body;

    // Validar que el topic esté presente
    if (!topic || topic.trim() === "") {
      console.error("❌ Topic vacío o inválido:", topic);
      return NextResponse.json(
        { error: "El topic es requerido y no puede estar vacío" },
        { status: 400 },
      );
    }

    // Validar que los datos estén presentes
    if (!data || Object.keys(data).length === 0) {
      console.error("❌ Data vacío:", data);
      return NextResponse.json(
        { error: "Los datos son requeridos" },
        { status: 400 },
      );
    }

    // Asegurar que todos los valores sean strings
    const dataPayload: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        dataPayload[key] = String(value);
      }
    });

    // Construir el mensaje de FCM
    // IMPORTANTE: Solo usa 'data', NO 'notification' para que sea silencioso
    const message: Message = {
      topic,
      data: dataPayload,
      apns: {
        headers: {
          // Requerido para silent push en iOS
          "apns-push-type": "background",
          "apns-priority": "5",
        },
        payload: {
          aps: {
            "content-available": 1, // Permite despertar la app en background
          },
        },
      },
      android: {
        priority: "high", // Alta prioridad para Android
      },
    };

    // Enviar la notificación
    try {
      const response = await messaging.send(message);

      console.log("✅ Notificación silenciosa enviada:", {
        topic,
        type: data.type,
        event_id: data.event_id,
        messageId: response,
      });

      return NextResponse.json({
        success: true,
        messageId: response,
        topic,
        type: data.type,
        event_id: data.event_id,
      });
    } catch (sendError: unknown) {
      const sendErrMsg =
        sendError instanceof Error ? sendError.message : String(sendError);
      console.error("❌ Error al enviar mensaje FCM silencioso:", sendErrMsg);
      throw sendError;
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as Record<string, unknown>)?.code as
      | string
      | undefined;

    console.error("❌ Error al enviar notificación push silenciosa:", errMsg);

    return NextResponse.json(
      {
        error: "Error al enviar la notificación silenciosa",
        details: errMsg,
        code: errCode,
      },
      { status: 500 },
    );
  }
}

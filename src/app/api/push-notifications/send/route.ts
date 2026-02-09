/**
 * API Route para enviar push notifications
 * POST /api/push-notifications/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { messaging } from '@/core/config/firebase-admin';
import { type TopicMessage } from 'firebase-admin/messaging';
import { getTeamTopic, GENERAL_TOPIC, NotificationEventType } from '@/core/config/fcm-topics';
import { getTeamFullName } from '@/core/config/firestore-constants';

interface SendNotificationRequest {
  topic: string;
  title: string;
  body: string;
  eventType: NotificationEventType;
  data?: Record<string, string>;
  imageUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const { topic, title, body: messageBody, eventType, data = {}, imageUrl } = body;

    // Validar que el topic esté presente
    if (!topic || topic.trim() === '') {
      console.error('❌ Topic vacío o inválido:', topic);
      return NextResponse.json(
        { error: 'El topic es requerido y no puede estar vacío' },
        { status: 400 }
      );
    }

    // Validar formato del topic (solo team_ o GENERAL_TOPIC son válidos)

    // Validar que el título y el cuerpo estén presentes
    if (!title || !messageBody || title.trim() === '' || messageBody.trim() === '') {
      console.error('❌ Título o cuerpo vacíos:', { title, body: messageBody });
      return NextResponse.json(
        { error: 'El título y el cuerpo son requeridos y no pueden estar vacíos' },
        { status: 400 }
      );
    }

    // Preparar datos del payload (asegurar que todos sean strings)
    const dataPayload: Record<string, string> = {
      event_type: eventType,
    };
    
    // Agregar todos los datos adicionales como strings
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        dataPayload[key] = String(value);
      }
    });

    // Construir el mensaje de FCM
    // IMPORTANTE: Para iOS, el formato debe ser correcto
    const message: TopicMessage = {
      topic,
      notification: {
        title: title.substring(0, 50), // Limitar título a 50 caracteres
        body: messageBody.substring(0, 150), // Limitar cuerpo a 150 caracteres
      },
      data: dataPayload,
      apns: {
        payload: {
          aps: {
            alert: {
              title: title.substring(0, 50),
              body: messageBody.substring(0, 150),
            },
            sound: 'default',
            badge: 1,
            'mutable-content': 1,
            'content-available': 1,
          },
        },
        ...(imageUrl && {
          fcm_options: {
            image: imageUrl,
          },
        }),
      },
    };

    // Enviar la notificación
    try {
      const response = await messaging.send(message);

      return NextResponse.json({
        success: true,
        messageId: response,
        topic,
        eventType,
      });
    } catch (sendError: unknown) {
      const sendErrMsg = sendError instanceof Error ? sendError.message : String(sendError);
      console.error('❌ Error al enviar mensaje FCM:', sendErrMsg);
      throw sendError;
    }

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as Record<string, unknown>)?.code as string | undefined;

    console.error('❌ Error al enviar notificación push:', errMsg);

    return NextResponse.json(
      {
        error: 'Error al enviar la notificación',
        details: errMsg,
        code: errCode,
      },
      { status: 500 }
    );
  }
}

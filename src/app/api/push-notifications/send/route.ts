/**
 * API Route para enviar push notifications
 * POST /api/push-notifications/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { messaging } from '@/core/config/firebase-admin';
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
    if (!topic) {
      return NextResponse.json(
        { error: 'El topic es requerido' },
        { status: 400 }
      );
    }

    // Validar que el título y el cuerpo estén presentes
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'El título y el cuerpo son requeridos' },
        { status: 400 }
      );
    }

    // Construir el mensaje de FCM
    // IMPORTANTE: Para iOS, el formato debe ser correcto
    const message: any = {
      topic,
      notification: {
        title,
        body: messageBody,
      },
      data: {
        event_type: eventType,
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ),
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title,
              body: messageBody,
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

    // Log para debugging
    console.log('📤 Enviando notificación push:', {
      topic,
      title,
      body: messageBody,
      eventType,
      data,
      messageStructure: JSON.stringify(message, null, 2),
    });

    // Enviar la notificación
    const response = await messaging.send(message);
    
    console.log('✅ Notificación enviada exitosamente:', {
      messageId: response,
      topic,
    });

    return NextResponse.json({
      success: true,
      messageId: response,
      topic,
    });
  } catch (error: any) {
    console.error('❌ Error al enviar notificación push:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      topic,
      title,
      body: messageBody,
    });
    
    // Si es un error de FCM, proporcionar más detalles
    if (error.code) {
      console.error('Código de error FCM:', error.code);
    }
    
    return NextResponse.json(
      {
        error: 'Error al enviar la notificación',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

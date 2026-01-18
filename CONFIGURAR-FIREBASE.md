# 🔥 Guía: Configurar Firebase en Liga 1 Admin

## 📋 Resumen
Esta guía te ayudará a obtener las credenciales de Firebase y configurarlas en el proyecto.

---

## Paso 1: Acceder a Firebase Console

1. Abre tu navegador y ve a: **https://console.firebase.google.com**
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto: **"liga1-739fc"**

---

## Paso 2: Obtener SDK Cliente (Web)

### 2.1. Ir a Configuración del Proyecto
- En el menú lateral izquierdo, haz clic en el **⚙️ ícono de engranaje**
- Selecciona **"Configuración del proyecto"**

![Configuración del proyecto](https://firebase.google.com/static/images/brand-guidelines/logo-built_black.png)

### 2.2. Buscar "Tus aplicaciones"
- En la pestaña **"General"**
- Baja hasta la sección **"Tus aplicaciones"**

### 2.3. Opción A: Si ya tienes una app web
- Verás un bloque de código similar a:
  ```javascript
  const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "liga1-739fc.firebaseapp.com",
    projectId: "liga1-739fc",
    storageBucket: "liga1-739fc.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcd1234"
  };
  ```
- **Copia estos valores** (los necesitarás en el Paso 4)

### 2.4. Opción B: Si NO tienes una app web
- Haz clic en el botón **"</> Web"** (icono con etiqueta `</>`)
- Asigna un nombre: **"Liga 1 Admin Web"**
- **NO** marques la casilla "También configurar Firebase Hosting"
- Haz clic en **"Registrar app"**
- Aparecerá el código de configuración
- **Copia el objeto `firebaseConfig`**

---

## Paso 3: Obtener SDK Admin (para Notificaciones)

### 3.1. Ir a Cuentas de Servicio
- Sigue en **⚙️ Configuración del proyecto**
- Haz clic en la pestaña **"Cuentas de servicio"**

### 3.2. Generar Clave Privada
- Baja hasta **"SDK Admin de Firebase"**
- Asegúrate de que esté seleccionado **"Node.js"**
- Haz clic en el botón **"Generar nueva clave privada"**
- Confirma en el modal que aparece
- Se descargará un archivo JSON (ej: `liga1-739fc-firebase-adminsdk-xxxxx.json`)

### 3.3. Guardar el Archivo JSON
- **¡IMPORTANTE!** Este archivo contiene credenciales secretas
- Guárdalo en un lugar seguro
- **NUNCA** lo subas a Git o lo compartas públicamente

---

## Paso 4: Configurar `.env.local`

### 4.1. Abrir el archivo `.env.local` en VS Code
- Ubicación: `/liga1-admin-next/.env.local`
- Ya existe en la raíz del proyecto

### 4.2. Completar las Variables del SDK Cliente

Del **Paso 2**, toma los valores de `firebaseConfig` y reemplaza:

```env
# Copia el valor de apiKey
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...

# Copia el valor de messagingSenderId
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789

# Copia el valor de appId
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcd1234
```

Las siguientes ya están pre-configuradas (verifica que coincidan):
```env
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=liga1-739fc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=liga1-739fc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=liga1-739fc.firebasestorage.app
```

### 4.3. Completar las Variables del SDK Admin

Abre el archivo JSON descargado en el **Paso 3** con un editor de texto.

Busca y copia:

**`client_email`:**
```env
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@liga1-739fc.iam.gserviceaccount.com
```

**`private_key`:**
```env
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

⚠️ **IMPORTANTE para `PRIVATE_KEY`:**
- Copia TODO el contenido del campo `private_key`
- Incluye `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Los `\n` representan saltos de línea, **déjalos tal cual**
- Encierra todo entre **comillas dobles** `"..."`

### 4.4. Ejemplo Completo

Tu archivo `.env.local` debe verse así:

```env
# Firebase Client SDK (Público - para el navegador)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyABC123XYZ456-ejemplo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=liga1-739fc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=liga1-739fc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=liga1-739fc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456

# Firebase Admin SDK (Privado - solo para servidor)
FIREBASE_ADMIN_PROJECT_ID=liga1-739fc
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xyz@liga1-739fc.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

---

## Paso 5: Verificar la Configuración

### 5.1. Ejecutar el Script de Verificación

En tu terminal, ejecuta:

```bash
npm run verify-env
```

Deberías ver algo como:

```
🔍 Verificando Variables de Entorno Firebase...

📦 Client SDK:
  NEXT_PUBLIC_FIREBASE_API_KEY: ✅ AIzaSyABC123XYZ456...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ✅ liga1-739fc.firebaseapp.com...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ✅ liga1-739fc...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ✅ liga1-739fc.firebasestorage.app...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ✅ 123456789012...
  NEXT_PUBLIC_FIREBASE_APP_ID: ✅ 1:123456789012:web:ab...

📦 Admin SDK:
  FIREBASE_ADMIN_PROJECT_ID: ✅ liga1-739fc...
  FIREBASE_ADMIN_CLIENT_EMAIL: ✅ firebase-adminsdk-xyz@...
  FIREBASE_ADMIN_PRIVATE_KEY: ✅ Configurada (***oculta***)

==================================================
✅ Todas las variables están configuradas correctamente
==================================================
```

### 5.2. Si hay errores

Si ves `❌ NO CONFIGURADA`:
1. Revisa que copiaste bien los valores
2. Verifica que no haya espacios extra
3. Asegúrate de que `PRIVATE_KEY` esté entre comillas dobles

---

## Paso 6: Reiniciar el Servidor

### 6.1. Detener el servidor actual
- Ve a la terminal donde corre `npm run dev`
- Presiona **Ctrl + C**

### 6.2. Iniciar el servidor de nuevo
```bash
npm run dev
```

---

## ✅ ¡Listo!

Tu proyecto ahora está conectado a Firebase. Las próximas fases usarán estas credenciales para:
- 🔐 Autenticación con Google
- 📊 Leer/escribir datos en Firestore
- 📲 Enviar notificaciones push

---

## 🔒 Seguridad

**NUNCA compartas o subas a Git:**
- ❌ El archivo `.env.local`
- ❌ El JSON del Admin SDK descargado
- ❌ Capturas de pantalla con tus credenciales

El archivo `.gitignore` ya está configurado para excluir `.env.local`.

---

## 🆘 Solución de Problemas

### Error: "Faltan variables de entorno de Firebase"
- Verifica que `.env.local` exista en la raíz del proyecto
- Ejecuta `npm run verify-env` para ver qué falta

### Error: "Invalid API Key"
- Copia de nuevo el `apiKey` del Firebase Console
- Asegúrate de que no haya espacios al inicio o final

### Error con `PRIVATE_KEY`
- Debe estar entre comillas dobles `"..."`
- Debe incluir los saltos de línea `\n`
- Ejemplo: `"-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"`

---

**Siguiente paso:** [Continuar con FASE 1 - Capa de Dominio](./README.md#-fase-1---capa-de-dominio)

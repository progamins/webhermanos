import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import bcrypt from "bcryptjs";
import multer from "multer";
import nodemailer from "nodemailer";
import { EventEmitter } from "events";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = "0.0.0.0";

// Firebase Configuration from frontend
const firebaseConfig = {
  projectId: "gen-lang-client-0993488679",
  appId: "1:927360559301:web:fccde8b3a68e4b967128ac",
  apiKey: "AIzaSyAbRRD-iw4NyNY-KyiCqX5CF0XaqAlY0-k",
  authDomain: "gen-lang-client-0993488679.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-4719def6-8798-46bf-b425-29dfaeaf11c9",
  storageBucket: "gen-lang-client-0993488679.firebasestorage.app",
  messagingSenderId: "927360559301"
};

// Initialize Firebase Server Connection
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const storageObj = getStorage(firebaseApp);

// Global event emitter for real-time order notifications (SSE)
const orderEmitter = new EventEmitter();

// Setup Multer for image uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato de archivo no soportado. Sube JPEG, PNG, WEBP o GIF."));
    }
  }
});

// Middleware for Admin session verification
async function verifyAdminSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["x-admin-token"] as string;
  if (!token) {
    return res.status(401).json({ success: false, error: "No autorizado: Token de sesión no provisto." });
  }

  try {
    const sessionDocRef = doc(db, "admin_sessions", token);
    const sessionDoc = await getDoc(sessionDocRef);

    if (!sessionDoc.exists()) {
      return res.status(401).json({ success: false, error: "No autorizado: Sesión inválida o vencida." });
    }

    const sessionData = sessionDoc.data();
    const expiresAt = new Date(sessionData.expiresAt);
    if (expiresAt < new Date()) {
      // Session has expired, remove it to clean database
      await deleteDoc(sessionDocRef);
      return res.status(401).json({ success: false, error: "No autorizado: Sesión expirada." });
    }

    next();
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor al verificar sesión." });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Security Headers Middleware (XSS, Clickjacking, MIME-Sniffing protection)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    next();
  });

  // Serve static uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // 2. Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 3. Admin Authentication Login API (with hashed passwords stored in Firestore)
  app.post("/api/admin/login", async (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Se requiere contraseña." });
    }

    try {
      const authDocRef = doc(db, "config", "admin_auth");
      let authDoc = await getDoc(authDocRef);

      // Seed default admin password if not set
      if (!authDoc.exists()) {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync("ADMIN_PASSWORD_PLACEHOLDER", salt);
        await setDoc(authDocRef, { passwordHash });
        authDoc = await getDoc(authDocRef);
      }

      const { passwordHash } = authDoc.data()!;
      const isMatch = bcrypt.compareSync(password, passwordHash);

      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Contraseña incorrecta." });
      }

      // Generate secure session token and store in Firestore
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours duration

      await setDoc(doc(db, "admin_sessions", token), { token, expiresAt });

      return res.json({ success: true, token, expiresAt });

    } catch (error) {
      console.error("Admin Login Error:", error);
      return res.status(500).json({ success: false, error: "Error en el servidor al intentar iniciar sesión." });
    }
  });

  // 4. Admin Session Verification API
  app.post("/api/admin/verify", verifyAdminSession, (req, res) => {
    res.json({ success: true, valid: true });
  });

  // 5. Admin Session Logout API
  app.post("/api/admin/logout", async (req, res) => {
    const token = req.headers["x-admin-token"] as string;
    if (token) {
      try {
        await deleteDoc(doc(db, "admin_sessions", token));
      } catch (e) {
        // Suppress or log error
      }
    }
    res.json({ success: true });
  });

  // Email Sandbox & Template Generator Helpers
  function getEmailHeader() {
    return `
      <div style="background-color: #FCFAF5; padding: 30px 20px; text-align: center; border-bottom: 2px solid #E7ECE7;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #495E4A; margin: 0; font-style: italic; font-weight: normal; letter-spacing: 1px;">Maison Rosas</h1>
        <p style="font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D99C52; margin: 8px 0 0 0; font-weight: bold;">Pastelería de Autor & Repostería Fina</p>
      </div>
    `;
  }

  function getEmailFooter() {
    return `
      <div style="background-color: #1A231B; padding: 30px 20px; text-align: center; color: #E7ECE7; border-top: 1px solid #3D4E3E; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
        <p style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-style: italic; margin: 0 0 10px 0;">Hecho a mano con amor familiar por Carol & Edwin.</p>
        <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #B2C6B4; margin: 0 0 5px 0; line-height: 1.5;">Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Piura, Perú</p>
        <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #B2C6B4; margin: 0 0 15px 0;">WhatsApp: +51 902 568 187 | Email: edwinraulrosasalbines@gmail.com</p>
        <div style="border-top: 1px solid #3D4E3E; padding-top: 15px; font-size: 10px; color: #8DAA90;">
          &copy; ${new Date().getFullYear()} Maison Rosas. Todos los derechos reservados.
        </div>
      </div>
    `;
  }

  function getConfirmationEmailHTML(order: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #E7ECE7; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #313F32; margin: 0 0 15px 0; text-align: center; font-style: italic; font-weight: normal;">¡Tu Pedido ha sido Recibido!</h2>
          <p style="font-size: 14px; color: #495E4A; line-height: 1.6; text-align: center; margin: 0 0 25px 0;">
            Estimado/a <strong>${order.customerName}</strong>, Carol ya tiene tu solicitud de diseño personalizado en su taller. Hemos generado tu código de seguimiento exclusivo para que puedas consultar el estado de tu pastel en cualquier momento.
          </p>
          
          <div style="background-color: #FCFAF5; border: 1px dashed #B2C6B4; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <span style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #D99C52; letter-spacing: 0.15em; font-weight: bold; display: block; margin-bottom: 5px;">Código de Seguimiento</span>
            <strong style="font-size: 24px; font-family: monospace; color: #495E4A; letter-spacing: 2px;">${order.trackingCode}</strong>
            <span style="font-size: 11px; color: #8DAA90; display: block; margin-top: 5px;">Número de pedido: ${order.id}</span>
          </div>

          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #313F32; border-bottom: 1px solid #E7ECE7; padding-bottom: 8px; margin: 0 0 15px 0; font-weight: normal;">Detalles del Pastel de Autor</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #313F32; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Modelo Referencial:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.productName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Medida / Porciones:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.size}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Sabor y Relleno:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.flavor}</td>
            </tr>
            ${order.customColor ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Color de Cobertura:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.customColor}</td>
            </tr>` : ''}
            ${order.theme ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Temática:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.theme}</td>
            </tr>` : ''}
            ${order.selectedDecoration ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Decoración:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.selectedDecoration}</td>
            </tr>` : ''}
            ${order.celebratedName ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Homenajeado/a:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.celebratedName} ${order.customerAge ? `(${order.customerAge} años)` : ''}</td>
            </tr>` : ''}
            ${order.message ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Mensaje en Pastel:</td>
              <td style="padding: 8px 0; text-align: right; font-style: italic; color: #D99C52; font-weight: bold;">"${order.message}"</td>
            </tr>` : ''}
            ${order.specialNotes ? `
            <tr>
              <td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Notas Especiales:</td>
              <td style="padding: 8px 0; text-align: right; color: #5B755D; font-style: italic;">${order.specialNotes}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #E7ECE7;">
              <td style="padding: 15px 0 8px 0; font-size: 15px; font-weight: bold; color: #313F32;">Monto Total Estimado:</td>
              <td style="padding: 15px 0 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #728F75;">S/. ${order.totalPrice}</td>
            </tr>
          </table>

          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #313F32; border-bottom: 1px solid #E7ECE7; padding-bottom: 8px; margin: 0 0 15px 0; font-weight: normal;">Datos de Entrega</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #313F32; margin-bottom: 30px;">
            <tr>
              <td style="padding: 6px 0; color: #8DAA90;">Fecha y Hora:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.deliveryDate} a las ${order.deliveryTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8DAA90;">Tipo de Entrega:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; text-transform: uppercase; color: #D99C52;">${order.deliveryType === 'recojo' ? 'Recojo en Local (Sullana)' : 'Delivery a Domicilio'}</td>
            </tr>
            ${order.deliveryAddress ? `
            <tr>
              <td style="padding: 6px 0; color: #8DAA90;">Dirección de Envío:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #495E4A;">${order.deliveryAddress}</td>
            </tr>` : ''}
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #728F75; color: #ffffff; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 10px rgba(114, 143, 117, 0.25);">Consultar Estado del Pedido</a>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  function getStatusUpdateEmailHTML(order: any) {
    const statusColors: any = {
      'Pendiente': '#D99C52',
      'Confirmado': '#3B82F6',
      'Preparando': '#8B5CF6',
      'Decoración': '#EC4899',
      'Listo': '#10B981',
      'En camino': '#F59E0B',
      'Entregado': '#16A34A',
      'Cancelado': '#EF4444'
    };

    const statusText: any = {
      'Pendiente': 'Pedido Recibido',
      'Confirmado': 'Pedido Confirmado',
      'Preparando': 'En Preparación',
      'Decoración': 'Decoración Final',
      'Listo': 'Listo para Recoger',
      'En camino': 'En Camino',
      'Entregado': 'Entregado con Éxito',
      'Cancelado': 'Pedido Cancelado'
    };

    const statusColor = statusColors[order.status] || '#728F75';
    const statusLabel = statusText[order.status] || order.status;

    let messageText = '';
    switch(order.status) {
      case 'Confirmado':
        messageText = '¡Excelentes noticias! Edwin y Carol han verificado tu diseño y confirmado tu pedido. Hemos verificado la disponibilidad de insumos en nuestro taller. ¡Tu pastel está agendado!';
        break;
      case 'Preparando':
        messageText = '¡Manos a la obra! Carol ha comenzado a hornear tu bizcocho. En esta fase seleccionamos los huevos de corral más frescos, la mantequilla de pura crema de leche y el cacao belga fino de aroma para lograr una miga súper húmeda.';
        break;
      case 'Decoración':
        messageText = '¡Llegó el arte! El bizcocho se ha enfriado perfectamente y Carol está esculpiendo la cobertura de crema sedosa (buttercream o fondant) y aplicando cada decoración premium que seleccionaste. ¡Ya luce bellísimo!';
        break;
      case 'Listo':
        messageText = order.deliveryType === 'recojo' 
          ? '¡Tu obra de arte está lista! Ya puedes acercarte a recoger tu pastel en nuestra sede en Av. Ricardo Palma 213, Sullana, Piura. Recuerda transportarlo en una superficie plana con el aire acondicionado encendido.' 
          : '¡Tu obra de arte está lista! Hemos empacado cuidadosamente tu pastel en su caja rígida de alta repostería Maison Rosas y se encuentra listo en el taller a la espera de ser enviado a tu domicilio.';
        break;
      case 'En camino':
        messageText = '¡Tu pastel va en camino! Nuestro repartidor de confianza lo transporta con el máximo cuidado y refrigeración directamente hacia tu dirección. ¡Ten tu teléfono a la mano!';
        break;
      case 'Entregado':
        messageText = '¡Entregado con éxito! Esperamos de todo corazón que disfrutes esta obra maestra que preparamos con tanto cariño. Que pases un día maravilloso celebrando y deleitándote junto a Maison Rosas.';
        break;
      case 'Cancelado':
        messageText = `Lamentamos informarte que tu pedido ha sido cancelado. Motivo especificado: "${order.cancelReason || 'No especificado por el administrador'}"`;
        break;
      default:
        messageText = `El estado de tu pedido ha sido actualizado a: **${statusLabel}**.`;
    }

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #E7ECE7; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #313F32; margin: 0 0 10px 0; text-align: center; font-style: italic; font-weight: normal;">Actualización de tu Pedido</h2>
          <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0 0 25px 0;">Pedido: <strong>#${order.id}</strong></p>
          
          <div style="text-align: center; margin-bottom: 35px;">
            <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 8px 18px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 30px;">
              ${statusLabel}
            </span>
          </div>

          <p style="font-size: 14px; color: #495E4A; line-height: 1.6; text-align: center; margin: 0 0 30px 0; padding: 0 15px;">
            ${messageText}
          </p>

          <!-- Visual Progress Bar in Email -->
          <div style="margin: 30px 0; border-top: 1px solid #E7ECE7; padding-top: 25px;">
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
              <tr>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${order.status !== 'Cancelado' ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${order.status !== 'Cancelado' ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Recibido
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Confirmado
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Horneando
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Decoración
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Listo', 'En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Listo
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['En camino', 'Entregado'].includes(order.status) ? '#728F75' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  En Camino
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${order.status === 'Entregado' ? '#16A34A' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${order.status === 'Entregado' ? '#16A34A' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Entregado
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: #FCFAF5; border: 1px solid #E7ECE7; border-radius: 12px; padding: 20px; margin-top: 30px;">
            <h4 style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #313F32; margin: 0 0 10px 0; font-weight: normal;">Detalles de tu Pastel</h4>
            <p style="font-size: 12px; color: #495E4A; margin: 0 0 5px 0;"><strong>Modelo:</strong> ${order.productName}</p>
            <p style="font-size: 12px; color: #495E4A; margin: 0 0 5px 0;"><strong>Tamaño:</strong> ${order.size}</p>
            <p style="font-size: 12px; color: #495E4A; margin: 0 0 5px 0;"><strong>Código de seguimiento:</strong> ${order.trackingCode}</p>
            <p style="font-size: 12px; color: #495E4A; margin: 0 0 5px 0;"><strong>Entrega programada:</strong> ${order.deliveryDate} a las ${order.deliveryTime}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #728F75; color: #ffffff; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px;">Ver Progreso del Pedido</a>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  function getOTPEmailHTML(customerName: string, email: string, otp: string) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #E7ECE7; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #313F32; margin: 0 0 20px 0; text-align: center; font-style: italic; font-weight: normal;">Acceso a tus Pedidos 🎂</h2>
          
          <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #495E4A; line-height: 1.6; margin: 0 0 15px 0;">
            Hola, <strong>${customerName}</strong>.
          </p>
          
          <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #495E4A; line-height: 1.6; margin: 0 0 20px 0;">
            Tu código para consultar el estado de tu pedido es:
          </p>
          
          <div style="background-color: #FCFAF5; border: 1px dashed #728F75; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
            <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #D99C52; letter-spacing: 0.2em; font-weight: bold; display: block; margin-bottom: 10px;">Código de Verificación</span>
            <strong style="font-size: 38px; font-family: monospace; color: #728F75; letter-spacing: 5px;">${otp}</strong>
            <span style="font-size: 11px; color: #8DAA90; display: block; margin-top: 10px;">Este código es válido durante 10 minutos.</span>
          </div>
          
          <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #8DAA90; text-align: center; margin: 0; line-height: 1.5;">
            Si no solicitaste este código, puedes ignorar este correo de forma segura.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  let mailTransporter: any = null;

  function getMailTransporter() {
    if (mailTransporter) return mailTransporter;

    const user = process.env.SMTP_USER || "edwinraulrosasalbines@gmail.com";
    const pass = process.env.SMTP_PASS;

    if (!pass) {
      console.warn("[MAIL] SMTP_PASS no está configurado. Los correos se guardarán únicamente de forma simulada en la base de datos.");
      return null;
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE !== "false"; // Default a true para puerto 465, false para 587 o similar

    mailTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    return mailTransporter;
  }

  async function sendSimulatedEmail(recipient: string | undefined, subject: string, htmlContent: string, orderId?: string) {
    const emailRecipient = recipient || "cliente-sullana@maisonrosas.com";
    const emailId = `mail-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    
    let sentReal = false;
    let sendError: string | null = null;

    // 1. Try sending via Resend API if RESEND_API_KEY is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        console.log(`[MAIL] Intentando enviar correo real mediante Resend SDK a ${emailRecipient}...`);
        
        // Clean environment variables to remove any trailing/leading double or single quotes
        const rawSenderEmail = process.env.RESEND_SENDER_EMAIL || "edwinraulrosasalbines@gmail.com";
        const rawSenderName = process.env.EMAIL_SENDER_NAME || "Maison Rosas";
        
        const cleanSenderEmail = rawSenderEmail.replace(/^["']|["']$/g, "").trim();
        const cleanSenderName = rawSenderName.replace(/^["']|["']$/g, "").trim();

        // Resend prefers the format: 'Name <email@domain.com>' without nested double quotes for display names
        const fromHeader = cleanSenderName ? `${cleanSenderName} <${cleanSenderEmail}>` : cleanSenderEmail;

        const resend = new Resend(resendApiKey);
        const { data, error } = await resend.emails.send({
          from: fromHeader,
          to: emailRecipient,
          subject: subject,
          html: htmlContent
        });

        if (error) {
          throw error;
        }

        console.log(`[MAIL] Correo real enviado mediante Resend SDK exitosamente. ID:`, data?.id);
        sentReal = true;
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`[MAIL] Advertencia con Resend SDK al enviar a ${emailRecipient}: ${errMsg}`);
        
        if (err && (err.name === "validation_error" || String(err).includes("validation_error"))) {
          console.warn(
            `\n[RESEND NOTE] Si estás utilizando el dominio de prueba gratuito 'onboarding@resend.dev', ` +
            `Resend por defecto solo permite enviar correos a la dirección de correo con la que creaste tu cuenta de Resend (normalmente, tu correo personal de registro). ` +
            `Para poder enviar correos a cualquier otra dirección externa como '${emailRecipient}', ` +
            `debes verificar tu dominio personalizado en el panel de control de Resend (Sección Domains).\n`
          );
        }
        
        sendError = `[Resend] ${errMsg}`;
      }
    }

    // 2. Fallback to Nodemailer SMTP if NOT sent by Resend AND SMTP_PASS is configured
    if (!sentReal && process.env.SMTP_PASS) {
      try {
        console.log(`[MAIL] Intentando enviar correo real mediante SMTP a ${emailRecipient}...`);
        const transporter = getMailTransporter();
        if (transporter) {
          const mailOptions = {
            from: `"${process.env.EMAIL_SENDER_NAME || 'Maison Rosas'}" <${process.env.SMTP_USER || 'edwinraulrosasalbines@gmail.com'}>`,
            to: emailRecipient,
            subject: subject,
            html: htmlContent
          };
          const info = await transporter.sendMail(mailOptions);
          console.log(`[MAIL] Correo real enviado mediante SMTP exitosamente: ${info.messageId}`);
          sentReal = true;
          sendError = null; // Clear previous errors if SMTP succeeded
        }
      } catch (err: any) {
        console.warn(`[MAIL] Advertencia con SMTP al enviar a ${emailRecipient}:`, err);
        if (!sendError) {
          sendError = `[SMTP] ${err.message || String(err)}`;
        } else {
          sendError += ` | [SMTP] ${err.message || String(err)}`;
        }
      }
    }

    try {
      await setDoc(doc(db, "simulated_emails", emailId), {
        id: emailId,
        recipient: emailRecipient,
        subject: subject || "Notificación de Maison Rosas",
        htmlContent: htmlContent || "",
        date: new Date().toISOString(),
        orderId: orderId || null,
        read: false,
        sentReal,
        sendError
      });
      console.log(`[SIMULATED EMAIL] Registrado en base de datos para ${emailRecipient}: ${subject}`);
    } catch (error) {
      console.error("Error saving simulated email:", error);
    }
  }

  // 5b. Contact Form API — sends real email via Resend when user submits contact form
  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, error: "Nombre y mensaje son requeridos." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[CONTACT] RESEND_API_KEY no configurado. Guardando mensaje simulado.");
      // Save to simulated_emails as fallback so it's visible in admin panel
      const emailId = `contact-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto;">
          <h2>Nuevo mensaje del formulario de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
          <p><strong>Mensaje:</strong></p>
          <blockquote style="border-left: 4px solid #728F75; padding-left: 15px; margin: 10px 0; color: #333;">
            ${message}
          </blockquote>
          <p><em>Recibido el ${new Date().toLocaleString('es-PE')}</em></p>
        </div>
      `;
      try {
        await setDoc(doc(db, "simulated_emails", emailId), {
          id: emailId,
          recipient: "edwinraulrosasalbines@gmail.com",
          subject: `Nuevo mensaje de ${name} - Formulario de Contacto`,
          htmlContent,
          date: new Date().toISOString(),
          read: false,
          sentReal: false,
          sendError: "RESEND_API_KEY no configurado"
        });
      } catch (e) { /* ignore */ }
      return res.json({ success: true, message: "Mensaje recibido con éxito." });
    }

    try {
      const rawSenderEmail = process.env.RESEND_SENDER_EMAIL || "edwinraulrosasalbines@gmail.com";
      const cleanSenderEmail = rawSenderEmail.replace(/^["']|["']$/g, "").trim();

      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send({
        from: `Formulario Web Maison Rosas <${cleanSenderEmail}>`,
        to: "edwinraulrosasalbines@gmail.com",
        subject: `Nuevo mensaje de ${name} - Formulario de Contacto`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #E7ECE7; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #FCFAF5; padding: 30px 20px; text-align: center; border-bottom: 2px solid #E7ECE7;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; color: #495E4A; margin: 0;">Maison Rosas</h1>
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D99C52; margin: 8px 0 0 0;">Notificación de Contacto Web</p>
            </div>
            <div style="padding: 30px;">
              <h2 style="font-family: Georgia, serif; font-size: 20px; color: #313F32;">Nuevo mensaje del formulario de contacto</h2>
              <p style="font-size: 13px; color: #495E4A; line-height: 1.6;">Has recibido un nuevo mensaje desde el formulario de contacto de la web.</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
                <tr><td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Nombre:</td><td style="padding: 8px 0; font-weight: bold; color: #495E4A;">${name}</td></tr>
                ${email ? `<tr><td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Email:</td><td style="padding: 8px 0; font-weight: bold; color: #495E4A;">${email}</td></tr>` : ''}
                <tr><td style="padding: 8px 0; color: #8DAA90; font-weight: 500;">Fecha:</td><td style="padding: 8px 0; color: #495E4A;">${new Date().toLocaleString('es-PE')}</td></tr>
              </table>
              <div style="background-color: #FCFAF5; border: 1px solid #E7ECE7; border-radius: 12px; padding: 20px; margin-top: 10px;">
                <p style="font-size: 13px; color: #495E4A; margin: 0 0 10px 0; font-weight: bold;">Mensaje:</p>
                <p style="font-size: 13px; color: #495E4A; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="font-size: 11px; color: #8DAA90; margin-top: 20px; text-align: center;">Este mensaje fue enviado automáticamente desde el formulario de contacto de <strong>Maison Rosas</strong>.</p>
            </div>
          </div>
        `
      });

      if (error) {
        console.warn(`[CONTACT] Error de Resend:`, error);
        return res.status(500).json({ success: false, error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." });
      }

      console.log(`[CONTACT] Mensaje de ${name} enviado por Resend. ID:`, data?.id);
      return res.json({ success: true, message: "¡Mensaje enviado con éxito!" });
    } catch (err: any) {
      console.error(`[CONTACT] Error inesperado:`, err);
      return res.status(500).json({ success: false, error: "Ocurrió un error al enviar tu mensaje. Por favor, intenta de nuevo." });
    }
  });

  // 6. Post Order API (used by client customizer, triggers SSE broadcast)
  app.post("/api/orders", async (req, res) => {
    const { order } = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ success: false, error: "Datos del pedido inválidos." });
    }

    try {
      await setDoc(doc(db, "orders", order.id), order);
      
      // Emit event for real-time streaming updates
      orderEmitter.emit("order", order);

      // Trigger automatic confirmation email!
      const htmlContent = getConfirmationEmailHTML(order);
      await sendSimulatedEmail(order.customerEmail, `Confirmación de tu pedido #${order.id} - Maison Rosas`, htmlContent, order.id);

      return res.json({ success: true });
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({ success: false, error: "Error al guardar el pedido en la base de datos." });
    }
  });

  // Client OTP Request API
  app.post("/api/orders/request-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Correo electrónico es requerido." });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Verify if at least one order exists with this email (case-insensitive check) and retrieve client name
      const q = query(collection(db, "orders"));
      const querySnapshot = await getDocs(q);
      
      let customerName = "Cliente";
      let hasOrder = false;

      querySnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        const customerEmail = orderData?.customerEmail;
        if (customerEmail && customerEmail.toLowerCase() === normalizedEmail) {
          hasOrder = true;
          if (orderData?.customerName) {
            customerName = orderData.customerName;
          }
        }
      });

      if (!hasOrder) {
        return res.status(404).json({ 
          success: false, 
          error: "No se encontró ningún pedido asociado a este correo electrónico. Por favor, verifica el correo ingresado o contáctanos por WhatsApp." 
        });
      }

      // 2. Generate 6 digit random number
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // 3. Save in Firestore for verification
      await setDoc(doc(db, "otps", normalizedEmail), {
        email: normalizedEmail,
        otp,
        expiresAt
      });

      // 4. Send email using Resend API / SMTP / Simulator
      const htmlContent = getOTPEmailHTML(customerName, normalizedEmail, otp);
      await sendSimulatedEmail(normalizedEmail, "Tu código de acceso para consultar tu pedido 🎂", htmlContent);

      return res.json({ success: true, message: "Código OTP generado con éxito.", otpForTesting: otp });
    } catch (error) {
      console.error("Error in request-otp:", error);
      return res.status(500).json({ success: false, error: "Error al generar código OTP." });
    }
  });

  // Client OTP Verification API
  app.post("/api/orders/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Correo y OTP son requeridos." });
    }

    try {
      const otpDoc = await getDoc(doc(db, "otps", email.toLowerCase()));
      if (!otpDoc.exists()) {
        return res.status(400).json({ success: false, error: "No se ha solicitado ningún código para este correo." });
      }

      const data = otpDoc.data();
      const now = new Date().toISOString();
      if (data.expiresAt < now) {
        return res.status(400).json({ success: false, error: "El código de verificación ha expirado." });
      }

      if (data.otp !== otp.trim()) {
        return res.status(400).json({ success: false, error: "El código de verificación ingresado es incorrecto." });
      }

      // Successful verification, delete OTP doc
      await deleteDoc(doc(db, "otps", email.toLowerCase()));

      return res.json({ success: true });
    } catch (error) {
      console.error("Error verifying otp:", error);
      return res.status(500).json({ success: false, error: "Error en el servidor al verificar código." });
    }
  });

  // Client Fetch My Orders API
  app.post("/api/orders/my-orders", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Correo electrónico es requerido." });
    }

    try {
      const q = query(collection(db, "orders"));
      const snap = await getDocs(q);
      const list: any[] = [];
      const normalizedEmail = email.trim().toLowerCase();

      snap.forEach((doc) => {
        const data = doc.data();
        if (data && data.customerEmail && data.customerEmail.toLowerCase() === normalizedEmail) {
          list.push(data);
        }
      });

      // Sort desc
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json({ success: true, orders: list });
    } catch (error) {
      console.error("Error loading my orders:", error);
      return res.status(500).json({ success: false, error: "Error al recuperar tus pedidos." });
    }
  });

  // Client Fetch Order By Code API
  app.post("/api/orders/my-orders-by-code", async (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: "Código es requerido." });
    }

    try {
      const q = query(collection(db, "orders"), where("trackingCode", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      let foundOrder: any = null;
      snap.forEach((doc) => {
        foundOrder = doc.data();
      });

      if (foundOrder) {
        return res.json({ success: true, order: foundOrder });
      } else {
        return res.json({ success: false, error: "Pedido no encontrado." });
      }
    } catch (error) {
      console.error("Error loading order by code:", error);
      return res.status(500).json({ success: false, error: "Error al recuperar tu pedido." });
    }
  });

  app.post("/api/orders/my-orders-direct-search", async (req, res) => {
    const { code } = req.body;
    try {
      const q = query(collection(db, "orders"), where("trackingCode", "==", code.toUpperCase()));
      const snap = await getDocs(q);
      let foundOrder: any = null;
      snap.forEach((doc) => {
        foundOrder = doc.data();
      });
      return res.json({ success: true, order: foundOrder });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error" });
    }
  });

  // Admin Emails Retrieval API
  app.get("/api/admin/emails", verifyAdminSession, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "simulated_emails"));
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push(doc.data());
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json({ success: true, emails: list });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al cargar los correos simulados." });
    }
  });

  app.delete("/api/admin/emails/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "simulated_emails", id));
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al eliminar el correo simulado." });
    }
  });

  // Admin Full Order CRUD Operations to support Excel grid
  app.post("/api/admin/orders/update-full", verifyAdminSession, async (req, res) => {
    const { order } = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ success: false, error: "Datos del pedido inválidos." });
    }

    try {
      const orderRef = doc(db, "orders", order.id);
      const oldDoc = await getDoc(orderRef);
      const oldData = oldDoc.exists() ? oldDoc.data() : null;

      await setDoc(orderRef, order);
      
      // SSE update
      orderEmitter.emit("order", order);

      // Check if status changed to trigger status notification email automatically!
      if (oldData && oldData.status !== order.status) {
        const htmlContent = getStatusUpdateEmailHTML(order);
        await sendSimulatedEmail(order.customerEmail, `Actualización de estado de tu pedido #${order.id} - Maison Rosas`, htmlContent, order.id);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error fully saving order:", error);
      return res.status(500).json({ success: false, error: "Error al guardar el pedido en el servidor." });
    }
  });

  app.post("/api/admin/orders/duplicate", verifyAdminSession, async (req, res) => {
    const { orderId } = req.body;
    try {
      const ref = doc(db, "orders", orderId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      }
      
      const data = snap.data() as any;
      const newId = `ord-${Date.now()}`;
      const duplicate = {
        ...data,
        id: newId,
        trackingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        status: 'Pendiente'
      };

      await setDoc(doc(db, "orders", newId), duplicate);
      orderEmitter.emit("order", duplicate);

      // Trigger automatic confirmation email!
      const htmlContent = getConfirmationEmailHTML(duplicate);
      await sendSimulatedEmail(duplicate.customerEmail, `Confirmación de tu pedido #${duplicate.id} - Maison Rosas`, htmlContent, duplicate.id);

      return res.json({ success: true, order: duplicate });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Error al duplicar el pedido." });
    }
  });

  app.delete("/api/admin/orders/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "orders", id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Error al eliminar el pedido." });
    }
  });

  // 7. Server-Sent Events (SSE) Stream API for Real-Time Recent Purchases Carousel
  app.get("/api/orders/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Fetch and send the current latest orders to populate the carousel initially
    try {
      const snap = await getDocs(collection(db, "orders"));
      const orders: any[] = [];
      snap.forEach((doc) => {
        orders.push(doc.data());
      });
      // Sort and take latest 15
      orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const initialOrders = orders.slice(0, 15);
      
      res.write(`data: ${JSON.stringify({ type: "initial", orders: initialOrders })}\n\n`);
    } catch (error) {
      console.error("SSE Initial orders load error:", error);
    }

    // Set up active listener for live-emitted orders
    const listener = (newOrder: any) => {
      res.write(`data: ${JSON.stringify({ type: "new", order: newOrder })}\n\n`);
    };

    orderEmitter.on("order", listener);

    // Keep connection alive with heartbeat
    const keepAlive = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
      orderEmitter.off("order", listener);
    });
  });

  // 8. Admin Secure File Upload API — stores images in Firebase Storage for persistence across restarts
  app.post("/api/upload", verifyAdminSession, upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No se seleccionó ningún archivo." });
    }
    try {
      // Read the file from local disk and upload to Firebase Storage
      const filePath = path.join(uploadsDir, req.file.filename);
      const fileBuffer = fs.readFileSync(filePath);
      const uniqueName = `uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      const storageRefPath = storageRef(storageObj, uniqueName);
      const metadata = { contentType: req.file.mimetype };
      const snapshot = await uploadBytes(storageRefPath, fileBuffer, metadata);
      const imageUrl = await getDownloadURL(snapshot.ref);
      // Clean up the local file since it's now in Firebase Storage
      fs.unlinkSync(filePath);
      res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("Error uploading to Firebase Storage:", error);
      res.status(500).json({ success: false, error: "Error al subir la imagen al almacenamiento permanente." });
    }
  });

  // Memory storage for vouchers (uploaded to Firebase Storage for persistence)
  const voucherMemoryStorage = multer.memoryStorage();
  const uploadVoucherMemory = multer({
    storage: voucherMemoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf"
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Solo se permiten imágenes (JPEG, PNG, WEBP, GIF) o archivos PDF."));
      }
    }
  });

  // Upload voucher to Firebase Storage and update order in database
  app.post("/api/admin/orders/upload-voucher", verifyAdminSession, uploadVoucherMemory.single("voucher"), async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "ID del pedido es requerido." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No se seleccionó ningún archivo." });
    }

    try {
      const originalName = req.file.originalname;
      const ext = path.extname(originalName);
      const uniqueName = `vouchers/${orderId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const storageRefPath = storageRef(storageObj, uniqueName);
      const metadata = {
        contentType: req.file.mimetype,
      };
      const snapshot = await uploadBytes(storageRefPath, req.file.buffer, metadata);
      const voucherUrl = await getDownloadURL(snapshot.ref);

      // Update order in Firestore
      const orderRef = doc(db, "orders", orderId);
      const updateData = {
        voucherUrl,
        voucherName: originalName,
        voucherUploadedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, updateData);

      // Fetch the updated order to broadcast via SSE
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        orderEmitter.emit("order", updatedSnap.data());
      }

      res.json({
        success: true,
        voucherUrl,
        voucherName: originalName,
        voucherUploadedAt: updateData.voucherUploadedAt
      });
    } catch (error) {
      console.error("Error uploading voucher to Firebase Storage:", error);
      res.status(500).json({ success: false, error: "Error al subir el comprobante de pago al almacenamiento permanente." });
    }
  });

  // Delete voucher from Firebase Storage and update order in database
  app.post("/api/admin/orders/delete-voucher", verifyAdminSession, async (req, res) => {
    const { orderId, voucherPath } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "ID del pedido es requerido." });
    }

    try {
      // Try to delete from Firebase Storage if we have a URL
      if (voucherPath && voucherPath.startsWith("https://")) {
        try {
          const voucherRef = storageRef(storageObj, voucherPath);
          await deleteObject(voucherRef);
        } catch (e) {
          // File may already be deleted, ignore
          console.warn("Could not delete voucher from Firebase Storage:", e);
        }
      }

      // Clear voucher fields in order doc
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        voucherUrl: null,
        voucherName: null,
        voucherUploadedAt: null
      });

      // Fetch the updated order to broadcast via SSE
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        orderEmitter.emit("order", updatedSnap.data());
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voucher:", error);
      res.status(500).json({ success: false, error: "Error al eliminar el comprobante." });
    }
  });

  // Update order payment status details
  app.post("/api/admin/orders/update-payment", verifyAdminSession, async (req, res) => {
    const { orderId, paymentStatus, paymentMethod, montoPagado, fechaPago, confirmedByAdmin } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "ID del pedido es requerido." });
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      const updateData: any = {
        paymentStatus,
        paymentMethod,
        montoPagado: Number(montoPagado) || 0,
        fechaPago,
        confirmedByAdmin
      };
      await updateDoc(orderRef, updateData);

      // Fetch the updated order to broadcast via SSE
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        orderEmitter.emit("order", updatedSnap.data());
      }

      res.json({ success: true, order: updatedSnap.data() });
    } catch (error) {
      console.error("Error updating payment details:", error);
      res.status(500).json({ success: false, error: "Error al actualizar los detalles de pago." });
    }
  });

  // 9. Admin Secure Products Modifiers
  app.post("/api/admin/products", verifyAdminSession, async (req, res) => {
    const { product } = req.body;
    try {
      await setDoc(doc(db, "products", product.id), product);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error guardando pastel." });
    }
  });

  app.delete("/api/admin/products/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "products", id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error eliminando pastel." });
    }
  });

  // 10. Admin Secure Gallery Modifiers
  app.post("/api/admin/gallery", verifyAdminSession, async (req, res) => {
    const { item } = req.body;
    try {
      await setDoc(doc(db, "gallery", item.id), item);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error guardando imagen." });
    }
  });

  app.delete("/api/admin/gallery/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "gallery", id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error eliminando imagen." });
    }
  });

  // 11. Admin Secure Config Modifiers
  app.post("/api/admin/config", verifyAdminSession, async (req, res) => {
    const { config: appConfig } = req.body;
    try {
      await setDoc(doc(db, "config", "app_config"), appConfig);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error guardando configuración." });
    }
  });

  // 12. Admin Secure Reviews Modifiers
  app.post("/api/admin/reviews/approve", verifyAdminSession, async (req, res) => {
    const { reviewId } = req.body;
    try {
      const revRef = doc(db, "reviews", reviewId);
      await updateDoc(revRef, { approved: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error aprobando reseña." });
    }
  });

  app.post("/api/admin/reviews/reply", verifyAdminSession, async (req, res) => {
    const { reviewId, replyText } = req.body;
    try {
      const revRef = doc(db, "reviews", reviewId);
      await updateDoc(revRef, { response: replyText });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error respondiendo reseña." });
    }
  });

  app.delete("/api/admin/reviews/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "reviews", id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Error eliminando reseña." });
    }
  });

  // 13. Admin Secure Orders Modifiers
  app.post("/api/admin/orders/status", verifyAdminSession, async (req, res) => {
    const { orderId, status, cancelReason } = req.body;
    try {
      const orderRef = doc(db, "orders", orderId);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      }

      const orderData = snap.data();
      const updateData: any = { status };
      if (status === 'Cancelado' && cancelReason) {
        updateData.cancelReason = cancelReason;
      }

      await updateDoc(orderRef, updateData);

      // Trigger status update email
      const updatedOrder = { ...orderData, ...updateData };
      const htmlContent = getStatusUpdateEmailHTML(updatedOrder);
      await sendSimulatedEmail(updatedOrder.customerEmail, `Actualización de tu pedido #${orderId} - Maison Rosas`, htmlContent, orderId);

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating order status:", err);
      res.status(500).json({ success: false, error: "Error actualizando estado de pedido." });
    }
  });

  // 14. Admin Secure Cake Stock (Physical Inventory) Modifiers
  app.get("/api/admin/stock", verifyAdminSession, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "cake_stock"));
      const stock: any[] = [];
      snap.forEach((doc) => {
        stock.push(doc.data());
      });
      // Sort newest first
      stock.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, stock });
    } catch (err) {
      console.error("Error fetching stock:", err);
      res.status(500).json({ success: false, error: "Error obteniendo stock físico de pasteles." });
    }
  });

  app.post("/api/admin/stock", verifyAdminSession, async (req, res) => {
    const { item } = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, error: "Datos de stock inválidos." });
    }
    try {
      await setDoc(doc(db, "cake_stock", item.id), item);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving stock item:", err);
      res.status(500).json({ success: false, error: "Error guardando pastel en stock físico." });
    }
  });

  app.delete("/api/admin/stock/:id", verifyAdminSession, async (req, res) => {
    const { id } = req.params;
    try {
      await deleteDoc(doc(db, "cake_stock", id));
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting stock item:", err);
      res.status(500).json({ success: false, error: "Error eliminando pastel del stock físico." });
    }
  });

  app.post("/api/admin/orders/assign-stock", verifyAdminSession, async (req, res) => {
    const { orderId, stockId } = req.body;
    if (!orderId || !stockId) {
      return res.status(400).json({ success: false, error: "Faltan parámetros requeridos (orderId, stockId)." });
    }
    try {
      // 1. Get stock item
      const stockRef = doc(db, "cake_stock", stockId);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        return res.status(404).json({ success: false, error: "Pastel en stock físico no encontrado." });
      }
      const stockItem = stockSnap.data();
      if (stockItem.quantity <= 0) {
        return res.status(400).json({ success: false, error: "No hay stock físico disponible de este pastel." });
      }

      // 2. Get order
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return res.status(404).json({ success: false, error: "Pedido de cliente no encontrado." });
      }
      const orderData = orderSnap.data() as any;

      // 3. Decrement stock
      const newQuantity = Math.max(0, stockItem.quantity - 1);
      if (newQuantity === 0) {
        await updateDoc(stockRef, { quantity: 0 });
      } else {
        await updateDoc(stockRef, { quantity: newQuantity });
      }

      // 4. Update order status directly to "Listo" (bypassing prep)
      const specialStockNotes = `[FÍSICO] Asignado directamente desde stock físico: "${stockItem.name}" (${stockItem.flavor}, ${stockItem.size}) para agilizar el despacho.`;
      const updatedNotes = orderData.specialNotes 
        ? `${orderData.specialNotes}\n${specialStockNotes}` 
        : specialStockNotes;

      const updateData = {
        status: "Listo",
        specialNotes: updatedNotes,
        fulfilledFromStock: true,
        assignedStockId: stockId
      };

      await updateDoc(orderRef, updateData);

      // 5. Broadcast updated order via SSE
      const updatedOrder = { ...orderData, ...updateData } as any;
      orderEmitter.emit("order", updatedOrder);

      // 6. Trigger status update notification email automatically!
      const htmlContent = getStatusUpdateEmailHTML(updatedOrder);
      await sendSimulatedEmail(
        updatedOrder.customerEmail,
        `¡Tu pastel está listo! #${orderId} - Maison Rosas`,
        htmlContent,
        orderId
      );

      res.json({ 
        success: true, 
        message: "Stock asignado correctamente. El pedido ahora está LISTO.",
        order: updatedOrder,
        stockRemaining: newQuantity
      });
    } catch (err) {
      console.error("Error in assign-stock route:", err);
      res.status(500).json({ success: false, error: "Error interno al asignar stock físico al pedido." });
    }
  });

  app.post("/api/ai/suggest", async (req, res) => {
    const { name, age, category, flavor } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        fallback: true,
        message: `¡Felicidades ${name || "Especial"}! Que pases un día maravilloso disfrutando de tu delicioso pastel Maison Rosas de sabor ${flavor || "Tradicional"}.`
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Eres una repostera fina y conector de eventos familiar de Maison Rosas. Escribe un mensaje de dedicatoria de pastel de máximo 20 caracteres (para que quepa en la cobertura) y una frase poética corta de felicitación (de 2 líneas) para un pastel de categoría "${category || "Cumpleaños"}" con sabor de bizcocho "${flavor || "Vainilla"}" para ${name ? name : "alguien especial"} que cumple ${age ? age + " años" : "años"}. Responde estrictamente en formato JSON con las claves: "mensajePastel" (máximo 20 caracteres) y "felicitacion" (máximo 120 caracteres).`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      
      return res.json({
        success: true,
        messagePastel: result.mensajePastel || `HBD ${name || ""}!`,
        felicitacion: result.felicitacion || `Que tengas un dulce e increíble día celebrando junto a Maison Rosas.`
      });

    } catch (error) {
      console.error("Error in server-side Gemini generation:", error);
      return res.json({
        success: false,
        message: "Ocurrió un error consultando a la chef virtual Carol.",
        fallback: `Feliz Cumpleaños ${name || ""}. Hecho con amor por Maison Rosas.`
      });
    }
  });

  // Vite middleware setup for Development vs Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Maison Rosas Fullstack DevServer is running on http://${HOST}:${PORT}`);
  });
}

startServer();


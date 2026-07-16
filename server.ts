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
import { getAuth, signInAnonymously } from "firebase/auth";
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
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/svg+xml", "image/vnd.microsoft.icon"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato "${file.mimetype}" no soportado. Sube JPEG, PNG, WEBP, GIF, SVG o ICO.`));
    }
  }
});

// Middleware for Admin session verification (single-session enforcement)
async function verifyAdminSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["x-admin-token"] as string;
  if (!token) {
    return res.status(401).json({ success: false, error: "No autorizado: Token de sesión no provisto." });
  }

  try {
    // 1. Check that the session document exists in Firestore
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

    // 2. Single-session check: verify this token is the active session
    const authDoc = await getDoc(doc(db, "config", "admin_auth"));
    if (authDoc.exists()) {
      const authData = authDoc.data();
      if (authData.activeSessionToken && authData.activeSessionToken !== token) {
        // This token is not the active session — another login happened elsewhere
        await deleteDoc(sessionDocRef);
        return res.status(401).json({ success: false, error: "No autorizado: Tu sesión fue reemplazada por un nuevo inicio de sesión en otro dispositivo." });
      }
    }

    next();
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor al verificar sesión." });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 0. Firebase Anonymous Auth for Firestore Rules compliance
  try {
    const serverAuth = getAuth(firebaseApp);
    await signInAnonymously(serverAuth);
    console.log('[AUTH] Firebase anonymous auth initialized for Firestore rules compliance.');
  } catch (authError: any) {
    console.warn('[AUTH] Could not init anonymous auth:', authError?.message || authError);
  }

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

  // 3. Admin Authentication Login API (with per-role hashed passwords stored in Firestore)
  app.post("/api/admin/login", async (req, res) => {
    const { password, role } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Se requiere contraseña." });
    }

    const loginRole: string = role || 'admin';
    const validRoles = ['admin', 'analyst', 'stock_manager'];
    if (!validRoles.includes(loginRole)) {
      return res.status(400).json({ success: false, error: "Rol inválido." });
    }

    try {
      const authDocRef = doc(db, "config", "admin_auth");
      let authDoc = await getDoc(authDocRef);

      // Seed default master admin password if not set
      if (!authDoc.exists()) {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync("ADMIN_PASSWORD_PLACEHOLDER", salt);
        await setDoc(authDocRef, { 
          passwordHash,
          rolePasswords: {
            analyst: bcrypt.hashSync("ANALYST_PASSWORD_PLACEHOLDER", salt),
            stock_manager: bcrypt.hashSync("STOCK_PASSWORD_PLACEHOLDER", salt)
          },
          credentials_emailed: false
        });
        authDoc = await getDoc(authDocRef);
      }

      const authData = authDoc.data()!;
      let isMatch = false;

      if (loginRole === 'admin') {
        // Admin uses the master passwordHash
        const { passwordHash } = authData;
        isMatch = bcrypt.compareSync(password, passwordHash);
      } else {
        // Analyst and stock_manager use role-specific passwords
        const rolePasswords = authData.rolePasswords || {};
        const roleHash = rolePasswords[loginRole];
        if (roleHash) {
          isMatch = bcrypt.compareSync(password, roleHash);
        } else {
          // Fallback: try the master password if no role-specific password is set
          const { passwordHash } = authData;
          isMatch = bcrypt.compareSync(password, passwordHash);
        }
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Contraseña incorrecta para el rol seleccionado." });
      }

      // ── Single Session Enforcement ──
      // If there's an existing active session, invalidate it
      const existingToken = authData.activeSessionToken;
      if (existingToken) {
        try {
          await deleteDoc(doc(db, "admin_sessions", existingToken));
          console.log(`[SESSION] Old session ${existingToken.substring(0, 8)}... invalidated.`);
        } catch (e) {
          console.warn("[SESSION] Could not delete old session:", e);
        }
      }

      // Generate secure session token and store in Firestore
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours duration

      await setDoc(doc(db, "admin_sessions", token), { token, expiresAt, role: loginRole });

      // Store the new token as the active session in auth config
      await setDoc(authDocRef, { activeSessionToken: token }, { merge: true });

      // Log the login activity
      const roleLabels: any = { admin: 'Administrador', analyst: 'Analista', stock_manager: 'Gestor de Stock' };
      await logActivity('Inicio de sesión', `El ${roleLabels[loginRole] || loginRole} inició sesión en el panel.`, loginRole);

      return res.json({ success: true, token, expiresAt, role: loginRole });

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
        // Clear the active session token from auth config if it matches
        const authDoc = await getDoc(doc(db, "config", "admin_auth"));
        if (authDoc.exists() && authDoc.data().activeSessionToken === token) {
          await setDoc(doc(db, "config", "admin_auth"), { activeSessionToken: '' }, { merge: true });
        }
      } catch (e) {
        // Suppress or log error
      }
    }
    res.json({ success: true });
  });

  // ─────────────────────────────────────────
  // Activity Log Helper — logs admin actions to Firestore
  // ─────────────────────────────────────────
  async function logActivity(action: string, details: string, role: string = 'admin') {
    try {
      const logId = `log-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      await setDoc(doc(db, "activity_logs", logId), {
        id: logId,
        action,
        details,
        role,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn("[ACTIVITY LOG] Error saving activity:", err);
    }
  }

  // ─────────────────────────────────────────
  // Credentials Email Template (one-time setup)
  // ─────────────────────────────────────────
  function getCredentialsEmailHTML(passwords: { admin: string; analyst: string; stock_manager: string }, configInfo: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        <div style="background-color: #2D1C1A; padding: 30px 20px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #F8E3DE; margin: 0; font-style: italic; font-weight: normal; letter-spacing: 1px;">Maison Rosas</h1>
          <p style="font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D4A373; margin: 8px 0 0 0; font-weight: bold;">Panel de Administración</p>
        </div>
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 15px 0; text-align: center; font-style: italic; font-weight: normal;">🔐 Credenciales de Acceso</h2>
          <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 25px 0;">
            Estas son las credenciales configuradas para el panel de administración de Maison Rosas. 
            <strong>Este correo se envía una sola vez.</strong> Guarda esta información en un lugar seguro.
          </p>
          
          <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #F0D6CE;">
                <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">🛡️ Administrador</td>
                <td style="padding: 12px 8px; text-align: right;">
                  <code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace; letter-spacing: 1px;">${passwords.admin}</code>
                </td>
                <td style="padding: 12px 8px; text-align: right; color: #C4A8A0; font-size: 11px;">Acceso total</td>
              </tr>
              <tr style="border-bottom: 1px solid #F0D6CE;">
                <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">👤 Analista</td>
                <td style="padding: 12px 8px; text-align: right;">
                  <code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace; letter-spacing: 1px;">${passwords.analyst}</code>
                </td>
                <td style="padding: 12px 8px; text-align: right; color: #C4A8A0; font-size: 11px;">Pedidos, pagos, reseñas</td>
              </tr>
              <tr>
                <td style="padding: 12px 8px; font-weight: bold; color: #8A5550;">🖼️ Gestor de Stock</td>
                <td style="padding: 12px 8px; text-align: right;">
                  <code style="background: #2D1C1A; color: #F8E3DE; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-family: monospace; letter-spacing: 1px;">${passwords.stock_manager}</code>
                </td>
                <td style="padding: 12px 8px; text-align: right; color: #C4A8A0; font-size: 11px;">Stock, galería</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h4 style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #523531; margin: 0 0 10px 0; font-weight: normal;">📋 Información del Negocio</h4>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 4px 0;"><strong>WhatsApp:</strong> +${configInfo?.whatsappNumber || '51902568187'}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 4px 0;"><strong>Email:</strong> ${configInfo?.email || 'edwinraulrosasalbines@gmail.com'}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 4px 0;"><strong>Dirección:</strong> ${configInfo?.address || 'Av. Ricardo Palma 213, Sullana'}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0;"><strong>URL Admin:</strong> <a href="https://maisonrosas.com/admin" style="color: #C4847D;">maisonrosas.com/admin</a></p>
          </div>

          <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #C4A8A0; text-align: center; margin: 0; line-height: 1.5;">
            ⚠️ No compartas estas credenciales con nadie que no sea de confianza. 
            Si crees que alguna contraseña ha sido comprometida, cámbiala desde Configuración en el panel.
          </p>
        </div>
        <div style="background-color: #2D1C1A; padding: 20px; text-align: center; color: #C4A8A0; font-size: 10px;">
          &copy; ${new Date().getFullYear()} Maison Rosas — Este correo fue generado automáticamente desde el panel de administración.
        </div>
      </div>
    `;
  }

  // Email Sandbox & Template Generator Helpers

  // Generates a visual barcode pattern SVG inline for email templates (the human-readable tracking code is the real identifier)
  function getBarcodeSvg(code: string): string {
    // Map each character to a unique bar pattern (4 bars each: thick/thin pattern)
    const charMap: Record<string, string> = {};
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const pattern = i.toString(2).padStart(6, '0')
        .replace(/0/g, '1')
        .replace(/1/g, '2');
      charMap[c] = pattern;
    }

    // Build bar sequence from the code
    let barSequence = '';
    for (const ch of code.toUpperCase()) {
      if (charMap[ch]) {
        barSequence += charMap[ch];
      } else {
        barSequence += '212121'; // fallback pattern for unknown chars
      }
    }

    // Generate SVG bars
    const barWidth = 2;
    const totalHeight = 40;
    const quietZone = 10; // quiet zone on each side
    let bars = '';
    let x = quietZone;

    // Add start guard bars (CODE128 start)
    bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
    bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;
    bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
    bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;

    for (const ch of barSequence) {
      const w = ch === '2' ? 3 : 1;
      bars += `<rect x="${x}" y="0" width="${w}" height="${totalHeight}" fill="#27272a"/>`;
      x += w;
      // Add gap
      bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`;
      x += 1;
    }

    // Add end guard bars
    bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;
    bars += `<rect x="${x}" y="0" width="1" height="${totalHeight}" fill="#fff"/>`; x += 1;
    bars += `<rect x="${x}" y="0" width="2" height="${totalHeight}" fill="#27272a"/>`; x += 2;

    const totalWidth = x + quietZone;

    return `
      <svg width="${totalWidth}" height="${totalHeight + 20}" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
        ${bars}
        <text x="${totalWidth / 2}" y="${totalHeight + 16}" text-anchor="middle" font-family="monospace" font-size="11" fill="#8A5550" letter-spacing="2">${code}</text>
      </svg>
    `;
  }

  function getEmailHeader() {
    return `
      <div style="background-color: #FFF9F5; padding: 30px 20px; text-align: center; border-bottom: 2px solid #F0D6CE;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; color: #8A5550; margin: 0; font-style: italic; font-weight: normal; letter-spacing: 1px;">Maison Rosas</h1>
        <p style="font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #D4A373; margin: 8px 0 0 0; font-weight: bold;">Pastelería de Autor & Repostería Fina</p>
      </div>
    `;
  }

  function getEmailFooter() {
    return `
      <div style="background-color: #2D1C1A; padding: 30px 20px; text-align: center; color: #F8E3DE; border-top: 1px solid #6D4440; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
        <p style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-style: italic; margin: 0 0 10px 0;">Hecho a mano con amor familiar por Carol & Edwin.</p>
        <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #E4AAA0; margin: 0 0 5px 0; line-height: 1.5;">Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Piura, Perú</p>
        <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #E4AAA0; margin: 0 0 15px 0;">WhatsApp: +51 902 568 187 | Email: edwinraulrosasalbines@gmail.com</p>
        <div style="border-top: 1px solid #6D4440; padding-top: 15px; font-size: 10px; color: #C4A8A0;">
          &copy; ${new Date().getFullYear()} Maison Rosas. Todos los derechos reservados.
        </div>
      </div>
    `;
  }

  function getConfirmationEmailHTML(order: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 15px 0; text-align: center; font-style: italic; font-weight: normal;">¡Tu Pedido ha sido Recibido!</h2>
          <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 25px 0;">
            Estimado/a <strong>${order.customerName}</strong>, Carol ya tiene tu solicitud de diseño personalizado en su taller. Hemos generado tu código de seguimiento exclusivo para que puedas consultar el estado de tu pastel en cualquier momento.
          </p>
          
          <div style="background-color: #FFF9F5; border: 1px dashed #E4AAA0; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <span style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #D4A373; letter-spacing: 0.15em; font-weight: bold; display: block; margin-bottom: 5px;">Código de Seguimiento</span>
            <strong style="font-size: 24px; font-family: monospace; color: #8A5550; letter-spacing: 2px;">${order.trackingCode}</strong>
            <span style="font-size: 11px; color: #C4A8A0; display: block; margin-top: 5px;">Número de pedido: ${order.id}</span>
            <!-- Barcode visual -->
            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #E4AAA0;">
              ${getBarcodeSvg(`MR-${order.trackingCode}`)}
            </div>
          </div>

          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #523531; border-bottom: 1px solid #F0D6CE; padding-bottom: 8px; margin: 0 0 15px 0; font-weight: normal;">Detalles del Pastel de Autor</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #523531; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Modelo Referencial:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.productName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Medida / Porciones:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.size}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Sabor y Relleno:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.flavor}</td>
            </tr>
            ${order.customColor ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Color de Cobertura:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.customColor}</td>
            </tr>` : ''}
            ${order.theme ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Temática:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.theme}</td>
            </tr>` : ''}
            ${order.selectedDecoration ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Decoración:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.selectedDecoration}</td>
            </tr>` : ''}
            ${order.celebratedName ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Homenajeado/a:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.celebratedName} ${order.customerAge ? `(${order.customerAge} años)` : ''}</td>
            </tr>` : ''}
            ${order.message ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Mensaje en Pastel:</td>
              <td style="padding: 8px 0; text-align: right; font-style: italic; color: #D4A373; font-weight: bold;">"${order.message}"</td>
            </tr>` : ''}
            ${order.specialNotes ? `
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500;">Notas Especiales:</td>
              <td style="padding: 8px 0; text-align: right; color: #A86B64; font-style: italic;">${order.specialNotes}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #F0D6CE;">
              <td style="padding: 15px 0 8px 0; font-size: 15px; font-weight: bold; color: #523531;">Monto Total Estimado:</td>
              <td style="padding: 15px 0 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #C4847D;">S/. ${order.totalPrice}</td>
            </tr>
          </table>

          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #523531; border-bottom: 1px solid #F0D6CE; padding-bottom: 8px; margin: 0 0 15px 0; font-weight: normal;">Datos de Entrega</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #523531; margin-bottom: 30px;">
            <tr>
              <td style="padding: 6px 0; color: #C4A8A0;">Fecha y Hora:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.deliveryDate} a las ${order.deliveryTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #C4A8A0;">Tipo de Entrega:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; text-transform: uppercase; color: #D4A373;">${order.deliveryType === 'recojo' ? 'Recojo en Local (Sullana)' : 'Delivery a Domicilio'}</td>
            </tr>
            ${order.deliveryAddress ? `
            <tr>
              <td style="padding: 6px 0; color: #C4A8A0;">Dirección de Envío:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #8A5550;">${order.deliveryAddress}</td>
            </tr>` : ''}
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #C4847D; color: #ffffff; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 10px rgba(196, 132, 125, 0.25);">Consultar Estado del Pedido</a>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  function getStatusUpdateEmailHTML(order: any) {
    const statusColors: any = {
      'Pendiente': '#D4A373',
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

    const statusColor = statusColors[order.status] || '#C4847D';
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
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 10px 0; text-align: center; font-style: italic; font-weight: normal;">Actualización de tu Pedido</h2>
          <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0 0 25px 0;">Pedido: <strong>#${order.id}</strong></p>
          
          <div style="text-align: center; margin-bottom: 35px;">
            <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 8px 18px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 30px;">
              ${statusLabel}
            </span>
          </div>

          <p style="font-size: 14px; color: #8A5550; line-height: 1.6; text-align: center; margin: 0 0 30px 0; padding: 0 15px;">
            ${messageText}
          </p>

          <!-- Visual Progress Bar in Email -->
          <div style="margin: 30px 0; border-top: 1px solid #F0D6CE; padding-top: 25px;">
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
              <tr>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${order.status !== 'Cancelado' ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${order.status !== 'Cancelado' ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Recibido
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Confirmado
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Horneando
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Decoración', 'Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Decoración
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['Listo', 'En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Listo
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${['En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${['En camino', 'Entregado'].includes(order.status) ? '#C4847D' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  En Camino
                </td>
                <td style="width: 14%; font-size: 8px; font-family: sans-serif; color: ${order.status === 'Entregado' ? '#16A34A' : '#a1a1aa'};">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${order.status === 'Entregado' ? '#16A34A' : '#a1a1aa'}; margin: 0 auto 5px auto;"></div>
                  Entregado
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px; margin-top: 30px;">
            <h4 style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #523531; margin: 0 0 10px 0; font-weight: normal;">Detalles de tu Pastel</h4>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Modelo:</strong> ${order.productName}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Tamaño:</strong> ${order.size}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Código de seguimiento:</strong> ${order.trackingCode}</p>
            <p style="font-size: 12px; color: #8A5550; margin: 0 0 5px 0;"><strong>Entrega programada:</strong> ${order.deliveryDate} a las ${order.deliveryTime}</p>
            <!-- Barcode visual -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #F0D6CE;">
              ${getBarcodeSvg(`MR-${order.trackingCode}`)}
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="/?trackingCode=${order.trackingCode}&email=${encodeURIComponent(order.customerEmail)}" style="display: inline-block; background-color: #C4847D; color: #ffffff; padding: 14px 28px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 8px;">Ver Progreso del Pedido</a>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  function getContactEmailHTML(name: string, email: string | undefined, message: string) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 30px;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; color: #523531; margin: 0 0 15px 0; font-weight: normal;">Nuevo mensaje del formulario de contacto</h2>
          <p style="font-size: 13px; color: #8A5550; line-height: 1.6; margin: 0 0 20px 0;">Has recibido un nuevo mensaje desde el formulario de contacto de la web Maison Rosas.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500; width: 100px; vertical-align: top;">Nombre:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #8A5550;">${name}</td>
            </tr>
            ${email ? `<tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500; vertical-align: top;">Email:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #8A5550;">${email}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #C4A8A0; font-weight: 500; vertical-align: top;">Fecha:</td>
              <td style="padding: 8px 0; color: #8A5550;">${new Date().toLocaleString('es-PE')}</td>
            </tr>
          </table>
          <div style="background-color: #FFF9F5; border: 1px solid #F0D6CE; border-radius: 12px; padding: 20px; margin-top: 10px;">
            <p style="font-size: 13px; color: #8A5550; margin: 0 0 10px 0; font-weight: bold;">Mensaje:</p>
            <p style="font-size: 13px; color: #8A5550; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="font-size: 11px; color: #C4A8A0; margin-top: 20px; text-align: center;">
            Este mensaje fue enviado automáticamente desde el formulario de contacto de <strong>Maison Rosas</strong>.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;
  }

  function getOTPEmailHTML(customerName: string, email: string, otp: string, orders?: any[]) {
    const orderSummaryRows = orders && orders.length > 0
      ? orders.map(o => {
          const statusColor: any = {
            'Pendiente': '#D4A373', 'Confirmado': '#3B82F6', 'Preparando': '#8B5CF6',
            'Decoración': '#EC4899', 'Listo': '#10B981', 'En camino': '#F59E0B',
            'Entregado': '#16A34A', 'Cancelado': '#EF4444'
          };
          const color = statusColor[o.status] || '#A1A1AA';
          return `
            <tr style="border-bottom: 1px solid #F0D6CE;">
              <td style="padding: 10px 8px; font-size: 12px; color: #8A5550;">${o.productName || 'Pastel'}</td>
              <td style="padding: 10px 8px; font-size: 12px; color: #8A5550;">S/. ${o.totalPrice || '—'}</td>
              <td style="padding: 10px 8px; font-size: 12px;">
                <span style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">${o.status || '—'}</span>
              </td>
              <td style="padding: 10px 8px; font-size: 11px; font-family: monospace; color: #C4A8A0; letter-spacing: 1px;">${o.trackingCode || '—'}</td>
            </tr>
          `;
        }).join('')
      : '';

    const orderSummarySection = orders && orders.length > 0 ? `
      <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: #523531; margin: 25px 0 10px 0; font-weight: normal;">📋 Resumen de tus Pedidos</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #F0D6CE; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #FFF9F5;">
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A5550; text-align: left; font-weight: bold;">Pastel</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A5550; text-align: left; font-weight: bold;">Total</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A5550; text-align: left; font-weight: bold;">Estado</th>
            <th style="padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8A5550; text-align: left; font-weight: bold;">Código</th>
          </tr>
        </thead>
        <tbody>
          ${orderSummaryRows}
        </tbody>
      </table>
      <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #C4A8A0; text-align: center; margin: 0 0 10px 0;">
        Ingresa el código de verificación en la web de Maison Rosas para ver los detalles completos de cada pedido y su timeline de preparación.
      </p>` : '';

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #F0D6CE; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; color: #27272a;">
        ${getEmailHeader()}
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #523531; margin: 0 0 20px 0; text-align: center; font-style: italic; font-weight: normal;">🔐 Acceso a tus Pedidos</h2>
          
          <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #8A5550; line-height: 1.6; margin: 0 0 15px 0;">
            Hola, <strong>${customerName}</strong>.
          </p>
          
          <p style="font-family: 'Inter', sans-serif; font-size: 14px; color: #8A5550; line-height: 1.6; margin: 0 0 20px 0;">
            Has solicitado acceso a tus pedidos. Ingresa este código en la web de Maison Rosas:
          </p>
          
          <div style="background-color: #FFF9F5; border: 1px dashed #C4847D; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
            <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #D4A373; letter-spacing: 0.2em; font-weight: bold; display: block; margin-bottom: 10px;">Código de Verificación</span>
            <strong style="font-size: 38px; font-family: monospace; color: #C4847D; letter-spacing: 5px;">${otp}</strong>
            <span style="font-size: 11px; color: #C4A8A0; display: block; margin-top: 10px;">Este código es válido durante 10 minutos.</span>
          </div>
          
          ${orderSummarySection}
          
          <p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #C4A8A0; text-align: center; margin: 0; line-height: 1.5;">
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
    const emailRecipient = recipient || "edwinraulrosasalbines@gmail.com";
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

  // 5b. Contact Form API — sends real email via complete fallback chain: Resend → SMTP → simulated
  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, error: "Nombre y mensaje son requeridos." });
    }

    try {
      const htmlContent = getContactEmailHTML(name, email, message);
      const subject = `Nuevo mensaje de ${name} - Formulario de Contacto`;
      await sendSimulatedEmail(
        "edwinraulrosasalbines@gmail.com",
        subject,
        htmlContent
      );

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

      // 2. Collect a brief summary of all orders for this email
      const customerOrders: any[] = [];
      querySnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        const customerEmail = orderData?.customerEmail;
        if (customerEmail && customerEmail.toLowerCase() === normalizedEmail) {
          customerOrders.push({
            productName: orderData.productName || 'Pastel',
            totalPrice: orderData.totalPrice || '—',
            status: orderData.status || 'Pendiente',
            trackingCode: orderData.trackingCode || '—'
          });
        }
      });

      // 3. Generate 6 digit random number
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // 4. Save in Firestore for verification
      await setDoc(doc(db, "otps", normalizedEmail), {
        email: normalizedEmail,
        otp,
        expiresAt
      });

      // 5. Send email using SMTP with order summary included
      const htmlContent = getOTPEmailHTML(customerName, normalizedEmail, otp, customerOrders);
      await sendSimulatedEmail(normalizedEmail, `🔐 Tu código de acceso - Maison Rosas (${customerOrders.length} pedido${customerOrders.length !== 1 ? 's' : ''})`, htmlContent);

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

  // 8. Admin Secure File Upload API — stores images on disk and returns local URL
  app.post("/api/upload", verifyAdminSession, (req, res) => {
    upload.single("image")(req, res, async (err) => {
      if (err) {
        console.error("[UPLOAD] Multer error:", err.message || err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: "El archivo excede el tamaño máximo de 10MB." });
          }
          return res.status(400).json({ success: false, error: `Error de subida: ${err.message}` });
        }
        return res.status(400).json({ success: false, error: err.message || "Error al procesar el archivo." });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ success: false, error: "No se seleccionó ningún archivo." });
        }
        const localUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, imageUrl: localUrl });
      } catch (error) {
        console.error("[UPLOAD] Error inesperado:", error);
        res.status(500).json({ success: false, error: "Error interno del servidor al subir la imagen." });
      }
    });
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

  // ─── Progress Photo Endpoints ───
  // Add a progress photo (uses order doc update on server for Firestore rules compliance)
  app.post("/api/admin/orders/progress-photo", verifyAdminSession, async (req, res) => {
    const { orderId, imageUrl, caption, stage } = req.body;
    if (!orderId || !imageUrl) {
      return res.status(400).json({ success: false, error: "Faltan parámetros requeridos (orderId, imageUrl)." });
    }
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      }
      const orderData = orderSnap.data() as any;
      const existingPhotos = orderData.progressPhotos || [];
      const newPhoto = {
        id: `photo-${Date.now()}`,
        imageUrl,
        caption: caption || '',
        stage: stage || 'bizcocho',
        uploadedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, {
        progressPhotos: [...existingPhotos, newPhoto]
      });
      orderEmitter.emit("order", { ...orderData, progressPhotos: [...existingPhotos, newPhoto] });
      return res.json({ success: true, photo: newPhoto });
    } catch (error) {
      console.error("Error adding progress photo:", error);
      return res.status(500).json({ success: false, error: "Error al agregar foto de progreso." });
    }
  });

  // Delete a progress photo
  app.post("/api/admin/orders/delete-progress-photo", verifyAdminSession, async (req, res) => {
    const { orderId, photoId } = req.body;
    if (!orderId || !photoId) {
      return res.status(400).json({ success: false, error: "Faltan parámetros requeridos (orderId, photoId)." });
    }
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return res.status(404).json({ success: false, error: "Pedido no encontrado." });
      }
      const orderData = orderSnap.data() as any;
      const filtered = (orderData.progressPhotos || []).filter((p: any) => p.id !== photoId);
      await updateDoc(orderRef, {
        progressPhotos: filtered
      });
      orderEmitter.emit("order", { ...orderData, progressPhotos: filtered });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting progress photo:", error);
      return res.status(500).json({ success: false, error: "Error al eliminar foto de progreso." });
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

  // ═══════════════════════════════════════════════════════════════
  // 8. Admin Role Passwords Management API
  // ═══════════════════════════════════════════════════════════════
  // GET: Retrieve role passwords info (without exposing actual passwords)
  app.get("/api/admin/role-passwords", verifyAdminSession, async (req, res) => {
    try {
      const authDoc = await getDoc(doc(db, "config", "admin_auth"));
      if (!authDoc.exists()) {
        return res.json({ success: true, roles: { admin: true, analyst: false, stock_manager: false }, credentials_emailed: false });
      }
      const data = authDoc.data();
      const rolePasswords = data.rolePasswords || {};
      return res.json({
        success: true,
        roles: {
          admin: true,
          analyst: !!rolePasswords.analyst,
          stock_manager: !!rolePasswords.stock_manager
        },
        credentials_emailed: data.credentials_emailed || false
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al leer las contraseñas de roles." });
    }
  });

  // POST: Save role passwords (only admin can set)
  app.post("/api/admin/role-passwords", verifyAdminSession, async (req, res) => {
    const { analystPassword, stockManagerPassword } = req.body;
    try {
      const authDocRef = doc(db, "config", "admin_auth");
      const authDoc = await getDoc(authDocRef);
      const existingData = authDoc.exists() ? authDoc.data() : {};

      const salt = bcrypt.genSaltSync(10);
      const rolePasswords: any = { ...(existingData.rolePasswords || {}) };

      if (analystPassword && analystPassword.length >= 4) {
        rolePasswords.analyst = bcrypt.hashSync(analystPassword, salt);
      }
      if (stockManagerPassword && stockManagerPassword.length >= 4) {
        rolePasswords.stock_manager = bcrypt.hashSync(stockManagerPassword, salt);
      }

      await setDoc(authDocRef, { ...existingData, rolePasswords }, { merge: true });

      await logActivity('Contraseñas de roles', 'Se actualizaron las contraseñas de los roles de acceso.', 'admin');

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al guardar las contraseñas de roles." });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 8b. Change Admin Master Password
  // ═══════════════════════════════════════════════════════════════
  app.post("/api/admin/change-admin-password", verifyAdminSession, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Se requiere la contraseña actual y la nueva contraseña." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." });
    }

    try {
      const authDocRef = doc(db, "config", "admin_auth");
      const authDoc = await getDoc(authDocRef);
      if (!authDoc.exists()) {
        return res.status(400).json({ success: false, error: "No hay configuración de autenticación." });
      }

      const authData = authDoc.data();
      const { passwordHash } = authData;

      // Verify current password
      const isMatch = bcrypt.compareSync(currentPassword, passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "La contraseña actual es incorrecta." });
      }

      // Hash and save new password
      const salt = bcrypt.genSaltSync(10);
      const newPasswordHash = bcrypt.hashSync(newPassword, salt);

      await setDoc(authDocRef, { ...authData, passwordHash: newPasswordHash }, { merge: true });

      await logActivity('Contraseña maestra cambiada', 'El administrador cambió su contraseña maestra.', 'admin');

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al cambiar la contraseña." });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. Send One-Time Credentials Email API
  // ═══════════════════════════════════════════════════════════════
  app.post("/api/admin/send-credentials", verifyAdminSession, async (req, res) => {
    try {
      const authDoc = await getDoc(doc(db, "config", "admin_auth"));
      if (!authDoc.exists()) {
        return res.status(400).json({ success: false, error: "No hay configuración de autenticación." });
      }
      const authData = authDoc.data();

      // Prevent sending twice
      if (authData.credentials_emailed === true) {
        return res.json({ success: true, alreadySent: true, message: "Las credenciales ya fueron enviadas anteriormente." });
      }

      // Get the config info for the email
      const configDoc = await getDoc(doc(db, "config", "app_config"));
      const configInfo = configDoc.exists() ? configDoc.data() : {};

      // The role passwords are hashed, but we can only send the ones we know
      // We'll send a message that the passwords have been configured
      const rolePasswords = authData.rolePasswords || {};
      const plainPasswords = {
        admin: 'ADMIN_PASSWORD_PLACEHOLDER',
        analyst: rolePasswords.analyst ? '🔒 Configurada por el admin' : 'ANALYST_PASSWORD_PLACEHOLDER (por defecto)',
        stock_manager: rolePasswords.stock_manager ? '🔒 Configurada por el admin' : 'STOCK_PASSWORD_PLACEHOLDER (por defecto)'
      };

      const htmlContent = getCredentialsEmailHTML(plainPasswords, configInfo);
      await sendSimulatedEmail(
        configInfo.email || "edwinraulrosasalbines@gmail.com",
        "🔐 Credenciales del Panel de Administración - Maison Rosas",
        htmlContent
      );

      // Mark as emailed
      await setDoc(doc(db, "config", "admin_auth"), { credentials_emailed: true }, { merge: true });

      await logActivity('Credenciales enviadas', 'Se enviaron las credenciales de acceso por correo electrónico al administrador.', 'admin');

      return res.json({ success: true, alreadySent: false });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Error al enviar las credenciales." });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. Activity Logs Retrieval API
  // ═══════════════════════════════════════════════════════════════
  app.get("/api/admin/activity-log", verifyAdminSession, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "activity_logs"));
      const logs: any[] = [];
      snap.forEach((doc) => {
        logs.push(doc.data());
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.json({ success: true, logs: logs.slice(0, 50) });
    } catch (error) {
      return res.json({ success: true, logs: [] });
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


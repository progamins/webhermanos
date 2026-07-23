import logger from '../lib/logger.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { getEmailTemplates } from '../emails/templates.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export class EmailService {
  async sendOrderConfirmation(order: any): Promise<boolean> {
    return this.sendEmail(
      order.customerEmail,
      '🎂 ¡Tu Pedido en Maison Rosas ha sido Recibido!',
      getEmailTemplates().confirmation(order)
    );
  }

  async sendStatusUpdate(order: any): Promise<boolean> {
    const subjectMap: Record<string, string> = {
      Confirmado: '✅ ¡Tu Pedido ha sido Confirmado!',
      Preparando: '👩‍🍳 ¡Carol está Horneando tu Pastel!',
      Decoración: '🎨 ¡Tu Pastel está siendo Decorado!',
      Listo: '🎉 ¡Tu Pastel está Listo!',
      'En camino': '🚚 ¡Tu Pastel va en Camino!',
      Entregado: '✨ ¡Tu Pastel ha sido Entregado!',
      Cancelado: 'ℹ️ Actualización de tu Pedido en Maison Rosas',
    };

    const subject = subjectMap[order.status] || '📬 Actualización de tu Pedido en Maison Rosas';

    return this.sendEmail(
      order.customerEmail,
      subject,
      getEmailTemplates().statusUpdate(order)
    );
  }

  async sendContactNotification(name: string, email: string | undefined, message: string): Promise<boolean> {
    return this.sendEmail(
      env.SMTP_USER || 'edwinraulrosasalbines@gmail.com',
      `✉️ Nuevo mensaje de contacto de ${name}`,
      getEmailTemplates().contact(name, email, message)
    );
  }

  async sendOTP(customerName: string, email: string, otp: string, orders?: any[]): Promise<boolean> {
    return this.sendEmail(
      email,
      '🔐 Código de Acceso - Maison Rosas',
      getEmailTemplates().otp(customerName, email, otp, orders)
    );
  }

  async sendCredentials(passwords: { admin: string; analyst: string; stock_manager: string }, configInfo?: any): Promise<boolean> {
    return this.sendEmail(
      env.SMTP_USER || 'edwinraulrosasalbines@gmail.com',
      '🔐 Credenciales del Panel de Administración - Maison Rosas',
      getEmailTemplates().credentials(passwords, configInfo)
    );
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    // Try Resend first if configured
    if (env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from: env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev',
          to,
          subject,
          html,
        });
        logger.info('Sent via Resend', { service: 'EMAIL', to, subject, length: html.length });
        return true;
      } catch (err: any) {
        logger.warn('Resend failed, falling back to SMTP', { service: 'EMAIL', error: err?.message });
      }
    }

    // Fall back to SMTP
    const t = getTransporter();
    if (!t) {
      logger.warn('No SMTP transporter configured. Email not sent.', { service: 'EMAIL' });
      return false;
    }

    try {
      await t.sendMail({
        from: `"${env.EMAIL_SENDER_NAME}" <${env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      logger.info('Sent via SMTP', { service: 'EMAIL', to, subject });
      return true;
    } catch (err: any) {
      logger.error('SMTP error', { service: 'EMAIL', error: err?.message });
      return false;
    }
  }
}

export const emailService = new EmailService();

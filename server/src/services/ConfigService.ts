import logger from '../lib/logger.js';
import type { AppConfig } from '../lib/types.js';
import { ConfigRepository } from '../repositories/index.js';

const configRepo = new ConfigRepository();

const DEFAULT_CONFIG = {
  whatsappNumber: '51902568187',
  facebookUrl: 'https://www.facebook.com/edwinraul.rosasalbines',
  instagramUrl: 'https://www.instagram.com/edwinraulrosas741/',
  email: 'edwinraulrosasalbines@gmail.com',
  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM',
  seoTitle: 'Maison Rosas | Pastelería de Autor & Repostería Fina',
  seoDescription: 'Deléitate con los pasteles personalizados de Carol Rosas Albines.',
  maintenanceMode: false,
  heroTitle: 'El Arte de Compartir',
  heroDescription: 'Diseños exclusivos creados por Carol Rosas.',
  heroBadge: 'Por Carol & Edwin Rosas Albines',
  aboutTitle: 'Nuestra Esencia Familiar',
  aboutDescription: 'En Maison Rosas, la repostería es un legado familiar de amor y dedicación.',
  logoUrl: '',
  faviconUrl: '',
  heroImage: '',
  aboutImage: '',

  // ─── Atención Automática (asistente web) ───
  // Horarios estructurados por día (Date.getDay(): 0 = Domingo ... 6 = Sábado).
  // Reflejan exactamente el texto de openingHours: Lun-Sáb 9:00-19:00, Dom 10:00-14:00.
  assistantEnabled: true,
  assistantWelcomeMessage: '¡Hola! 👋 Bienvenido(a) a Maison Rosas. ¿En qué podemos ayudarte?',
  assistantClosedMessage: 'Actualmente estamos fuera de horario 😴 Puedes dejar tu pedido por WhatsApp y te atenderemos apenas estemos disponibles.',
  assistantWhatsappMessage: 'Hola Carol y Edwin 🍰 Vengo de la web de Maison Rosas y me gustaría hacer una consulta.',
  businessHours: [
    { day: 1, open: '09:00', close: '19:00' },
    { day: 2, open: '09:00', close: '19:00' },
    { day: 3, open: '09:00', close: '19:00' },
    { day: 4, open: '09:00', close: '19:00' },
    { day: 5, open: '09:00', close: '19:00' },
    { day: 6, open: '09:00', close: '19:00' },
    { day: 0, open: '10:00', close: '14:00' },
  ],
};

export class ConfigService {
  async getAppConfig(): Promise<AppConfig> {
    const config = await configRepo.getAppConfig();
    if (!config) {
      await configRepo.setAppConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    return { ...DEFAULT_CONFIG, ...config };
  }

  async updateAppConfig(data: Partial<AppConfig>): Promise<AppConfig> {
    const current = await this.getAppConfig();
    const merged = { ...current, ...data };
    await configRepo.setAppConfig(merged);
    return merged;
  }

  async getAdminAuth(): Promise<{ role: string; password_hash: string; active_session_token?: string } | null> {
    return configRepo.getAdminAuth();
  }

  async setAdminAuth(data: { role: string; password_hash?: string }): Promise<void> {
    await configRepo.setAdminAuth(data);
  }
}

export const configService = new ConfigService();

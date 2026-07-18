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
};

export class ConfigService {
  async getAppConfig(): Promise<any> {
    const config = await configRepo.getAppConfig();
    if (!config) {
      await configRepo.setAppConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    return { ...DEFAULT_CONFIG, ...config };
  }

  async updateAppConfig(data: any): Promise<any> {
    const current = await this.getAppConfig();
    const merged = { ...current, ...data };
    await configRepo.setAppConfig(merged);
    return merged;
  }

  async getAdminAuth(): Promise<any | null> {
    return configRepo.getAdminAuth();
  }

  async setAdminAuth(data: any): Promise<void> {
    await configRepo.setAdminAuth(data);
  }
}

export const configService = new ConfigService();

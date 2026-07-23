import logger from '../lib/logger.js';
import { env } from '../config/env.js';

export class AiService {
  private client: any = null;

  async initialize(): Promise<void> {
    if (!env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not configured. AI features disabled.', { service: 'AI' });
      return;
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      logger.info('Gemini AI initialized', { service: 'AI' });
    } catch (err) {
      logger.warn('Failed to initialize Gemini', { service: 'AI', error: (err as Error)?.message });
    }
  }

  async generateDescription(prompt: string): Promise<string> {
    if (!this.client) return '';

    try {
      const result = await this.client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      return result.text || '';
    } catch (err: any) {
      logger.error('Generation error', { service: 'AI', error: err?.message });
      return '';
    }
  }

  async suggestFlavors(productName: string): Promise<string[]> {
    const prompt = `Sugiere 3 sabores populares para un pastel llamado "${productName}" en Perú. Responde solo los nombres separados por coma.`;
    const result = await this.generateDescription(prompt);
    return result.split(',').map(s => s.trim()).filter(Boolean);
  }
}

export const aiService = new AiService();

import logger from '../lib/logger.js';
import { otpToRow } from '../lib/rowMapper.js';
import { OtpRepository } from '../repositories/index.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { emailService } from './EmailService.js';

const otpRepo = new OtpRepository();

export class OtpService {
  async generateAndSend(email: string, customerName: string, orders?: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate 6-digit OTP
      const code = crypto.randomInt(100000, 999999).toString();

      // Store OTP (10 min expiry)
      await otpRepo.create(
        otpToRow(
          uuidv4(),
          email,
          code,
          new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
        )
      );

      // Send email
      await emailService.sendOTP(customerName, email, code, orders);

      return { success: true };
    } catch (error: any) {
      logger.error('OTP generation error', { service: 'OtpService', error: (error as Error)?.message });
      return { success: false, error: 'Error al generar código de verificación.' };
    }
  }

  async verify(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const validOtp = await otpRepo.findValidByEmail(email, code);
      if (!validOtp) {
        return { success: false, error: 'Código inválido o expirado.' };
      }

      await otpRepo.markAsUsed(validOtp.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Error al verificar código.' };
    }
  }
}

export const otpService = new OtpService();

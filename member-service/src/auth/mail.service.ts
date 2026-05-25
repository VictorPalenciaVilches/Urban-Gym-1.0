import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: this.configService.get<boolean>('SMTP_SECURE') || false, // true para 465, false para otros puertos
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName: string) {
    const isSmtpConfigured = !!this.configService.get<string>('SMTP_USER');

    if (!isSmtpConfigured) {
      this.logger.warn(`SMTP no está configurado. Simular envío de correo a ${email}`);
      this.logger.warn(`Link de reseteo: ${resetLink}`);
      return;
    }

    try {
      const mailOptions = {
        from: `"UrbanGym Support" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'Recuperación de Contraseña - UrbanGym',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">UrbanGym</h2>
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p>Si no fuiste tú, puedes ignorar este correo de forma segura.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Restablecer mi contraseña
              </a>
            </div>
            <p style="font-size: 12px; color: #888;">Este enlace expirará en 15 minutos por motivos de seguridad.</p>
            <p style="font-size: 12px; color: #888; margin-top: 20px; text-align: center;">&copy; ${new Date().getFullYear()} UrbanGym. Todos los derechos reservados.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Correo de recuperación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${email}:`, error);
      throw new Error('Error enviando el correo de recuperación');
    }
  }
}

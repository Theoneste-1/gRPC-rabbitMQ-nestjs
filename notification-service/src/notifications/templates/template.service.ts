import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailPriority } from '../email.types';

type Payload = Record<string, unknown>;

@Injectable()
export class TemplateService {
  constructor(private readonly configService: ConfigService) {}

  build(eventName: string, payload: Payload): EmailMessage | null {
    const templates: Record<string, () => EmailMessage | null> = {
      'user.registered': () => this.welcome(payload),
      'email.verification.requested': () => this.emailVerification(payload),
      'password.reset.requested': () => this.passwordReset(payload),
      'password.reset.successful': () => this.passwordResetSuccessful(payload),
      'account.activated': () => this.accountStatus(payload, 'activated'),
      'account.deactivated': () => this.accountStatus(payload, 'deactivated'),
      'account.deleted': () => this.accountLifecycle(payload, 'deleted'),
      'account.restored': () => this.accountLifecycle(payload, 'restored'),
      'login.new_device': () => this.securityAlert(payload),
      'user.role.changed': () => this.roleChanged(payload),
      'parking.created': () => this.operatorAlert('New parking location created', payload, 'medium'),
      'parking.capacity.changed': () => this.operatorAlert('Parking capacity changed', payload, 'low'),
      'parking.almost.full': () => this.operatorAlert('Parking almost full', payload, 'medium'),
      'car.entered': () => this.transactionReceipt(payload, 'entry'),
      'car.exited': () => this.transactionReceipt(payload, 'exit'),
      'overstay.violation': () => this.driverAlert('Parking overstay violation', payload, 'high'),
      'payment.failed': () => this.driverAlert('Parking payment failed', payload, 'critical'),
      'parking.session.expiring_soon': () => this.driverAlert('Parking session expiring soon', payload, 'medium'),
      'report.daily_revenue': () => this.operatorAlert('Daily revenue report', payload, 'medium'),
      'report.weekly': () => this.operatorAlert('Weekly parking report', payload, 'medium'),
      'report.monthly': () => this.operatorAlert('Monthly parking report', payload, 'medium'),
      'activity.unusual': () => this.operatorAlert('Unusual parking activity detected', payload, 'high'),
      'system.maintenance': () => this.operatorAlert('System maintenance notice', payload, 'medium'),
      'system.critical_error': () => this.operatorAlert('Critical system error', payload, 'critical'),
      'attendant.onboarded': () => this.attendantOnboarded(payload),
    };

    return templates[eventName]?.() ?? null;
  }

  private welcome(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    const name = this.name(payload);
    const activationUrl = this.string(payload.activationUrl);

    return this.message(
      email,
      'Welcome to Parking System',
      `Hello ${name}, your account has been created.${activationUrl ? ` Activate it here: ${activationUrl}` : ''}`,
      'high',
    );
  }

  private emailVerification(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      'Verify your email address',
      `Please verify your email using this link: ${this.string(payload.verificationUrl)}`,
      'high',
    );
  }

  private passwordReset(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      'Reset your password',
      `Use this secure reset link: ${this.string(payload.resetUrl)}. It expires at ${this.string(payload.expiresAt)}.`,
      'critical',
    );
  }

  private passwordResetSuccessful(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(email, 'Password reset successful', 'Your password was reset successfully.', 'medium');
  }

  private accountStatus(payload: Payload, status: string): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      `Account ${status}`,
      `Your Parking System account has been ${status}.`,
      'medium',
    );
  }

  private accountLifecycle(payload: Payload, action: string): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      `Account ${action}`,
      `Your Parking System account has been ${action}.`,
      'low',
    );
  }

  private securityAlert(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      'Security alert: new login detected',
      `A login was detected from ${this.string(payload.device, 'a new device')} at ${this.string(payload.loginTime)}.`,
      'high',
    );
  }

  private roleChanged(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      'Your role has changed',
      `Your account role is now ${this.string(payload.role)}.`,
      'medium',
    );
  }

  private transactionReceipt(payload: Payload, type: 'entry' | 'exit'): EmailMessage | null {
    const email = this.toEmail(payload, 'driverEmail');
    if (!email) return null;

    const subject = type === 'entry' ? 'Parking ticket issued' : 'Parking payment receipt';
    const amount = payload.totalAmount ?? payload.chargedAmount;
    const body =
      type === 'entry'
        ? `Ticket ${this.string(payload.ticketId)} issued for ${this.string(payload.plateNumber)} at ${this.string(payload.parkingName)}.`
        : `Receipt for ${this.string(payload.plateNumber)} at ${this.string(payload.parkingName)}. Total amount: ${this.string(amount)}.`;

    return this.message(email, subject, body, type === 'entry' ? 'medium' : 'high');
  }

  private driverAlert(subject: string, payload: Payload, priority: EmailPriority): EmailMessage | null {
    const email = this.toEmail(payload, 'driverEmail');
    if (!email) return null;

    return this.message(email, subject, this.details(payload), priority);
  }

  private attendantOnboarded(payload: Payload): EmailMessage | null {
    const email = this.toEmail(payload);
    if (!email) return null;

    return this.message(
      email,
      'Your attendant account is ready',
      `Your attendant account has been created. Login email: ${email}`,
      'high',
    );
  }

  private operatorAlert(subject: string, payload: Payload, priority: EmailPriority): EmailMessage {
    const recipients = this.operatorRecipients();
    return this.message(recipients, subject, this.details(payload), priority);
  }

  private message(
    to: string | string[],
    subject: string,
    text: string,
    priority: EmailPriority,
  ): EmailMessage {
    return {
      to,
      subject,
      text,
      html: `<p>${this.escape(text).replace(/\n/g, '<br>')}</p>`,
      priority,
    };
  }

  private details(payload: Payload): string {
    return Object.entries(payload)
      .filter(([, value]) => value !== undefined && value !== null && typeof value !== 'object')
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  }

  private toEmail(payload: Payload, key = 'email'): string | null {
    const value = payload[key];
    return typeof value === 'string' && value.includes('@') ? value : null;
  }

  private operatorRecipients(): string[] {
    return this.configService
      .get<string>('OPERATOR_EMAILS', 'admin@parking.local')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  private name(payload: Payload): string {
    return this.string(payload.firstName, 'there');
  }

  private string(value: unknown, fallback = ''): string {
    return value === undefined || value === null ? fallback : String(value);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

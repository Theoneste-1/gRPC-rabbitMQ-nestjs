export type EmailPriority = 'critical' | 'high' | 'medium' | 'low';

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  priority: EmailPriority;
};

export type DomainEvent = {
  event: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

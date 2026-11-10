import { GMAIL_SMTP_DAILY_LIMIT } from '@mailcraft/shared-types';
import { jsonSuccess } from '@/lib/api-response';

export async function GET() {
  return jsonSuccess([
    {
      id: 'gmail',
      name: 'Google Gmail (OAuth 2.0)',
      channel: 'low_volume',
      description: 'Send directly from your verified Google account. Ideal for personal testing and VIP blasts.',
      maxDailyRecipients: 500,
      requiresDnsSetup: false,
      authMethod: 'oauth2_pkce',
      icon: 'gmail',
    },
    {
      id: 'gmail_smtp',
      name: 'Gmail + App Password (SMTP)',
      channel: 'medium_volume',
      description: `Connect any Gmail or Google Workspace inbox with a 16-character App Password. Enforces a strict ${GMAIL_SMTP_DAILY_LIMIT.toLocaleString()} emails/day sending limit.`,
      maxDailyRecipients: GMAIL_SMTP_DAILY_LIMIT,
      requiresDnsSetup: false,
      authMethod: 'app_password_smtp',
      icon: 'gmail_smtp',
    },
    {
      id: 'brevo',
      name: 'Brevo (formerly Sendinblue)',
      channel: 'bulk',
      description: 'High-throughput promotional delivery platform with dedicated IP options and bounce tracking.',
      maxDailyRecipients: 50000,
      requiresDnsSetup: true,
      authMethod: 'api_key',
      icon: 'brevo',
    },
    {
      id: 'ses',
      name: 'Amazon Simple Email Service (SES)',
      channel: 'bulk',
      description: 'Enterprise cost-effective bulk delivery with ISP feedback loops and high deliverability.',
      maxDailyRecipients: 100000,
      requiresDnsSetup: true,
      authMethod: 'api_credentials',
      icon: 'aws',
    },
  ]);
}

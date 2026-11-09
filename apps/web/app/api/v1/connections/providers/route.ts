import { NextResponse } from 'next/server';
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


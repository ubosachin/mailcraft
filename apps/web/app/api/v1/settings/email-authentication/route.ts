import { NextRequest } from 'next/server';
import { connectToDatabase, Brand } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) return jsonError('Authentication required', 401);

    await connectToDatabase();
    const brand = await Brand.findOne({ sessionId: session._id });

    let defaultDomain = '';
    if (brand?.senderEmail && brand.senderEmail.includes('@')) {
      defaultDomain = brand.senderEmail.split('@')[1];
    } else if (brand?.website) {
      try {
        const u = new URL(brand.website);
        defaultDomain = u.hostname.replace(/^www\./, '');
      } catch {
        //
      }
    }

    return jsonSuccess({
      defaultDomain,
      standards: [
        {
          name: 'SPF (Sender Policy Framework)',
          purpose: 'Specifies which mail servers are authorized to send email on behalf of your domain.',
          whyItMatters: 'Prevents spammers from spoofing your domain and improves inbox delivery rates.',
          exampleRecord: 'v=spf1 include:_spf.google.com include:spf.brevo.com include:amazonses.com ~all',
          recordType: 'TXT',
          host: '@ (root domain)',
        },
        {
          name: 'DKIM (DomainKeys Identified Mail)',
          purpose: 'Attaches an immutable digital cryptographic signature to emails verified by public key in DNS.',
          whyItMatters: 'Ensures the email content has not been tampered with in transit between sending and receiving mailboxes.',
          exampleRecord: 'mailcraft._domainkey.yourdomain.com CNAME mailcraft.dkim.provider.com',
          recordType: 'CNAME or TXT',
          host: 'selector._domainkey',
        },
        {
          name: 'DMARC (Domain-based Message Authentication, Reporting and Conformance)',
          purpose: 'Instructs recipient mail servers how to treat messages that fail SPF or DKIM checks.',
          whyItMatters: 'Enforces domain protection against phishing, impersonation, and enables daily aggregate delivery reports.',
          exampleRecord: 'v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@yourdomain.com',
          recordType: 'TXT',
          host: '_dmarc',
        },
      ],
      providerInstructions: {
        brevo: {
          steps: [
            'Go to Brevo Dashboard > Senders & IP > Domains.',
            'Add your sending domain and copy the provided Brevo code TXT, SPF include, and DKIM keys.',
            'Publish the TXT records to your DNS hosting provider (Cloudflare, GoDaddy, Namecheap, Route53).',
          ],
        },
        ses: {
          steps: [
            'Go to AWS SES Console > Verified Identities.',
            'Select "Create Identity" > Domain, and enable Easy-DKIM.',
            'Publish the three CNAME DKIM records and the MAIL FROM MX & SPF records into your DNS provider.',
          ],
        },
        gmail: {
          steps: [
            'Google OAuth 2.0 automatically uses Google infrastructure.',
            'Ensure your Google Workspace domain has SPF ("include:_spf.google.com ~all") and Google Workspace DKIM turned ON.',
          ],
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


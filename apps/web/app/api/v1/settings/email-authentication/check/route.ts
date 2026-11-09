import { NextRequest } from 'next/server';
import dns from 'node:dns/promises';
import { dnsCheckSchema } from '@mailcraft/validation';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { IDnsCheckResult } from '@mailcraft/shared-types';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) return jsonError('Guest session required', 401);

    const body = await request.json();
    const { domain } = dnsCheckSchema.parse(body);

    const result: IDnsCheckResult = {
      domain,
      spf: {
        configured: false,
        status: 'not_configured',
        guidance: 'Add a TXT record with "v=spf1 include:... ~all" to authorize sending servers.',
      },
      dkim: {
        configured: false,
        status: 'not_configured',
        guidance: 'Generate DKIM CNAME or TXT keys in your provider dashboard (e.g. Brevo or SES) and publish to DNS.',
      },
      dmarc: {
        configured: false,
        status: 'not_configured',
        guidance: 'Publish a TXT record at _dmarc.' + domain + ' with "v=DMARC1; p=none; sp=none; rua=mailto:dmarc@' + domain + '".',
      },
    };

    // 1. Live SPF DNS Query
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const flattened = txtRecords.map((chunks) => chunks.join(''));
      const spfRecord = flattened.find((r) => r.startsWith('v=spf1'));

      if (spfRecord) {
        result.spf.configured = true;
        result.spf.record = spfRecord;
        result.spf.status = 'verified';
        result.spf.guidance = 'Valid SPF record detected in live DNS.';
      } else {
        result.spf.status = 'action_required';
      }
    } catch (dnsErr: any) {
      if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA') {
        result.spf.status = 'not_configured';
      } else {
        result.spf.status = 'action_required';
        result.spf.guidance = `DNS lookup failed: ${dnsErr.code || dnsErr.message}`;
      }
    }

    // 2. Live DMARC DNS Query at _dmarc.<domain>
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const dmarcTxtRecords = await dns.resolveTxt(dmarcDomain);
      const flattenedDmarc = dmarcTxtRecords.map((chunks) => chunks.join(''));
      const dmarcRecord = flattenedDmarc.find((r) => r.toLowerCase().startsWith('v=dmarc1'));

      if (dmarcRecord) {
        result.dmarc.configured = true;
        result.dmarc.record = dmarcRecord;
        result.dmarc.status = 'verified';

        // Extract policy
        if (dmarcRecord.includes('p=reject')) {
          result.dmarc.policy = 'reject';
        } else if (dmarcRecord.includes('p=quarantine')) {
          result.dmarc.policy = 'quarantine';
        } else {
          result.dmarc.policy = 'none';
        }
        result.dmarc.guidance = `Valid DMARC policy (${result.dmarc.policy || 'none'}) detected in live DNS.`;
      } else {
        result.dmarc.status = 'action_required';
      }
    } catch (dmarcErr: any) {
      if (dmarcErr.code === 'ENOTFOUND' || dmarcErr.code === 'ENODATA') {
        result.dmarc.status = 'not_configured';
      } else {
        result.dmarc.status = 'action_required';
        result.dmarc.guidance = `DMARC query returned: ${dmarcErr.code || dmarcErr.message}`;
      }
    }

    return jsonSuccess(result, 200, 'DNS lookup performed against authoritative nameservers');
  } catch (error) {
    return handleApiError(error);
  }
}


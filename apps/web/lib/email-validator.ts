import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import { connectToDatabase, Suppression, Contact } from '@mailcraft/database';
import { Types } from 'mongoose';

// RFC 5322 compliant regex for practical email validation
const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailSyntaxResult {
  valid: boolean;
  normalizedEmail: string;
  domain: string;
  error?: string;
}

export interface EmailValidationResult {
  email: string;
  normalizedEmail: string;
  domain: string;
  syntaxValid: boolean;
  mxValid?: boolean;
  isSuppressed: boolean;
  suppressionReason?: string;
  isExisting: boolean;
  error?: string;
}

/**
 * Layer 1: Syntax Validation & Normalization
 */
export function validateEmailSyntax(rawEmail: string): EmailSyntaxResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { valid: false, normalizedEmail: '', domain: '', error: 'Email cannot be empty' };
  }

  const normalized = rawEmail.toLowerCase().trim();

  if (normalized.length > 254) {
    return { valid: false, normalizedEmail: normalized, domain: '', error: 'Email exceeds 254 characters' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, normalizedEmail: normalized, domain: '', error: 'Email must contain exactly one @ symbol' };
  }

  const [localPart, domain] = parts;

  if (localPart.length === 0 || localPart.length > 64) {
    return { valid: false, normalizedEmail: normalized, domain, error: 'Local part must be between 1 and 64 characters' };
  }

  if (domain.length === 0 || !domain.includes('.')) {
    return { valid: false, normalizedEmail: normalized, domain, error: 'Domain must contain a valid TLD' };
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, normalizedEmail: normalized, domain, error: 'Domain contains invalid consecutive dots' };
  }

  if (!RFC_EMAIL_REGEX.test(normalized)) {
    return { valid: false, normalizedEmail: normalized, domain, error: 'Malformed email syntax' };
  }

  return {
    valid: true,
    normalizedEmail: normalized,
    domain,
  };
}

/**
 * Layer 2: Domain Validation with DNS MX Record Check (bounded by timeout)
 */
export async function checkDomainMx(domain: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const mxPromise = dns.resolveMx(domain);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS query timed out')), timeoutMs)
    );

    const records = await Promise.race([mxPromise, timeoutPromise]);
    return Array.isArray(records) && records.length > 0;
  } catch {
    // If MX check fails or times out, return false without blocking
    return false;
  }
}

/**
 * Layer 3: Suppression & Existing Contacts Check for a batch of emails
 */
export async function validateEmailBatch(
  emails: string[],
  sessionId: string | Types.ObjectId,
  options: { checkDns?: boolean } = {}
): Promise<Map<string, EmailValidationResult>> {
  await connectToDatabase();
  const sessionObjId = typeof sessionId === 'string' ? new Types.ObjectId(sessionId) : sessionId;

  const results = new Map<string, EmailValidationResult>();
  const validEmails: string[] = [];
  const validDomains = new Set<string>();

  // Pass 1: Syntax
  for (const raw of emails) {
    const syntax = validateEmailSyntax(raw);
    if (!syntax.valid) {
      results.set(raw, {
        email: raw,
        normalizedEmail: syntax.normalizedEmail,
        domain: syntax.domain,
        syntaxValid: false,
        isSuppressed: false,
        isExisting: false,
        error: syntax.error,
      });
    } else {
      validEmails.push(syntax.normalizedEmail);
      validDomains.add(syntax.domain);
      results.set(raw, {
        email: raw,
        normalizedEmail: syntax.normalizedEmail,
        domain: syntax.domain,
        syntaxValid: true,
        isSuppressed: false,
        isExisting: false,
      });
    }
  }

  if (validEmails.length === 0) {
    return results;
  }

  // Pass 2: Suppressions (Global + Session)
  const hashes = validEmails.map((e) => crypto.createHash('sha256').update(e).digest('hex'));
  const suppressionRecords = await Suppression.find({
    emailHash: { $in: hashes },
    $or: [{ scope: 'global' }, { sessionId: sessionObjId }],
  });

  const suppressionMap = new Map<string, string>();
  for (const s of suppressionRecords) {
    suppressionMap.set(s.emailHash, s.reason);
  }

  // Pass 3: Existing contacts in workspace
  const existingContacts = await Contact.find({
    sessionId: sessionObjId,
    normalizedEmail: { $in: validEmails },
  }).select('normalizedEmail');

  const existingSet = new Set(existingContacts.map((c) => c.normalizedEmail));

  // Pass 4: Optional DNS MX check on unique domains
  const domainMxMap = new Map<string, boolean>();
  if (options.checkDns) {
    const domainChecks = Array.from(validDomains).map(async (d) => {
      const hasMx = await checkDomainMx(d);
      domainMxMap.set(d, hasMx);
    });
    await Promise.allSettled(domainChecks);
  }

  // Assemble final results
  for (const [raw, res] of results.entries()) {
    if (res.syntaxValid) {
      const hash = crypto.createHash('sha256').update(res.normalizedEmail).digest('hex');
      const suppReason = suppressionMap.get(hash);
      if (suppReason) {
        res.isSuppressed = true;
        res.suppressionReason = suppReason;
      }

      if (existingSet.has(res.normalizedEmail)) {
        res.isExisting = true;
      }

      if (options.checkDns) {
        res.mxValid = domainMxMap.get(res.domain) ?? true;
      }
    }
  }

  return results;
}

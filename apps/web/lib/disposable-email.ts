/**
 * Common disposable / throwaway email domains used by abusers and bots
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'grr.la',
  'mailinator.com',
  'yopmail.com',
  'yopmail.fr',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'getairmail.com',
  'dispostable.com',
  'fakemailgenerator.com',
  'mohmal.com',
  'maildrop.cc',
  'burnermail.io',
  'crazymailing.com',
  'generator.email',
]);

/**
 * Checks if an email belongs to a known disposable/throwaway domain
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;

  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return true;
  }

  // Check subdomains
  const parts = domain.split('.');
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (DISPOSABLE_DOMAINS.has(rootDomain)) {
      return true;
    }
  }

  return false;
}


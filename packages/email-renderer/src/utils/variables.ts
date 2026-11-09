import { RenderEmailOptions } from '../types/template.types.js';

export function interpolateVariables(
  text: string,
  options: RenderEmailOptions,
  customVars?: Record<string, string>
): string {
  if (typeof text !== 'string') return '';

  const brandName = options.brand?.brandName || 'Our Brand';
  const senderName = options.brand?.senderName || brandName || 'Team';
  const websiteUrl = options.brand?.website || 'https://example.com';
  const footerAddress = options.brand?.footerAddress || '123 Business Way, Suite 100';
  
  // Parse recipient names cleanly
  let firstName = options.recipient?.firstName;
  let lastName = options.recipient?.lastName;
  const fullName = options.recipient?.name || '';
  
  if (!firstName && fullName) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0];
    if (parts.length > 1) {
      lastName = parts.slice(1).join(' ');
    }
  }
  
  const recipientName = fullName || firstName || 'Friend';
  firstName = firstName || recipientName || 'there';
  lastName = lastName || '';
  
  const unsubscribeUrl = options.recipient?.unsubscribeUrl || '#unsubscribe';
  const couponCode = customVars?.coupon_code || 'WELCOME';

  let result = text
    .replace(/{{\s*recipient_name\s*}}/gi, recipientName)
    .replace(/{{\s*first_name\s*}}/gi, firstName)
    .replace(/{{\s*last_name\s*}}/gi, lastName)
    .replace(/{{\s*brand_name\s*}}/gi, brandName)
    .replace(/{{\s*sender_name\s*}}/gi, senderName)
    .replace(/{{\s*website_url\s*}}/gi, websiteUrl)
    .replace(/{{\s*coupon_code\s*}}/gi, couponCode)
    .replace(/{{\s*footer_address\s*}}/gi, footerAddress)
    .replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl);

  // Replace any custom variables
  if (customVars) {
    for (const [key, val] of Object.entries(customVars)) {
      const reg = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(reg, val || '');
    }
  }

  // Remove any remaining unresolved {{...}} placeholders safely so email is clean
  result = result.replace(/{{\s*[a-zA-Z0-9_-]+\s*}}/g, '');

  return result;
}


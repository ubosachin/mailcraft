import crypto from 'node:crypto';
import { TrackingToken } from '@mailcraft/database';

export async function wrapEmailTracking(
  html: string,
  options: {
    appUrl: string;
    campaignId: any;
    recipientId: any;
    contactId?: any;
    sessionId: any;
  }
): Promise<string> {
  let transformed = html;

  // 1. Click Tracking
  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const matches = [...transformed.matchAll(hrefRegex)];

  for (const match of matches) {
    const originalUrl = match[1];
    if (
      originalUrl.includes('/unsubscribe') ||
      originalUrl.includes('mailto:') ||
      originalUrl.includes('tel:') ||
      originalUrl.startsWith('#')
    ) {
      continue;
    }

    try {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await TrackingToken.create({
        tokenHash,
        type: 'click',
        campaignId: options.campaignId,
        campaignRecipientId: options.recipientId,
        contactId: options.contactId || null,
        sessionId: options.sessionId,
        destinationUrl: originalUrl,
        expiresAt: new Date(Date.now() + 90 * 86400 * 1000),
      });

      const trackingUrl = `${options.appUrl}/track/click/${token}`;
      transformed = transformed.replace(
        match[0],
        match[0].replace(originalUrl, trackingUrl)
      );
    } catch (err) {
      console.error('[Worker Tracking] Failed to create click token:', err);
    }
  }

  // 2. Open Tracking Pixel
  try {
    const openToken = crypto.randomBytes(32).toString('base64url');
    const openTokenHash = crypto.createHash('sha256').update(openToken).digest('hex');

    await TrackingToken.create({
      tokenHash: openTokenHash,
      type: 'open',
      campaignId: options.campaignId,
      campaignRecipientId: options.recipientId,
      contactId: options.contactId || null,
      sessionId: options.sessionId,
      expiresAt: new Date(Date.now() + 90 * 86400 * 1000),
    });

    const pixelTag = `<img src="${options.appUrl}/track/open/${openToken}" width="1" height="1" alt="" style="display:none!important;max-height:0px;max-width:0px;opacity:0;overflow:hidden;" />`;
    if (transformed.includes('</body>')) {
      transformed = transformed.replace('</body>', `${pixelTag}</body>`);
    } else {
      transformed = transformed + pixelTag;
    }
  } catch (err) {
    console.error('[Worker Tracking] Failed to create open pixel:', err);
  }

  return transformed;
}

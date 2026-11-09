import { Types } from 'mongoose';
import {
  Campaign,
  Brand,
  EmailConnection,
  Contact,
  Suppression,
  Segment,
  ICampaignDoc,
} from '@mailcraft/database';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema, ICampaignValidationResult } from '@mailcraft/shared-types';
import { applySegmentFilters } from './contact-service';

export interface ValidationContext {
  sessionId: Types.ObjectId | string;
  campaignId: Types.ObjectId | string;
  idempotencyKey?: string;
}

export async function validateCampaignReadiness(
  context: ValidationContext
): Promise<ICampaignValidationResult & { campaign?: ICampaignDoc }> {
  const errors: Array<{ code: string; message: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];

  const sessionObjId =
    typeof context.sessionId === 'string'
      ? new Types.ObjectId(context.sessionId)
      : context.sessionId;
  const campaignObjId =
    typeof context.campaignId === 'string'
      ? new Types.ObjectId(context.campaignId)
      : context.campaignId;

  // 1 & 2: Campaign exists and belongs to guest
  const campaign = await Campaign.findOne({
    _id: campaignObjId,
    sessionId: sessionObjId,
  });

  if (!campaign) {
    return {
      valid: false,
      errors: [
        {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign does not exist or does not belong to the current session',
        },
      ],
      warnings: [],
    };
  }

  // 19: State transition check
  if (['queued', 'sending', 'completed'].includes(campaign.status)) {
    errors.push({
      code: 'INVALID_CAMPAIGN_STATUS',
      message: `Campaign cannot be launched because its current status is '${campaign.status}'`,
    });
  }

  // 3: Brand exists
  const brand = await Brand.findOne({
    _id: campaign.brandId,
    sessionId: sessionObjId,
  });

  if (!brand) {
    errors.push({
      code: 'BRAND_NOT_FOUND',
      message: 'Associated brand profile not found. Please select or create a brand.',
    });
  }

  // 4: Sender verification check
  const { GuestSession } = await import('@mailcraft/database');
  const sessionDoc = await GuestSession.findById(sessionObjId);
  const senderEmail = brand?.senderEmail || campaign.senderEmail;

  if (
    !sessionDoc?.verifiedEmail ||
    (senderEmail && sessionDoc.verifiedEmail.toLowerCase() !== senderEmail.toLowerCase())
  ) {
    // If sender email is not the verified session email, check if it's connected via verified provider
    let providerVerified = false;
    if (campaign.connectionId) {
      const conn = await EmailConnection.findOne({
        _id: campaign.connectionId,
        sessionId: sessionObjId,
        status: 'connected',
      });
      if (conn?.senderEmail && conn.senderEmail.toLowerCase() === senderEmail?.toLowerCase()) {
        providerVerified = true;
      }
    }

    if (!providerVerified && !sessionDoc?.verifiedEmail) {
      errors.push({
        code: 'SENDER_NOT_VERIFIED',
        message: 'Sender email ownership must be verified before launching campaigns.',
      });
    }
  }

  // 5 & 6 & 7: Provider connection
  let connectionDoc: any = null;
  if (campaign.connectionId) {
    connectionDoc = await EmailConnection.findOne({
      _id: campaign.connectionId,
      sessionId: sessionObjId,
    });

    if (!connectionDoc) {
      errors.push({
        code: 'PROVIDER_NOT_FOUND',
        message: 'Selected email sending connection was not found in your workspace.',
      });
    } else if (connectionDoc.status !== 'connected') {
      errors.push({
        code: 'PROVIDER_NOT_CONNECTED',
        message: `Provider '${connectionDoc.provider}' is in status '${connectionDoc.status}'. Please reconnect.`,
      });
    }
  } else {
    // If no provider selected, warn or check mock
    warnings.push({
      code: 'DEFAULT_PROVIDER',
      message: 'No external sending provider selected; local delivery will be used.',
    });
  }

  // 8: Subject check
  if (!campaign.subject || campaign.subject.trim().length < 2) {
    errors.push({
      code: 'INVALID_SUBJECT',
      message: 'Campaign subject line must be at least 2 characters.',
    });
  } else if (campaign.subject.length > 200) {
    errors.push({
      code: 'SUBJECT_TOO_LONG',
      message: 'Campaign subject line cannot exceed 200 characters.',
    });
  }

  // 9: Preheader check
  if (!campaign.preheader || campaign.preheader.trim().length === 0) {
    warnings.push({
      code: 'MISSING_PREHEADER',
      message: 'Adding a preheader preview line is recommended to improve open rates.',
    });
  }

  // 10, 11, 12: Editor Data & Compilation
  const editorSchema = (campaign.editorData as unknown as IEditorSchema) || {
    settings: { background: '#FFFFFF', contentWidth: 600, fontFamily: 'sans-serif' },
    blocks: [],
  };

  if (!editorSchema.blocks || editorSchema.blocks.length === 0) {
    errors.push({
      code: 'EMPTY_TEMPLATE',
      message: 'Email content is empty. Please add content blocks or choose a template.',
    });
  } else {
    try {
      const compiled = compileEmail({
        schema: editorSchema,
        brand: {
          brandName: brand?.brandName || 'Brand',
          logoUrl: brand?.logoUrl,
          primaryColor: brand?.primaryColor || '#4F46E5',
          secondaryColor: brand?.secondaryColor || '#10B981',
          footerAddress: brand?.footerAddress || 'Sample Address',
        },
        recipient: {
          email: 'test@example.com',
          unsubscribeUrl: 'https://example.com/unsubscribe/token',
        },
      });

      if (!compiled.html || compiled.html.length < 50) {
        errors.push({
          code: 'RENDER_ERROR',
          message: 'Failed to compile responsive HTML for this campaign.',
        });
      }

      // 16: Unsubscribe link check
      if (
        !compiled.html.includes('unsubscribe') &&
        !compiled.html.includes('Unsubscribe')
      ) {
        warnings.push({
          code: 'UNSUBSCRIBE_RECOMMENDED',
          message: 'An unsubscribe footer is required for anti-spam compliance.',
        });
      }
    } catch (renderErr) {
      errors.push({
        code: 'COMPILATION_FAILED',
        message:
          renderErr instanceof Error
            ? renderErr.message
            : 'Error compiling email template schema',
      });
    }
  }

  // 17: Required sender identity & footer address
  if (!brand?.footerAddress && !brand?.brandName) {
    warnings.push({
      code: 'MISSING_PHYSICAL_ADDRESS',
      message: 'Including a physical postal address in your email footer complies with CAN-SPAM.',
    });
  }

  // 13, 14, 15: Audience & Recipient eligibility check
  const baseFilter: Record<string, unknown> = { sessionId: sessionObjId };

  if (campaign.audienceType === 'segment' && campaign.audienceFilters?.segmentId) {
    const seg = await Segment.findOne({
      _id: campaign.audienceFilters.segmentId,
      sessionId: sessionObjId,
    });
    if (seg && seg.filters) {
      applySegmentFilters(baseFilter, seg.filters);
    }
  } else if (campaign.audienceType === 'tag' && campaign.audienceFilters?.tag) {
    baseFilter.tags = campaign.audienceFilters.tag;
  } else if (
    campaign.audienceType === 'custom_selection' &&
    Array.isArray(campaign.audienceFilters?.contactIds)
  ) {
    baseFilter._id = { $in: campaign.audienceFilters.contactIds };
  }

  const [totalMatching, eligibleCount] = await Promise.all([
    Contact.countDocuments(baseFilter),
    Contact.countDocuments({ ...baseFilter, consentStatus: 'opted_in' }),
  ]);

  if (totalMatching === 0) {
    errors.push({
      code: 'EMPTY_AUDIENCE',
      message: 'No contacts match your audience selection. Please add or import recipients.',
    });
  } else if (eligibleCount === 0) {
    errors.push({
      code: 'NO_OPTED_IN_RECIPIENTS',
      message:
        'None of the selected contacts have confirmed marketing opt-in consent (consentStatus: opted_in).',
    });
  }

  // 18: Provider rate limits check
  if (connectionDoc?.provider === 'gmail') {
    if (eligibleCount > 500) {
      warnings.push({
        code: 'GMAIL_QUOTA_WARNING',
        message: `Gmail allows approximately 500 emails/day. You have ${eligibleCount} recipients selected.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    campaign,
  };
}

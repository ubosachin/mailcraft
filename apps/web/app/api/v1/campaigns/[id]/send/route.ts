import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  Contact,
  Brand,
  Suppression,
  Segment,
} from '@mailcraft/database';
import { compileEmail } from '@mailcraft/email-renderer';
import { IEditorSchema } from '@mailcraft/shared-types';
import { enqueueCampaignJob } from '@/lib/queue';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';
import { applySegmentFilters } from '@/lib/contact-service';
import { validateCampaignReadiness } from '@/lib/campaign-validator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveGuestSession(request);
    if (!session) {
      return jsonError('Guest session required', 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    // Idempotency check: If an idempotency key was sent and campaign is already queued or sending
    const idempotencyKey = body.idempotencyKey?.trim() || null;
    if (idempotencyKey && campaign.idempotencyKey === idempotencyKey && ['queued', 'sending', 'completed'].includes(campaign.status)) {
      return jsonSuccess({
        campaignId: campaign._id.toString(),
        status: campaign.status,
        recipientCount: campaign.recipientCount,
        message: 'Campaign has already been queued with this idempotency key.',
      });
    }

    // Pre-flight validation gate
    const validation = await validateCampaignReadiness({
      sessionId: session._id,
      campaignId: id,
      idempotencyKey: idempotencyKey || undefined,
    });

    if (!validation.valid) {
      return jsonError('Campaign failed validation checks', 400, {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Verify brand
    const brand = await Brand.findById(campaign.brandId);
    if (!brand) {
      return jsonError('Campaign brand profile not configured', 400);
    }

    // Audience selection resolution
    const audienceType = body.audienceType || campaign.audienceType || 'all_eligible';
    const contactsQuery: Record<string, unknown> = {
      sessionId: session._id,
      consentStatus: 'opted_in', // Strict mandatory opt-in requirement
    };

    if (audienceType === 'segment' && (body.segmentId || campaign.audienceFilters?.segmentId)) {
      const segId = body.segmentId || campaign.audienceFilters?.segmentId;
      const seg = await Segment.findOne({ _id: segId, sessionId: session._id });
      if (seg && seg.filters) {
        applySegmentFilters(contactsQuery, seg.filters);
        contactsQuery.consentStatus = 'opted_in';
      }
    } else if (audienceType === 'tag' && (body.tag || campaign.audienceFilters?.tag)) {
      contactsQuery.tags = body.tag || campaign.audienceFilters?.tag;
    } else if (
      audienceType === 'custom_selection' &&
      Array.isArray(body.contactIds || campaign.audienceFilters?.contactIds)
    ) {
      contactsQuery._id = { $in: body.contactIds || campaign.audienceFilters?.contactIds };
    }

    // Fetch opt-in contacts
    const contacts = await Contact.find(contactsQuery).lean();

    if (contacts.length === 0) {
      return jsonError(
        'No eligible opted-in contacts found. Please import recipient contacts first.',
        400
      );
    }

    // Filter against current suppression list
    const hashes = contacts.map((c) =>
      crypto.createHash('sha256').update(c.normalizedEmail).digest('hex')
    );
    const suppressions = await Suppression.find({
      emailHash: { $in: hashes },
      $or: [{ scope: 'global' }, { sessionId: session._id }],
    }).lean();
    const suppressedHashSet = new Set(suppressions.map((s) => s.emailHash));

    const eligibleContacts = contacts.filter((c) => {
      const h = crypto.createHash('sha256').update(c.normalizedEmail).digest('hex');
      return !suppressedHashSet.has(h);
    });

    if (eligibleContacts.length === 0) {
      return jsonError(
        'All selected contacts are currently suppressed. No messages can be dispatched.',
        400
      );
    }

    // Content Snapshotting: Freeze rendered HTML, text, and metadata
    const editorSchema = (campaign.editorData as unknown as IEditorSchema) || {
      settings: { background: '#FFFFFF', contentWidth: 600, fontFamily: 'sans-serif' },
      blocks: [],
    };

    const compiled = compileEmail({
      schema: editorSchema,
      brand: {
        brandName: brand.brandName,
        logoUrl: brand.logoUrl,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        footerAddress: brand.footerAddress,
      },
      recipient: {
        email: 'preview@mailcraft.local',
        unsubscribeUrl: 'https://example.com/unsubscribe/preview',
      },
    });

    campaign.renderedHtml = compiled.html;
    campaign.renderedText = compiled.text;
    campaign.snapshot = {
      subject: campaign.subject,
      preheader: campaign.preheader,
      senderName: brand.senderName,
      senderEmail: brand.senderEmail,
      provider: campaign.provider || 'mock',
      renderedHtml: compiled.html,
      renderedText: compiled.text,
      editorData: campaign.editorData,
      snapshotAt: new Date(),
    };

    // Populate CampaignRecipient records in bulk
    const recipientDocs = eligibleContacts.map((c) => ({
      campaignId: campaign._id,
      sessionId: session._id,
      contactId: c._id,
      email: c.email.toLowerCase().trim(),
      personalizationData: {
        firstName: c.firstName,
        lastName: c.lastName,
        first_name: c.firstName,
        last_name: c.lastName,
        name: c.name,
        company: c.company,
      },
      status: 'queued' as const,
      attempts: 0,
      queuedAt: new Date(),
    }));

    try {
      await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
    } catch {
      // Ignore unique duplicate key collision errors
    }

    const totalQueued = await CampaignRecipient.countDocuments({
      campaignId: campaign._id,
      status: { $in: ['pending', 'queued'] },
    });

    campaign.status = 'queued';
    campaign.recipientCount = totalQueued;
    campaign.eligibleRecipientCount = totalQueued;
    if (idempotencyKey) {
      campaign.idempotencyKey = idempotencyKey;
    }
    await campaign.save();

    // Dispatch to BullMQ Queue
    const job = await enqueueCampaignJob(campaign._id.toString());

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      jobId: job.id,
      status: 'queued',
      recipientCount: totalQueued,
      snapshotAt: campaign.snapshot.snapshotAt,
      message: `Campaign successfully queued for background delivery to ${totalQueued} recipients`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

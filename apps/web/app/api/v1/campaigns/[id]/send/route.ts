import { NextRequest } from 'next/server';
import {
  connectToDatabase,
  Campaign,
  CampaignRecipient,
  Contact,
  Brand,
} from '@mailcraft/database';
import { enqueueCampaignJob } from '@/lib/queue';
import { resolveGuestSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

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
    await connectToDatabase();

    const campaign = await Campaign.findOne({ _id: id, sessionId: session._id });
    if (!campaign) {
      return jsonError('Campaign not found', 404);
    }

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return jsonError(`Campaign is already in '${campaign.status}' state`, 400);
    }

    // Verify brand and sender
    const brand = await Brand.findById(campaign.brandId);
    if (!brand) {
      return jsonError('Campaign brand profile not configured', 400);
    }

    // Check sender email ownership verification
    if (!session.verifiedEmail) {
      return jsonError(
        'Sender email ownership must be verified with OTP before launching a campaign',
        403,
        { requiresVerification: true, senderEmail: brand.senderEmail }
      );
    }

    // Parse audience criteria from request body if provided
    let audienceCriteria: {
      audienceType?: 'all_eligible' | 'segment' | 'tag' | 'custom_selection';
      segmentId?: string;
      tag?: string;
      contactIds?: string[];
    } = {};

    try {
      audienceCriteria = await request.json();
    } catch {
      // Body is optional
    }

    // Build contacts query
    const contactsQuery: Record<string, unknown> = {
      sessionId: session._id,
      consentStatus: 'opted_in', // Mandatory: strictly opted_in for promotional campaigns
    };

    if (audienceCriteria.audienceType === 'segment' && audienceCriteria.segmentId) {
      const { Segment } = await import('@mailcraft/database');
      const { applySegmentFilters } = await import('@/lib/contact-service');
      const seg = await Segment.findOne({ _id: audienceCriteria.segmentId, sessionId: session._id });
      if (seg && seg.filters) {
        applySegmentFilters(contactsQuery, seg.filters);
        contactsQuery.consentStatus = 'opted_in'; // Enforce opted_in
      }
    } else if (audienceCriteria.audienceType === 'tag' && audienceCriteria.tag) {
      contactsQuery.tags = audienceCriteria.tag;
    } else if (audienceCriteria.audienceType === 'custom_selection' && Array.isArray(audienceCriteria.contactIds)) {
      contactsQuery._id = { $in: audienceCriteria.contactIds };
    }

    // Fetch opt-in contacts for this session
    const contacts = await Contact.find(contactsQuery);

    if (contacts.length === 0) {
      return jsonError(
        'No eligible opted-in contacts found. Please import recipient contacts first.',
        400
      );
    }

    // Populate CampaignRecipient records in bulk (ignoring duplicates via ordered: false)
    const recipientDocs = contacts.map((c) => ({
      campaignId: campaign._id,
      contactId: c._id,
      email: c.email.toLowerCase().trim(),
      status: 'queued',
      attempts: 0,
    }));

    try {
      await CampaignRecipient.insertMany(recipientDocs, { ordered: false });
    } catch {
      // Ignore E11000 duplicate errors if already present
    }

    const totalQueued = await CampaignRecipient.countDocuments({
      campaignId: campaign._id,
    });

    campaign.status = 'queued';
    campaign.recipientCount = totalQueued;
    await campaign.save();

    // Dispatch to BullMQ Queue
    const job = await enqueueCampaignJob(campaign._id.toString());

    return jsonSuccess({
      campaignId: campaign._id.toString(),
      jobId: job.id,
      status: 'queued',
      recipientCount: totalQueued,
      message: `Campaign successfully queued for background delivery to ${totalQueued} recipients`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


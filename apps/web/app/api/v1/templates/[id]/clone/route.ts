import { NextRequest } from 'next/server';
import { connectToDatabase, Campaign, Brand, EmailConnection } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { resolveTemplateByIdOrSlug } from '@/lib/templates';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required to clone a template into a campaign', 401);
    }

    const { id } = await params;
    await connectToDatabase();

    const template = await resolveTemplateByIdOrSlug(id);

    if (!template) {
      return jsonError(`Template '${id}' not found`, 404);
    }

    // Resolve or create brand for session
    let brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    if (!brand) {
      brand = await Brand.create({
        sessionId: session._id,
        brandName: 'My Brand',
        senderName: 'Founder',
        senderEmail: session.verifiedEmail || 'hello@example.com',
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
      });
    }

    const activeConnection = await EmailConnection.findOne({
      sessionId: session._id,
      status: 'connected',
    }).sort({ updatedAt: -1 });

    // Optional campaign name override from body
    let campaignName = `${template.name} Campaign`;
    try {
      const body = await request.json();
      if (body.campaignName) {
        campaignName = body.campaignName;
      }
    } catch {
      // Body is optional
    }

    const campaign = await Campaign.create({
      sessionId: session._id,
      brandId: brand._id,
      connectionId: activeConnection?._id || null,
      provider: activeConnection?.provider || 'unassigned',
      senderName: brand.senderName,
      senderEmail: brand.senderEmail,
      campaignName,
      subject: `Exclusive Announcement: Discover our ${template.name}`,
      preheader: template.description || 'Special update from our team',
      templateId: template._id,
      editorData: template.editorSchema,
      status: 'draft',
      stats: {
        accepted: 0,
        delivered: 0,
        bounced: 0,
        clicked: 0,
        unsubscribed: 0,
        failed: 0,
      },
    });

    return jsonSuccess(
      {
        campaignId: campaign._id.toString(),
        campaignName: campaign.campaignName,
        subject: campaign.subject,
        status: campaign.status,
        templateId: template._id.toString(),
        templateSlug: template.slug,
        editorData: campaign.editorData,
        createdAt: campaign.createdAt.toISOString(),
      },
      201,
      `Template '${template.name}' successfully cloned into new campaign draft`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

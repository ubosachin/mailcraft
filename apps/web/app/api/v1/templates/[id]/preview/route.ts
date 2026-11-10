import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, Template, Brand } from '@mailcraft/database';
import { compileEmail, getTemplateBySlug } from '@mailcraft/email-renderer';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

async function handlePreview(
  request: NextRequest,
  params: { id: string },
  customBody?: Record<string, unknown>
) {
  const session = await resolveAuthSession(request);
  if (!session) {
    return jsonError('Authentication required', 401);
  }

  await connectToDatabase();
  const { id } = params;

  let template = null;
  const isHexObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  if (isHexObjectId) {
    template = await Template.findById(id);
  }
  if (!template) {
    template = await Template.findOne({ slug: id.toLowerCase().trim() });
  }

  // Fallback to in-memory registry if DB record not found
  if (!template) {
    const memTpl = getTemplateBySlug(id);
    if (memTpl) {
      template = {
        _id: memTpl.slug,
        name: memTpl.name,
        slug: memTpl.slug,
        category: memTpl.category,
        editorSchema: memTpl.editorSchema,
      } as unknown as typeof template;
    }
  }

  if (!template) {
    return jsonError(`Template '${id}' not found`, 404);
  }

  const brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });

  // Custom body overrides
  let editorSchema = template.editorSchema;
  let customBrand = brand
    ? {
        brandName: brand.brandName,
        senderName: brand.senderName,
        logoUrl: brand.logoUrl,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        footerAddress: brand.footerAddress,
        website: brand.website,
      }
    : {
        brandName: 'MailCraft Studio',
        senderName: 'Founder',
        primaryColor: '#4F46E5',
        secondaryColor: '#10B981',
        footerAddress: '100 Silicon Way, Suite 400, San Francisco, CA 94107',
        website: 'https://mailcraft.dev',
      };

  if (customBody) {
    if (customBody.editorSchema) {
      editorSchema = customBody.editorSchema as typeof editorSchema;
    }
    if (customBody.brand) {
      customBrand = { ...customBrand, ...(customBody.brand as Record<string, unknown>) };
    }
  }

  const rendered = compileEmail({
    schema: editorSchema,
    brand: customBrand,
    recipient: {
      name: 'Sarah Connor',
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@example.com',
      unsubscribeUrl: 'https://mailcraft.dev/unsubscribe/preview_token',
    },
    campaign: {
      subject: `[Preview] ${template.name}`,
      preheader: 'Experience the responsiveness and craftsmanship of this email layout.',
    },
  });

  return jsonSuccess({
    template: {
      id: template._id.toString(),
      name: template.name,
      slug: template.slug,
      category: template.category,
    },
    html: rendered.html,
    text: rendered.text,
    subject: rendered.subject,
    preheader: rendered.preheader,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    return await handlePreview(request, resolvedParams);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }
    return await handlePreview(request, resolvedParams, body);
  } catch (error) {
    return handleApiError(error);
  }
}

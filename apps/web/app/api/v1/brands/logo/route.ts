import { NextRequest } from 'next/server';
import { connectToDatabase, Brand } from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) {
      return jsonError('Authentication required', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonError('No file uploaded', 400);
    }

    // Validate mime type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return jsonError('Only PNG, JPEG, WebP, or SVG images are supported', 400);
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return jsonError('Logo file size must be less than 5MB', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let logoUrl = '';

    // Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      // Cloudinary upload
      const timestamp = Math.round(Date.now() / 1000);
      const signaturePayload = `timestamp=${timestamp}${apiSecret}`;
      const crypto = await import('node:crypto');
      const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

      const uploadForm = new FormData();
      uploadForm.append('file', new Blob([buffer], { type: file.type }));
      uploadForm.append('api_key', apiKey);
      uploadForm.append('timestamp', timestamp.toString());
      uploadForm.append('signature', signature);
      uploadForm.append('folder', 'mailcraft_logos');

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: uploadForm }
      );

      if (cloudRes.ok) {
        const cloudData = (await cloudRes.json()) as { secure_url?: string };
        logoUrl = cloudData.secure_url || '';
      }
    }

    // Fallback: safe data URI representation so uploads work reliably out of the box in local/serverless
    if (!logoUrl) {
      const base64 = buffer.toString('base64');
      logoUrl = `data:${file.type};base64,${base64}`;
    }

    await connectToDatabase();
    const brand = await Brand.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    if (brand) {
      brand.logoUrl = logoUrl;
      await brand.save();
    }

    return jsonSuccess({ logoUrl }, 200, 'Logo uploaded successfully');
  } catch (error) {
    return handleApiError(error);
  }
}


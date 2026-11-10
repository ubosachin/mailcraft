import { NextRequest } from 'next/server';
import {
  connectToDatabase,
  Contact,
  Suppression,
  Brand,
  UserSession,
} from '@mailcraft/database';
import { resolveAuthSession } from '@/lib/session';
import { jsonSuccess, jsonError, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await resolveAuthSession(request);
    if (!session) return jsonError('Authentication required', 401);

    await connectToDatabase();

    const [optedIn, suppressed, brand, sessionDoc] = await Promise.all([
      Contact.countDocuments({ sessionId: session._id, consentStatus: 'opted_in' }),
      Suppression.countDocuments({
        $or: [{ sessionId: session._id }, { scope: 'global' }],
      }),
      Brand.findOne({ sessionId: session._id }),
      UserSession.findById(session._id),
    ]);

    return jsonSuccess({
      senderVerified: !!sessionDoc?.verifiedEmail,
      verifiedEmail: sessionDoc?.verifiedEmail || null,
      brandConfigured: !!brand?.brandName,
      footerAddressConfigured: !!brand?.footerAddress,
      optedInRecipients: optedIn,
      activeSuppressions: suppressed,
      canBroadcast: !!sessionDoc?.verifiedEmail && optedIn > 0,
      disclaimer:
        'Technical compliance status reflects current workspace data and permission settings.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}


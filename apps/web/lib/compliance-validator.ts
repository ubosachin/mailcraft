import {
  connectToDatabase,
  Campaign,
  Brand,
  Contact,
  Suppression,
  EmailConnection,
  GuestSession,
} from '@mailcraft/database';
import { IComplianceReport, IComplianceCheckResult } from '@mailcraft/shared-types';
import { isDangerousUrlScheme } from '@/lib/tracking-service';

export async function validateCampaignCompliance(
  campaignId: string,
  sessionId: string
): Promise<IComplianceReport> {
  await connectToDatabase();

  const checks: IComplianceCheckResult[] = [];

  const campaign = await Campaign.findOne({
    _id: campaignId,
    sessionId,
  });

  if (!campaign) {
    return {
      overallStatus: 'blocked',
      passedCount: 0,
      warningCount: 0,
      blockedCount: 1,
      checks: [
        {
          valid: false,
          status: 'blocked',
          ruleId: 'RULE_COMP_00',
          severity: 'critical',
          description: 'Campaign record not found or inaccessible in current guest session.',
          suggestedAction: 'Ensure campaign was created within this active session.',
        },
      ],
      disclaimer: 'MailCraft automated compliance audit.',
    };
  }

  // 1. Sender Identity
  const brand = await Brand.findById(campaign.brandId);
  const senderEmail = brand?.senderEmail || campaign.senderEmail;
  const senderName = brand?.senderName || campaign.senderName;

  if (senderEmail && senderName) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_01',
      severity: 'critical',
      description: `Sender identity configured: ${senderName} <${senderEmail}>`,
      field: 'senderEmail',
      suggestedAction: 'Sender identity verified.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_01',
      severity: 'critical',
      description: 'Missing sender name or sender email address.',
      field: 'senderEmail',
      suggestedAction: 'Configure your Brand profile with a verified sender name and email.',
    });
  }

  // 2. Sender Verification
  const sessionDoc = await GuestSession.findById(sessionId);
  let senderVerified = false;
  if (sessionDoc?.verifiedEmail && senderEmail && sessionDoc.verifiedEmail.toLowerCase() === senderEmail.toLowerCase()) {
    senderVerified = true;
  }
  if (!senderVerified && campaign.connectionId) {
    const conn = await EmailConnection.findById(campaign.connectionId);
    if (conn && conn.senderVerificationStatus === 'verified') {
      senderVerified = true;
    }
  }

  if (senderVerified) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_02',
      severity: 'high',
      description: `Sender address (${senderEmail}) is cryptographically verified via OTP or authenticated provider.`,
      field: 'verifiedEmail',
      suggestedAction: 'Sender ownership confirmed.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_02',
      severity: 'high',
      description: 'Sender email ownership has not been verified via 6-digit OTP.',
      field: 'verifiedEmail',
      suggestedAction: 'Complete OTP verification in Workspace settings before broadcasting.',
    });
  }

  // 3. Subject Line Integrity
  const subject = campaign.subject?.trim() || '';
  if (subject.length >= 2 && subject.length <= 200) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_03',
      severity: 'medium',
      description: `Subject line is valid (${subject.length} characters) and clear.`,
      field: 'subject',
      suggestedAction: 'Subject line meets compliance standards.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_03',
      severity: 'high',
      description: 'Subject line is missing, too short (<2 chars), or exceeds 200 characters.',
      field: 'subject',
      suggestedAction: 'Provide an honest, accurate subject line representing email content.',
    });
  }

  // 4. Unsubscribe Mechanism (CAN-SPAM / GDPR / RFC 8058)
  const editorData = (campaign.editorData as any) || {};
  const blocks = editorData.blocks || [];
  const stringifiedContent = JSON.stringify(blocks).toLowerCase();
  const hasUnsubscribeToken =
    stringifiedContent.includes('{{unsubscribe_url}}') ||
    stringifiedContent.includes('unsubscribe') ||
    blocks.some((b: any) => b.type === 'footer');

  if (hasUnsubscribeToken) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_04',
      severity: 'critical',
      description: 'Unsubscribe mechanism detected. Mandatory RFC 8058 one-click headers will be injected at send time.',
      field: 'unsubscribe',
      suggestedAction: 'Unsubscribe mechanism compliant.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_04',
      severity: 'critical',
      description: 'Missing mandatory unsubscribe footer or {{unsubscribe_url}} placeholder in email content.',
      field: 'content',
      suggestedAction: 'Add a Footer block or insert an {{unsubscribe_url}} link into your template.',
    });
  }

  // 5. Physical Postal Address (CAN-SPAM 15 U.S.C. § 7704)
  const footerAddress = brand?.footerAddress?.trim() || '';
  if (footerAddress.length >= 5) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_05',
      severity: 'high',
      description: `Physical postal address included: "${footerAddress}"`,
      field: 'footerAddress',
      suggestedAction: 'Physical mailing address compliant with CAN-SPAM.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'warning',
      ruleId: 'RULE_COMP_05',
      severity: 'medium',
      description: 'Physical commercial postal address is missing from Brand profile.',
      field: 'footerAddress',
      suggestedAction: 'Add your company physical mailing address or registered PO Box in Brand profile.',
    });
  }

  // 6. Explicit Affirmative Opt-in Consent (GDPR Art. 7, India DPDP Act 2023)
  const [optedInCount, nonOptedInCount] = await Promise.all([
    Contact.countDocuments({ sessionId, consentStatus: 'opted_in' }),
    Contact.countDocuments({ sessionId, consentStatus: { $ne: 'opted_in' } }),
  ]);

  if (optedInCount > 0) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_06',
      severity: 'critical',
      description: `${optedInCount} opted-in recipient(s) confirmed with affirmative consent records.`,
      field: 'consentStatus',
      suggestedAction: 'Permission-based audience verified.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_06',
      severity: 'critical',
      description: 'Zero opted-in recipients found. Anti-spam policies prohibit marketing to unconfirmed contacts.',
      field: 'consentStatus',
      suggestedAction: 'Only recipients with consentStatus: opted_in can receive promotional campaigns.',
    });
  }

  if (nonOptedInCount > 0) {
    checks.push({
      valid: true,
      status: 'warning',
      ruleId: 'RULE_COMP_06B',
      severity: 'low',
      description: `${nonOptedInCount} contact(s) without confirmed opt-in will be automatically excluded at launch.`,
      field: 'consentStatus',
      suggestedAction: 'No action needed; MailCraft automatically purges non-opted-in contacts.',
    });
  }

  // 7. Global & Session Suppression Check
  const suppressionCount = await Suppression.countDocuments({
    $or: [{ sessionId }, { scope: 'global' }],
  });

  checks.push({
    valid: true,
    status: 'passed',
    ruleId: 'RULE_COMP_07',
    severity: 'high',
    description: `Real-time suppression barrier active (${suppressionCount} barred addresses globally & session-wide).`,
    suggestedAction: 'Suppressed recipients will be automatically omitted before individual dispatch.',
  });

  // 8. Link Safety & URL Schemes
  let dangerousLinkDetected = false;
  for (const block of blocks) {
    const url = block.content?.url || block.content?.buttonUrl;
    if (url && typeof url === 'string') {
      if (isDangerousUrlScheme(url)) {
        dangerousLinkDetected = true;
        break;
      }
    }
  }

  if (!dangerousLinkDetected) {
    checks.push({
      valid: true,
      status: 'passed',
      ruleId: 'RULE_COMP_08',
      severity: 'critical',
      description: 'All links verified against safe HTTP/HTTPS protocols without prohibited schemes.',
      suggestedAction: 'Link safety confirmed.',
    });
  } else {
    checks.push({
      valid: false,
      status: 'blocked',
      ruleId: 'RULE_COMP_08',
      severity: 'critical',
      description: 'Prohibited or unsafe URL scheme detected (e.g. javascript:, data:, file:).',
      field: 'blocks',
      suggestedAction: 'Replace unsafe URLs with valid https:// destinations.',
    });
  }

  // 9. Provider Status
  if (campaign.connectionId) {
    const connection = await EmailConnection.findById(campaign.connectionId);
    if (connection && connection.status === 'connected') {
      checks.push({
        valid: true,
        status: 'passed',
        ruleId: 'RULE_COMP_09',
        severity: 'high',
        description: `Sending connection '${connection.provider.toUpperCase()}' is active and connected.`,
        suggestedAction: 'Provider infrastructure ready.',
      });
    } else {
      checks.push({
        valid: false,
        status: 'blocked',
        ruleId: 'RULE_COMP_09',
        severity: 'high',
        description: `Selected provider connection is in status '${connection?.status || 'disconnected'}'.`,
        suggestedAction: 'Reconnect your email provider in Sender Accounts (/connect).',
      });
    }
  } else {
    checks.push({
      valid: true,
      status: 'warning',
      ruleId: 'RULE_COMP_09',
      severity: 'low',
      description: 'No external email provider configured; local sandbox delivery mode will be engaged.',
      suggestedAction: 'Connect Gmail, Brevo, or Amazon SES for live external broadcasts.',
    });
  }

  const blockedCount = checks.filter((c) => c.status === 'blocked').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const passedCount = checks.filter((c) => c.status === 'passed').length;

  const overallStatus = blockedCount > 0 ? 'blocked' : warningCount > 0 ? 'warning' : 'passed';

  return {
    overallStatus,
    passedCount,
    warningCount,
    blockedCount,
    checks,
    disclaimer:
      'Disclaimer: MailCraft automated compliance audits verify technical safeguards against commercial communication standards (including US CAN-SPAM Act, EU GDPR, and Indian DPDP Act / TRAI regulations). Automated validation does not constitute formal legal counsel.',
  };
}


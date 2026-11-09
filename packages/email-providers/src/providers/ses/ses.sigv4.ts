import crypto from 'node:crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export function signAwsRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: string | Buffer | null,
  creds: AwsCredentials,
  service = 'email'
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined && v !== null) {
      normalizedHeaders[k.toLowerCase().trim()] = String(v).trim();
    }
  }
  normalizedHeaders['host'] = url.host;
  normalizedHeaders['x-amz-date'] = amzDate;
  if (creds.sessionToken) {
    normalizedHeaders['x-amz-security-token'] = creds.sessionToken;
  }

  // 1. Canonical Headers
  const headerKeys = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = headerKeys
    .map((k) => `${k}:${normalizedHeaders[k]}\n`)
    .join('');
  const signedHeaders = headerKeys.join(';');

  // 2. Payload Hash
  const payloadHash = crypto
    .createHash('sha256')
    .update(body || '')
    .digest('hex');

  // 3. Canonical Request
  const canonicalUri = url.pathname || '/';
  const canonicalQuery = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // 4. String to Sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${creds.region}/${service}/aws4_request`;
  const canonicalRequestHash = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // 5. Signature
  function hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  const kDate = hmac('AWS4' + creds.secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, creds.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const authorizationHeader = `${algorithm} Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    host: url.host,
    'x-amz-date': amzDate,
    ...(creds.sessionToken ? { 'x-amz-security-token': creds.sessionToken } : {}),
    Authorization: authorizationHeader,
  };
}

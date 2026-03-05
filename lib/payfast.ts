import crypto from 'crypto';

/**
 * ============================================================================
 * PAYFAST PAYMENT INTEGRATION - CANONICAL SIGNATURE (SERVER-SIDE ONLY)
 * ============================================================================
 *
 * Rules: encode individual values only; replace %20 with +; append passphrase
 * after joining; do not encode the entire param string. MD5 digest is hex
 * (lowercase by default).
 */

/**
 * PayFast doc order for signature (order matters for their validation).
 * See: https://developers.payfast.co.za/docs#step_1_form_fields
 */
const PAYFAST_SIGNATURE_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles',
];

/**
 * Generate PayFast signature. Canonical implementation, server-side only.
 * - Filter empty values and "signature" key
 * - Sort by PayFast doc field order, then alphabetically for any extra keys
 * - Encode each value only (encodeURIComponent, then replace %20 with +)
 * - Append passphrase after joining (raw passphrase, no encoding - per PayFast working examples)
 */
export function generatePayFastSignature(data: Record<string, string>): string {
  const orderIndex = new Map(PAYFAST_SIGNATURE_FIELD_ORDER.map((k, i) => [k, i]));

  const filtered = Object.entries(data)
    .filter(([key, value]) => value !== '' && key !== 'signature');

  const sorted = [...filtered].sort(([a], [b]) => {
    const ai = orderIndex.get(a) ?? 9999;
    const bi = orderIndex.get(b) ?? 9999;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });

  const encoded = sorted.map(([key, value]) => {
    return `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`;
  });

  const passphrase = (process.env.PAYFAST_PASSPHRASE ?? '').trim();
  if (!passphrase) {
    throw new Error('PAYFAST_PASSPHRASE is required and must be set in environment.');
  }

  const paramString = encoded.join('&') + `&passphrase=${passphrase}`;
  return crypto
    .createHash('md5')
    .update(paramString)
    .digest('hex');
}

/** Encode a single value for PayFast (URL query / form). */
function payfastUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

/**
 * Verify PayFast signature (used for webhook notifications).
 * 
 * PayFast sends payment notifications with a signature that must be verified
 * to ensure the request is legitimate and hasn't been tampered with.
 * 
 * @param data - Payment data received from PayFast (includes signature)
 * @param receivedSignature - The signature value received from PayFast
 * @param passphrase - Optional passphrase (must match the one used for generation)
 * @returns true if signature matches, false otherwise
 */
export function verifyPayFastSignature(
  data: Record<string, string>,
  receivedSignature: string
): boolean {
  const generated = generatePayFastSignature(data);
  const isValid = generated === receivedSignature;
  
  if (!isValid) {
    console.warn('⚠️ [PAYFAST SIGNATURE] Signature verification failed:', {
      received: receivedSignature,
      generated,
      dataKeys: Object.keys(data).sort(),
    });
  } else {
    console.log('✅ [PAYFAST SIGNATURE] Signature verified successfully');
  }
  
  return isValid;
}

export interface PayFastPaymentParams {
  bookingId: string;
  amount: number;
  clientEmail: string;
  clientName: string;
}

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  amount: string;
  item_name: string;
  m_payment_id: string;
  name_first: string;
  name_last: string;
  email_address: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  signature: string;
}

/**
 * Base URL for PayFast return/cancel/notify callbacks.
 * Set NEXT_PUBLIC_BASE_URL in .env.local (e.g. http://localhost:3000 or your ngrok URL).
 * No trailing slash.
 */
export function getPayFastBaseUrl(): string {
  const url = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
  return url || 'http://localhost:3000';
}

/**
 * Return, cancel, and notify URLs sent to PayFast (all from getPayFastBaseUrl).
 */
export function getPayFastCallbackUrls(): {
  return_url: string;
  cancel_url: string;
  notify_url: string;
} {
  const base = getPayFastBaseUrl();
  return {
    return_url: `${base}/bookings/success`,
    cancel_url: `${base}/bookings/cancel`,
    notify_url: `${base}/api/payfast/notify`,
  };
}

/**
 * Get PayFast process URL based on environment.
 *
 * Sandbox: https://sandbox.payfast.co.za/eng/process
 * Production: https://www.payfast.co.za/eng/process
 *
 * @returns PayFast process URL
 */
export function getPayFastProcessUrl(): string {
  const env = process.env.PAYFAST_ENV || 'sandbox';
  const isProduction = env === 'production';
  
  const url = isProduction
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';
  
  console.log(`🌐 [PAYFAST] Using ${isProduction ? 'PRODUCTION' : 'SANDBOX'} environment: ${url}`);
  
  return url;
}

/**
 * Create PayFast payment URL with correct signature.
 * 
 * This function:
 * 1. Validates required PayFast credentials
 * 2. Builds payment data object with all required fields
 * 3. Generates signature using the same data
 * 4. Builds final URL using the exact same encoded values
 * 
 * The signature and URL use identical encoding to prevent mismatches.
 * 
 * @param params - Payment parameters (booking ID, amount, client info)
 * @returns PayFast payment URL ready for redirect
 * @throws Error if required PayFast credentials are missing
 */
export async function createPayFastPaymentUrl(
  params: PayFastPaymentParams
): Promise<string> {
  // Load PayFast credentials from environment
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;

  // Validate required credentials
  if (!merchantId || !merchantKey) {
    const missing = [
      !merchantId && 'PAYFAST_MERCHANT_ID',
      !merchantKey && 'PAYFAST_MERCHANT_KEY',
    ].filter(Boolean);
    throw new Error(
      `Missing required PayFast credentials: ${missing.join(', ')}. Set in .env.local.`
    );
  }

  const { return_url: returnUrl, cancel_url: cancelUrl, notify_url: notifyUrl } =
    getPayFastCallbackUrls();

  // Format amount to exactly 2 decimal places (string)
  // This ensures PayFast and our database always match
  // Example: 100 -> "100.00", 100.5 -> "100.50"
  const amountStr = parseFloat(String(params.amount)).toFixed(2);

  // Parse client name into first and last name
  const nameParts = String(params.clientName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  console.log('💳 [PAYFAST] Creating payment URL...', {
    bookingId: params.bookingId,
    amount: amountStr,
    clientEmail: params.clientEmail,
    baseUrl: getPayFastBaseUrl(),
  });

  // Build payment data object with ALL required PayFast fields
  // This object is used for BOTH signature generation AND final URL building
  // IMPORTANT: merchant_key is included (required by PayFast for signature)
  const paymentData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey, // Included in signature calculation
    amount: amountStr,
    item_name: `Counseling Session - Booking ${params.bookingId}`,
    m_payment_id: params.bookingId,
    name_first: firstName,
    name_last: lastName,
    email_address: params.clientEmail || '',
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
  };

  // Generate signature using the canonical server-side function
  const signature = generatePayFastSignature(paymentData);
  
  // Add signature to payment data
  paymentData.signature = signature;

  // Build final URL using the EXACT same encoding as signature generation
  // This ensures signature matches what PayFast expects
  const sortedKeys = Object.keys(paymentData).sort();
  const queryParts: string[] = [];
  
  for (const key of sortedKeys) {
    // Use the same payfastUrlEncode function used in signature generation
    const encodedValue = payfastUrlEncode(paymentData[key]);
    queryParts.push(`${key}=${encodedValue}`);
  }
  
  const queryString = queryParts.join('&');
  const processUrl = getPayFastProcessUrl();
  const finalUrl = `${processUrl}?${queryString}`;

  console.log('📤 [PAYFAST] Final payment URL:', finalUrl.substring(0, 150) + '...');
  console.log('   (Full URL length:', finalUrl.length, 'characters)');
  console.log('✅ [PAYFAST] Payment URL created successfully');

  return finalUrl;
}

/**
 * Create PayFast payment data with signature (for direct form submission).
 * 
 * This function returns the payment data object and signature separately,
 * allowing the frontend to build the form directly without parsing a URL.
 * 
 * @param params - Payment parameters (booking ID, amount, client info)
 * @returns PayFast payment data object with signature
 * @throws Error if required PayFast credentials are missing
 */
export async function createPayFastPaymentData(
  params: PayFastPaymentParams
): Promise<PayFastPaymentData> {
  // Load PayFast credentials from environment
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;

  // Validate required credentials
  if (!merchantId || !merchantKey) {
    const missing = [
      !merchantId && 'PAYFAST_MERCHANT_ID',
      !merchantKey && 'PAYFAST_MERCHANT_KEY',
    ].filter(Boolean);
    throw new Error(
      `Missing required PayFast credentials: ${missing.join(', ')}. Set in .env.local.`
    );
  }

  const { return_url: returnUrl, cancel_url: cancelUrl, notify_url: notifyUrl } =
    getPayFastCallbackUrls();

  // Format amount to exactly 2 decimal places (string)
  const amountStr = parseFloat(String(params.amount)).toFixed(2);

  // Parse client name into first and last name
  const nameParts = String(params.clientName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Build payment data object with ALL required PayFast fields
  const paymentData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    amount: amountStr,
    item_name: `Counseling Session - Booking ${params.bookingId}`,
    m_payment_id: params.bookingId,
    name_first: firstName,
    name_last: lastName,
    email_address: params.clientEmail || '',
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
  };

  // Generate signature using the canonical server-side function
  const signature = generatePayFastSignature(paymentData);

  // Return payment data with signature
  return {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    amount: amountStr,
    item_name: `Counseling Session - Booking ${params.bookingId}`,
    m_payment_id: params.bookingId,
    name_first: firstName,
    name_last: lastName,
    email_address: params.clientEmail || '',
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    signature,
  };
}

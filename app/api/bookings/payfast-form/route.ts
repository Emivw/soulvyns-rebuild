import { NextRequest, NextResponse } from 'next/server';
import { generatePayFastSignature, getPayFastBaseUrl, getPayFastCallbackUrls, getPayFastProcessUrl } from '@/lib/payfast';

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * POST /api/bookings/payfast-form
 *
 * Builds PayFast sandbox params, generates signature via canonical function,
 * and returns HTML with an auto-submitting form. No auth required.
 *
 * Body: { counselorId?, slotId?, amount?, clientEmail?, firstName?, lastName? }
 */
export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { bookingId, amount, clientEmail = '', firstName = '', lastName = '' } = body ?? {};

    if (!bookingId || amount == null) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId and amount are required.' },
        { status: 400 }
      );
    }

    const merchant_id = process.env.PAYFAST_MERCHANT_ID || '10045991';
    const merchant_key = process.env.PAYFAST_MERCHANT_KEY || '2q99zezq11goo';
    const base = getPayFastBaseUrl();
    const { cancel_url, notify_url } = getPayFastCallbackUrls();
    const m_payment_id = bookingId;
    const return_url = `${base}/bookings/success?booking_id=${encodeURIComponent(bookingId)}`;

    const params: Record<string, string> = {
      merchant_id,
      merchant_key,
      return_url,
      cancel_url,
      notify_url,
      amount: parseFloat(String(amount)).toFixed(2),
      item_name: `Counseling Session - Booking ${m_payment_id}`,
      m_payment_id,
      name_first: firstName,
      name_last: lastName,
      email_address: clientEmail,
    };

    let signature: string;
    try {
      signature = generatePayFastSignature(params);
    } catch (sigErr) {
      console.error('[payfast-form] Signature generation failed:', sigErr);
      return NextResponse.json(
        {
          error: 'PayFast signature generation failed',
          detail: sigErr instanceof Error ? sigErr.message : String(sigErr),
        },
        { status: 500 }
      );
    }

    // Log exactly what we send to PayFast (for debugging 400/signature mismatch)
    const processUrl = getPayFastProcessUrl();
    console.log('[payfast-form] Sending to PayFast:', {
      processUrl,
      return_url: params.return_url,
      cancel_url: params.cancel_url,
      notify_url: params.notify_url,
      amount: params.amount,
      m_payment_id: params.m_payment_id,
    });

    // Auto-submitting POST form only. Do NOT redirect via URL/GET.
    const inputs = [
      ...Object.entries(params).map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtmlAttr(key)}" value="${escapeHtmlAttr(value)}" />`
      ),
      `<input type="hidden" name="signature" value="${escapeHtmlAttr(signature)}" />`,
    ].join('\n    ');

    const htmlForm = `<html>
  <body onload="document.forms[0].submit()">
    <form action="${escapeHtmlAttr(processUrl)}" method="POST">
    ${inputs}
    </form>
  </body>
</html>`;

    return new NextResponse(htmlForm, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[payfast-form] Error:', message, err);
    return NextResponse.json(
      {
        error: 'Failed to build PayFast form',
        detail: message,
      },
      { status: 500 }
    );
  }
}

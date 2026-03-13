'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export default function SelectSlotPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const counselorId = params.id as string;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const selectedDate = (searchParams.get('date') || '').trim(); // YYYY-MM-DD

  const filteredSlots = useMemo(() => {
    if (!selectedDate) return slots;
    // Compare against the viewer's local date (matches what the browser date picker produces).
    return slots.filter((slot) => {
      const localDate = new Date(slot.start_time).toLocaleDateString('en-CA'); // YYYY-MM-DD
      return localDate === selectedDate;
    });
  }, [slots, selectedDate]);

  useEffect(() => {
    // If the selected slot is no longer visible (date filter changed), clear it.
    if (selectedSlot && !filteredSlots.some((s) => s.id === selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [filteredSlots, selectedSlot]);

  useEffect(() => {
    if (counselorId) {
      loadAvailableSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counselorId]);

  const loadAvailableSlots = async () => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('counselor_id', counselorId)
        .eq('is_booked', false)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading slots:', error);
        setError('Failed to load available slots. Please try again.');
        setSlots([]);
      } else {
        setSlots(data || []);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
      setError('Could not load slots. Check your connection and try again.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ============================================================================
   * PAYFAST SANDBOX PAYMENT FORM SUBMISSION - COMPLETE FUNCTION
   * ============================================================================
   * 
   * This function handles PayFast sandbox payment submission via POST form.
   * It dynamically creates an HTML form, populates ALL PayFast fields (required + optional),
   * and automatically submits it to PayFast sandbox.
   * 
   * Requirements:
   * - PayFast REQUIRES POST requests (GET returns 400 Bad Request)
   * - All fields must be URL-encoded correctly (browser handles this automatically)
   * - Signature must match PayFast's requirements exactly
   * - Uses exact booking data from client (no alterations)
   * - Mimics PayFast sandbox test form behavior exactly
   * 
   * @param bookingDetails - Complete booking data with signature from API response
   */
  const handleBookSlot = (bookingDetails: {
    bookingId: string;
    amount: string;
    signature: string;
    clientEmail: string;
    clientFirstName: string;
    clientLastName: string;
    item_name?: string;
    item_description?: string;
    counselorId?: string;
    cell_number?: string;
    send_email_confirmation?: boolean;
    payment_method?: string;
    custom_integer_1?: number;
    custom_integer_2?: number;
    custom_integer_3?: number;
    custom_integer_4?: number;
    custom_integer_5?: number;
    custom_string_1?: string;
    custom_string_2?: string;
    custom_string_3?: string;
    custom_string_4?: string;
    custom_string_5?: string;
  }) => {
    try {
      // ========================================================================
      // STEP 1: VALIDATE AND EXTRACT BOOKING DATA
      // ========================================================================
      console.log('🔍 [PAYFAST] Validating booking data...');
      
      if (!bookingDetails || !bookingDetails.bookingId || !bookingDetails.signature) {
        throw new Error('Missing required booking data: bookingId and signature are required');
      }

      // Extract booking data EXACTLY as provided (no alterations)
      // This ensures PayFast receives the exact data that was used to generate the signature
      const bookingId = bookingDetails.bookingId;
      const counselorId = bookingDetails.counselorId;
      const clientEmail = bookingDetails.clientEmail;
      const amount = bookingDetails.amount;
      const itemName = bookingDetails.item_name || `Counseling Session - Booking ${bookingId}`;
      const itemDescription = bookingDetails.item_description;
      const firstName = bookingDetails.clientFirstName;
      const lastName = bookingDetails.clientLastName;
      const cellNumber = bookingDetails.cell_number;
      const signature = bookingDetails.signature; // Use exact signature from API
      
      // Optional fields
      const sendEmailConfirmation = bookingDetails.send_email_confirmation;
      const paymentMethod = bookingDetails.payment_method;
      const customInteger1 = bookingDetails.custom_integer_1;
      const customInteger2 = bookingDetails.custom_integer_2;
      const customInteger3 = bookingDetails.custom_integer_3;
      const customInteger4 = bookingDetails.custom_integer_4;
      const customInteger5 = bookingDetails.custom_integer_5;
      const customString1 = bookingDetails.custom_string_1;
      const customString2 = bookingDetails.custom_string_2;
      const customString3 = bookingDetails.custom_string_3;
      const customString4 = bookingDetails.custom_string_4;
      const customString5 = bookingDetails.custom_string_5;

      console.log('✅ [PAYFAST] Booking data validated:', {
        bookingId,
        amount,
        clientEmail,
        signature: signature ? '***' : null,
      });

      // ========================================================================
      // STEP 2: PAYFAST SANDBOX CONFIGURATION
      // ========================================================================
      console.log('⚙️ [PAYFAST] Configuring PayFast sandbox settings...');

      // PayFast sandbox endpoint (MUST be POST, GET will return 400 Bad Request)
      const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';

      // PayFast sandbox merchant credentials
      const MERCHANT_ID = '10045991';
      const MERCHANT_KEY = '2q99zezq11goo';

      // Callback URLs (ngrok tunnel for local development)
      const RETURN_URL = 'https://unmature-simplistically-damaris.ngrok-free.dev/bookings/success';
      const CANCEL_URL = 'https://unmature-simplistically-damaris.ngrok-free.dev/bookings/cancel';
      const NOTIFY_URL = 'https://unmature-simplistically-damaris.ngrok-free.dev/api/payfast/notify';

      console.log('✅ [PAYFAST] Sandbox configuration loaded:', {
        endpoint: PAYFAST_SANDBOX_URL,
        merchantId: MERCHANT_ID,
        returnUrl: RETURN_URL,
      });

      // ========================================================================
      // STEP 3: BUILD PAYFAST PAYMENT FIELDS
      // ========================================================================
      console.log('📋 [PAYFAST] Building payment fields...');

      // Build ALL PayFast sandbox fields (required + optional)
      // Note: PayFast requires fields in alphabetical order for signature validation
      // We build the object and PayFast will handle ordering
      const paymentFields: Record<string, string> = {
        // ========================================================================
        // REQUIRED FIELDS - Merchant Identification
        // ========================================================================
        merchant_id: MERCHANT_ID,
        merchant_key: MERCHANT_KEY,

        // ========================================================================
        // REQUIRED FIELDS - Transaction Details
        // ========================================================================
        amount: amount, // Must be formatted as "500.00" (2 decimal places)
        item_name: itemName, // Description of the service/item
        m_payment_id: bookingId, // Merchant payment ID (booking ID)

        // ========================================================================
        // REQUIRED FIELDS - Customer Information
        // ========================================================================
        name_first: firstName,
        name_last: lastName,
        email_address: clientEmail,

        // ========================================================================
        // REQUIRED FIELDS - Callback URLs
        // ========================================================================
        return_url: RETURN_URL, // Where to redirect after successful payment
        cancel_url: CANCEL_URL, // Where to redirect if payment is cancelled
        notify_url: NOTIFY_URL, // Webhook URL for payment notifications

        // ========================================================================
        // REQUIRED FIELDS - Security
        // ========================================================================
        signature: signature, // MD5 hash signature - use exact signature from API

        // ========================================================================
        // OPTIONAL FIELDS - Customer Information
        // ========================================================================
        // cell_number: Customer's cell phone number (optional but recommended)
        ...(cellNumber && { cell_number: cellNumber }),

        // ========================================================================
        // OPTIONAL FIELDS - Transaction Details
        // ========================================================================
        // item_description: Additional description of the item/service
        ...(itemDescription && { item_description: itemDescription }),

        // ========================================================================
        // OPTIONAL FIELDS - Payment Options
        // ========================================================================
        // send_email_confirmation: Whether to send email confirmation (1 = yes, 0 = no)
        ...(sendEmailConfirmation !== undefined && { 
          email_confirmation: sendEmailConfirmation ? '1' : '0' 
        }),
        
        // payment_method: Preferred payment method (eft, cc, etc.)
        ...(paymentMethod && { payment_method: paymentMethod }),

        // ========================================================================
        // OPTIONAL FIELDS - Custom Integers (for tracking/analytics)
        // ========================================================================
        ...(customInteger1 !== undefined && { custom_integer_1: String(customInteger1) }),
        ...(customInteger2 !== undefined && { custom_integer_2: String(customInteger2) }),
        ...(customInteger3 !== undefined && { custom_integer_3: String(customInteger3) }),
        ...(customInteger4 !== undefined && { custom_integer_4: String(customInteger4) }),
        ...(customInteger5 !== undefined && { custom_integer_5: String(customInteger5) }),

        // ========================================================================
        // OPTIONAL FIELDS - Custom Strings (for tracking/analytics)
        // ========================================================================
        ...(customString1 && { custom_string_1: customString1 }),
        ...(customString2 && { custom_string_2: customString2 }),
        ...(customString3 && { custom_string_3: customString3 }),
        ...(customString4 && { custom_string_4: customString4 }),
        ...(customString5 && { custom_string_5: customString5 }),
      };

      console.log('✅ [PAYFAST] Payment fields prepared:', {
        merchant_id: paymentFields.merchant_id,
        amount: paymentFields.amount,
        m_payment_id: paymentFields.m_payment_id,
        item_name: paymentFields.item_name,
        name_first: paymentFields.name_first,
        name_last: paymentFields.name_last,
        email_address: paymentFields.email_address,
        signature: paymentFields.signature ? '***' : null,
        total_fields: Object.keys(paymentFields).length,
      });

      // ========================================================================
      // STEP 4: CREATE HTML FORM DYNAMICALLY
      // ========================================================================
      console.log('🔨 [PAYFAST] Creating HTML form element...');

      // Create a form element
      const form = document.createElement('form');
      
      // Set form attributes
      form.method = 'POST'; // PayFast REQUIRES POST (GET returns 400 Bad Request)
      form.action = PAYFAST_SANDBOX_URL; // PayFast sandbox processing endpoint
      form.style.display = 'none'; // Hide the form (we don't want to show it)
      form.setAttribute('id', 'payfast-payment-form'); // ID for debugging
      form.setAttribute('accept-charset', 'utf-8'); // Character encoding
      form.setAttribute('enctype', 'application/x-www-form-urlencoded'); // Content type
      
      // Ensure form works with same-site/cross-site cookies
      // PayFast sandbox requires proper cookie handling
      form.setAttribute('target', '_self'); // Submit in same window

      console.log('✅ [PAYFAST] Form element created:', {
        method: form.method,
        action: form.action,
        id: form.id,
      });

      // ========================================================================
      // STEP 5: POPULATE FORM WITH PAYMENT FIELDS
      // ========================================================================
      console.log('📝 [PAYFAST] Populating form fields...');

      // Iterate through all payment fields and create hidden input elements
      for (const [fieldName, fieldValue] of Object.entries(paymentFields)) {
        // Skip empty/null/undefined values (PayFast doesn't accept empty fields)
        if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
          console.warn(`⚠️ [PAYFAST] Skipping empty field: ${fieldName}`);
          continue;
        }

        // Create a hidden input element for each field
        const input = document.createElement('input');
        input.type = 'hidden'; // Hidden field (not visible to user)
        input.name = fieldName; // Field name (must match PayFast requirements)
        
        // Set the field value
        // Note: Browser automatically URL-encodes form values on submission
        // PayFast expects URL-encoded values, which the browser handles automatically
        // We use the exact value as provided (no alterations) to match signature
        input.value = String(fieldValue); // Convert to string (exact value from booking data)

        // Append the input to the form
        form.appendChild(input);

        console.log(`  ✓ Added field: ${fieldName} = ${fieldName === 'signature' ? '***' : fieldValue}`);
      }

      console.log(`✅ [PAYFAST] Form populated with ${form.children.length} fields`);

      // ========================================================================
      // STEP 6: APPEND FORM TO DOM AND SUBMIT
      // ========================================================================
      console.log('🚀 [PAYFAST] Appending form to DOM...');

      // Append the form to the document body
      // This is required for the form to be submitted
      document.body.appendChild(form);

      console.log('✅ [PAYFAST] Form appended to DOM');
      console.log('📤 [PAYFAST] Submitting form to PayFast sandbox...');
      console.log(`   Endpoint: ${PAYFAST_SANDBOX_URL}`);
      console.log(`   Method: ${form.method}`);
      console.log(`   Fields: ${form.children.length}`);

      // Submit the form automatically
      // This will cause the browser to navigate to PayFast sandbox payment page
      // The user will see PayFast's payment interface
      form.submit();

      // ========================================================================
      // STEP 7: POST-SUBMISSION NOTES
      // ========================================================================
      // After form.submit() is called:
      // 1. Browser navigates to PayFast sandbox payment page
      // 2. User completes payment on PayFast's secure page
      // 3. PayFast processes the payment
      // 4. PayFast redirects user to return_url (success) or cancel_url (cancelled)
      // 5. PayFast sends webhook notification to notify_url (server-side)
      //
      // Note: No cleanup needed - the page will be replaced by PayFast's page
      // The form element will be removed when the page navigates away

      console.log('✅ [PAYFAST] Form submitted successfully!');
      console.log('   User will be redirected to PayFast sandbox payment page...');

    } catch (error: any) {
      // ========================================================================
      // ERROR HANDLING
      // ========================================================================
      console.error('❌ [PAYFAST] Error submitting payment form:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);

      // Re-throw error so calling code can handle it
      throw new Error(`Failed to submit PayFast payment: ${error.message}`);
    }
  };

  const handleBookSlotClick = async () => {
    if (!selectedSlot) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
    } catch {
      setError('Could not verify your account. Please sign in again.');
      return;
    }

    setBooking(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          counselorId,
          slotId: selectedSlot,
          amount: 500.0,
          consentAccepted: true,
        }),
      });

      let errorMessage = 'Failed to create booking. Please try again.';
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorMessage;
        } catch {
          if (response.status === 401) errorMessage = 'Please sign in again to continue.';
          else if (response.status === 400) errorMessage = 'Invalid request. Please check your selection and try again.';
          else if (response.status >= 500) errorMessage = 'Our servers are temporarily busy. Please try again in a moment.';
        }
        throw new Error(errorMessage);
      }

      let responseData: { bookingId?: string; bookingData?: { bookingId: string; amount: string; clientEmail: string; clientFirstName: string; clientLastName: string; signature?: string } } | null = null;
      try {
        responseData = await response.json();
      } catch {
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!responseData?.bookingData?.signature) {
        throw new Error('Booking was created but payment could not be started. Please check My Bookings or try again.');
      }

      const { bookingData } = responseData;

      setSlots((prev) => prev.filter((slot) => slot.id !== selectedSlot));

      const payPayload = {
        slotId: bookingData.bookingId,
        amount: parseFloat(bookingData.amount),
        clientEmail: bookingData.clientEmail,
        firstName: bookingData.clientFirstName,
        lastName: bookingData.clientLastName,
      };

      // Prefer opening PayFast in a new tab; fall back to same-window redirect if popup blocked
      const formRes = await fetch('/api/bookings/payfast-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: payPayload.slotId,
          amount: payPayload.amount,
          clientEmail: payPayload.clientEmail,
          firstName: payPayload.firstName,
          lastName: payPayload.lastName,
        }),
      });
      if (!formRes.ok) {
        const err = await formRes.json().catch(() => ({}));
        throw new Error(err?.error || err?.detail || 'Failed to open payment');
      }
      const html = await formRes.text();
      const payWindow = window.open('', '_blank');
      if (payWindow) {
        payWindow.document.write(html);
        payWindow.document.close();
      } else {
        try {
          sessionStorage.setItem('soulvyns_payfast_payload', JSON.stringify(payPayload));
        } catch {
          /* ignore */
        }
        window.location.href = '/bookings/pay';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading available slots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Select Time Slot</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {filteredSlots.length === 0 ? (
            <div className="text-center py-12">
              {error ? (
                <>
                  <p className="text-red-600 text-lg mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={() => { setError(''); setLoading(true); loadAvailableSlots(); }}
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium mr-2"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-lg mb-4">
                  {selectedDate ? 'No available sessions on that date.' : 'No available sessions yet.'}
                </p>
              )}
              {selectedDate && slots.length > 0 && (
                <button
                  type="button"
                  onClick={() => router.push(`/book/${encodeURIComponent(counselorId)}`)}
                  className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium mr-2"
                >
                  Show all dates
                </button>
              )}
              <Link
                href="/book"
                className="inline-block text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
              >
                ← Back to Counselors
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Available Sessions{selectedDate ? ` — ${selectedDate}` : ''}
              </h2>
              <div className="space-y-3 mb-6">
                {filteredSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedSlot === slot.id
                        ? 'bg-blue-50 border-blue-500 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(slot.start_time).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Duration: {Math.round((new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / (1000 * 60))} minutes
                        </p>
                      </div>
                      {selectedSlot === slot.id && (
                        <div className="text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">
                    I have read and agree to the{' '}
                    <Link href="/consent" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline hover:no-underline">
                      Client Informed Consent &amp; Platform Agreement
                    </Link>
                    . I understand that Soulvyns is a platform connecting me with independent psychologists and is not my healthcare provider.
                  </span>
                </label>
              </div>
              <button
                onClick={handleBookSlotClick}
                disabled={!selectedSlot || !consentAccepted || booking}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition font-medium text-lg"
              >
                {booking ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Book Session - R${500.00.toFixed(2)}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

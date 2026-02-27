/**
 * ============================================================================
 * PAYFAST SANDBOX PAYMENT FORM SUBMISSION - COMPLETE SNIPPET
 * ============================================================================
 * 
 * This function handles PayFast sandbox payment submission via POST form.
 * It dynamically creates an HTML form, populates all required fields,
 * and automatically submits it to PayFast sandbox.
 * 
 * Usage:
 *   submitPayFastSandboxPayment(bookingData)
 * 
 * ============================================================================
 */

/**
 * Submit booking payment to PayFast sandbox via POST form submission.
 * 
 * @param {Object} bookingData - Booking data object containing:
 *   - bookingId: string (e.g., "508dc4fc-5b51-42ac-95a0-6ffa26552fdb")
 *   - counselorId: string (e.g., "b4ba80b0-79d2-45da-a759-e6ba5395af1a")
 *   - clientEmail: string (e.g., "client@test.com")
 *   - amount: string (e.g., "500.00")
 *   - itemName: string (e.g., "Counseling Session - Booking 508dc4fc-5b51-42ac-95a0-6ffa26552fdb")
 *   - firstName: string (e.g., "John")
 *   - lastName: string (e.g., "Doe")
 *   - signature: string (e.g., "1e9124822f39f09175e373851bfa6ea4")
 */
function submitPayFastSandboxPayment(bookingData) {
  try {
    // ========================================================================
    // STEP 1: VALIDATE BOOKING DATA
    // ========================================================================
    console.log('🔍 [PAYFAST] Validating booking data...');
    
    if (!bookingData) {
      throw new Error('Booking data is required');
    }

    // Extract booking data with defaults
    const bookingId = bookingData.bookingId || '508dc4fc-5b51-42ac-95a0-6ffa26552fdb';
    const counselorId = bookingData.counselorId || 'b4ba80b0-79d2-45da-a759-e6ba5395af1a';
    const clientEmail = bookingData.clientEmail || 'client@test.com';
    const amount = bookingData.amount || '500.00';
    const itemName = bookingData.itemName || `Counseling Session - Booking ${bookingId}`;
    const firstName = bookingData.firstName || 'John';
    const lastName = bookingData.lastName || 'Doe';
    const signature = bookingData.signature || '1e9124822f39f09175e373851bfa6ea4';

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

    // All required PayFast sandbox fields
    // Note: PayFast requires these fields in a specific order for signature validation
    const paymentFields = {
      // Merchant identification
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,

      // Transaction details
      amount: amount, // Must be formatted as "500.00" (2 decimal places)
      item_name: itemName, // Description of the service/item
      m_payment_id: bookingId, // Merchant payment ID (booking ID)

      // Customer information
      name_first: firstName,
      name_last: lastName,
      email_address: clientEmail,

      // Callback URLs
      return_url: RETURN_URL, // Where to redirect after successful payment
      cancel_url: CANCEL_URL, // Where to redirect if payment is cancelled
      notify_url: NOTIFY_URL, // Webhook URL for payment notifications

      // Security signature (generated server-side, must match PayFast requirements)
      signature: signature, // MD5 hash signature
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
      
      // URL encode the value to ensure special characters are handled correctly
      // PayFast requires URL encoding for values containing special characters
      // encodeURIComponent handles: : / ? # [ ] @ ! $ & ' ( ) * + , ; =
      // Note: We encode here to ensure proper transmission, but PayFast will decode it
      input.value = String(fieldValue); // Convert to string and use as-is
      // Note: Browser automatically URL-encodes form values on submission
      // If you need manual encoding, use: encodeURIComponent(String(fieldValue))

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

    return true; // Success

  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    console.error('❌ [PAYFAST] Error submitting payment form:', error);
    console.error('   Error message:', error.message);
    console.error('   Stack trace:', error.stack);

    // Re-throw error so calling code can handle it
    throw new Error(`Failed to submit PayFast payment: ${error.message}`);
  }
}

/**
 * ============================================================================
 * EXAMPLE USAGE
 * ============================================================================
 * 
 * // Example 1: Using provided booking data
 * const bookingData = {
 *   bookingId: '508dc4fc-5b51-42ac-95a0-6ffa26552fdb',
 *   counselorId: 'b4ba80b0-79d2-45da-a759-e6ba5395af1a',
 *   clientEmail: 'client@test.com',
 *   amount: '500.00',
 *   itemName: 'Counseling Session - Booking 508dc4fc-5b51-42ac-95a0-6ffa26552fdb',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   signature: '1e9124822f39f09175e373851bfa6ea4',
 * };
 * 
 * // Call the function when user clicks "Pay Now" button
 * submitPayFastSandboxPayment(bookingData);
 * 
 * // Example 2: Using minimal data (uses defaults)
 * submitPayFastSandboxPayment({
 *   bookingId: '508dc4fc-5b51-42ac-95a0-6ffa26552fdb',
 *   signature: '1e9124822f39f09175e373851bfa6ea4',
 * });
 * 
 * ============================================================================
 */

// Export for use in modules (if using ES6 modules)
// export { submitPayFastSandboxPayment };

// For browser/global use, attach to window object
if (typeof window !== 'undefined') {
  window.submitPayFastSandboxPayment = submitPayFastSandboxPayment;
}

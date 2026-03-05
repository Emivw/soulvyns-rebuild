import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Development seed route to populate database with test data.
 * - In development: always allowed.
 * - In production: allowed only if request body includes secret matching SEED_SECRET env var.
 */
export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const seedSecret = process.env.SEED_SECRET?.trim();

    if (!isDev) {
      if (!seedSecret) {
        console.warn('⚠️ Seed route accessed in production but SEED_SECRET is not set');
        return NextResponse.json(
          { error: 'Seed route is only available in development mode or when SEED_SECRET is configured' },
          { status: 403 }
        );
      }
      const body = await request.json().catch(() => ({}));
      const providedSecret = (body?.secret ?? body?.SEED_SECRET ?? '').toString().trim();
      if (providedSecret !== seedSecret) {
        return NextResponse.json(
          { error: 'Invalid or missing seed secret' },
          { status: 403 }
        );
      }
    }

    // Verify Supabase credentials are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Missing Supabase configuration. Please check .env.local file.' },
        { status: 500 }
      );
    }

    console.log('🌱 Starting database seed...');
    console.log('📋 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // 1. Create test counselor user profile
    console.log('👤 Creating test counselor user profile...');
    const counselorEmail = 'counselor@test.com';
    const counselorPassword = 'TestPassword123!';
    const counselorName = 'Dr. Jane Smith';

    // Check if counselor user already exists
    console.log('🔍 Checking for existing counselor user...');
    const { data: existingCounselorUsers, error: listUsersError } = 
      await supabaseAdmin.auth.admin.listUsers();

    if (listUsersError) {
      console.error('❌ Error listing users:', listUsersError);
      throw new Error(`Failed to list users: ${listUsersError.message}`);
    }

    const counselorUserExists = existingCounselorUsers?.users?.find(
      (u) => u.email === counselorEmail
    );

    let counselorUserId: string;

    if (counselorUserExists) {
      console.log('✅ Counselor user already exists, using existing user:', counselorUserExists.id);
      counselorUserId = counselorUserExists.id;
    } else {
      console.log('➕ Creating new counselor user...');
      // Create counselor user
      const { data: counselorUser, error: counselorUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: counselorEmail,
          password: counselorPassword,
          email_confirm: true,
          user_metadata: {
            full_name: counselorName,
            role: 'counselor',
          },
        });

      if (counselorUserError) {
        console.error('❌ Counselor user creation error:', counselorUserError);
        throw new Error(`Failed to create counselor user: ${counselorUserError.message}`);
      }

      if (!counselorUser?.user) {
        throw new Error('Counselor user creation returned no user data');
      }

      counselorUserId = counselorUser.user.id;
      console.log(`✅ Created counselor user: ${counselorUserId}`);
    }

    // Ensure counselor user profile exists
    console.log('🔍 Verifying counselor user profile...');
    const { data: counselorProfile, error: counselorProfileError } = await supabaseAdmin
      .from('users_profile')
      .select('*')
      .eq('id', counselorUserId)
      .single();

    if (counselorProfileError && counselorProfileError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is okay
      console.error('❌ Error checking counselor profile:', counselorProfileError);
      throw new Error(`Failed to check counselor profile: ${counselorProfileError.message}`);
    }

    if (!counselorProfile) {
      console.log('➕ Creating counselor user profile...');
      const { error: createProfileError } = await supabaseAdmin
        .from('users_profile')
        .insert({
          id: counselorUserId,
          email: counselorEmail,
          full_name: counselorName,
          role: 'counselor',
        });

      if (createProfileError) {
        console.error('❌ Error creating counselor profile:', createProfileError);
        throw new Error(`Failed to create counselor profile: ${createProfileError.message}`);
      }
      console.log('✅ Created counselor user profile');
    } else {
      console.log('✅ Counselor user profile already exists');
    }

    // 2. Create counselor record
    console.log('👨‍⚕️ Creating counselor record...');
    const { data: existingCounselor, error: counselorCheckError } = await supabaseAdmin
      .from('counselors')
      .select('id')
      .eq('email', counselorEmail)
      .maybeSingle();

    if (counselorCheckError) {
      console.error('❌ Error checking counselor:', counselorCheckError);
      throw new Error(`Failed to check counselor: ${counselorCheckError.message}`);
    }

    let counselorId: string;

    const graphOrganizerEmail = 'admin@soulvyns.co.za';
    if (existingCounselor) {
      console.log('✅ Counselor record already exists:', existingCounselor.id);
      counselorId = existingCounselor.id;
      await supabaseAdmin
        .from('counselors')
        .update({ ms_graph_user_email: graphOrganizerEmail })
        .eq('id', counselorId);
    } else {
      console.log('➕ Creating new counselor record...');
      const { data: counselor, error: counselorError } = await supabaseAdmin
        .from('counselors')
        .insert({
          user_id: counselorUserId,
          email: counselorEmail,
          display_name: counselorName,
          ms_graph_user_email: graphOrganizerEmail, // Organizational user for Teams/Graph (must exist in Azure AD tenant)
        })
        .select()
        .single();

      if (counselorError) {
        console.error('❌ Counselor creation error:', counselorError);
        throw new Error(`Failed to create counselor: ${counselorError.message}`);
      }

      if (!counselor) {
        throw new Error('Counselor creation returned no data');
      }

      counselorId = counselor.id;
      console.log(`✅ Created counselor record: ${counselorId}`);
    }

    // 3. Create availability slots
    console.log('📅 Creating availability slots...');
    const now = new Date();
    const slots = [];

    // Create 2 slots: one tomorrow, one day after
    for (let i = 1; i <= 2; i++) {
      const slotDate = new Date(now);
      slotDate.setDate(slotDate.getDate() + i);
      slotDate.setHours(10, 0, 0, 0); // 10:00 AM

      const startTime = new Date(slotDate);
      const endTime = new Date(slotDate);
      endTime.setHours(11, 0, 0, 0); // 11:00 AM (1 hour slot)

      slots.push({
        counselor_id: counselorId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_booked: false,
      });
    }

    // Delete existing slots for this counselor first (if any)
    console.log('🗑️ Cleaning up existing slots for counselor...');
    const { error: deleteError } = await supabaseAdmin
      .from('availability_slots')
      .delete()
      .eq('counselor_id', counselorId);

    if (deleteError) {
      console.warn('⚠️ Error deleting existing slots (may not exist):', deleteError.message);
      // Don't throw - slots may not exist yet
    } else {
      console.log('✅ Cleaned up existing slots');
    }

    console.log('➕ Inserting new availability slots...');
    const { data: createdSlots, error: slotsError } = await supabaseAdmin
      .from('availability_slots')
      .insert(slots)
      .select();

    if (slotsError) {
      console.error('❌ Slots creation error:', slotsError);
      throw new Error(`Failed to create slots: ${slotsError.message}`);
    }

    if (!createdSlots || createdSlots.length === 0) {
      throw new Error('Slot creation returned no data');
    }

    console.log(`✅ Created ${createdSlots.length} availability slots`);

    // 4. Create test client user
    console.log('👤 Creating test client user...');
    const clientEmail = 'client@test.com';
    const clientPassword = 'TestPassword123!';
    const clientName = 'John Doe';

    console.log('🔍 Checking for existing client user...');
    const { data: allUsers, error: listAllUsersError } = 
      await supabaseAdmin.auth.admin.listUsers();

    if (listAllUsersError) {
      console.error('❌ Error listing users:', listAllUsersError);
      throw new Error(`Failed to list users: ${listAllUsersError.message}`);
    }

    const clientUserExists = allUsers?.users?.find(
      (u) => u.email === clientEmail
    );

    let clientUserId: string;

    if (clientUserExists) {
      console.log('✅ Client user already exists, using existing user:', clientUserExists.id);
      clientUserId = clientUserExists.id;
    } else {
      console.log('➕ Creating new client user...');
      const { data: clientUser, error: clientUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: clientEmail,
          password: clientPassword,
          email_confirm: true,
          user_metadata: {
            full_name: clientName,
            role: 'client',
          },
        });

      if (clientUserError) {
        console.error('❌ Client user creation error:', clientUserError);
        throw new Error(`Failed to create client user: ${clientUserError.message}`);
      }

      if (!clientUser?.user) {
        throw new Error('Client user creation returned no user data');
      }

      clientUserId = clientUser.user.id;
      console.log(`✅ Created client user: ${clientUserId}`);
    }

    // Verify user profile was created (trigger should handle this, but ensure it exists)
    console.log('🔍 Verifying client user profile...');
    const { data: clientProfile, error: clientProfileCheckError } = await supabaseAdmin
      .from('users_profile')
      .select('*')
      .eq('id', clientUserId)
      .maybeSingle();

    if (clientProfileCheckError && clientProfileCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking client profile:', clientProfileCheckError);
      throw new Error(`Failed to check client profile: ${clientProfileCheckError.message}`);
    }

    if (!clientProfile) {
      console.log('➕ User profile not found, creating manually...');
      const { error: createClientProfileError } = await supabaseAdmin
        .from('users_profile')
        .insert({
          id: clientUserId,
          email: clientEmail,
          full_name: clientName,
          role: 'client',
        });

      if (createClientProfileError) {
        console.error('❌ Error creating client profile:', createClientProfileError);
        throw new Error(`Failed to create client profile: ${createClientProfileError.message}`);
      }
      console.log('✅ Created client user profile');
    } else {
      console.log('✅ Client user profile already exists');
    }

    console.log('✅ Seed completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Counselor: ${counselorEmail} (${counselorId})`);
    console.log(`   - Client: ${clientEmail} (${clientUserId})`);
    console.log(`   - Slots: ${createdSlots.length} created`);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        counselor: {
          id: counselorId,
          email: counselorEmail,
          password: counselorPassword,
          name: counselorName,
        },
        client: {
          id: clientUserId,
          email: clientEmail,
          password: clientPassword,
          name: clientName,
        },
        slots: createdSlots.map((slot) => ({
          id: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
      },
    });
  } catch (error: any) {
    console.error('❌ Seed error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      ...(error.stack && { stack: error.stack }),
    });

    // Return descriptive error message
    const errorMessage = error.message || 'Unknown error occurred during seeding';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          message: errorMessage,
          name: error.name,
          code: error.code,
          stack: error.stack,
        }
      : {
          message: errorMessage,
        };

    return NextResponse.json(
      {
        error: 'Seed failed',
        ...errorDetails,
      },
      { status: 500 }
    );
  }
}

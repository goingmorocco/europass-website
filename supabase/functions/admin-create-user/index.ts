// EuroPass — admin-create-user Edge Function
//
// Why this has to be a server-side function and not a browser call:
// creating a real login (an auth.users row with a password) requires the
// Supabase *service role* key, which bypasses Row Level Security entirely.
// That key must never be shipped in browser JS. This function holds it
// safely on the server, checks that the CALLER is actually an admin
// (using their own request token, which only proves who *they* are), and
// only then uses the service key to create the new user.
//
// Deploy with:  supabase functions deploy admin-create-user
// Call from the browser with: supabase.functions.invoke('admin-create-user', { body: {...} })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Client scoped to the CALLER's own JWT — used only to verify who is calling.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) throw new Error('Not authenticated');

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (profileErr || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, full_name, role, course_id, title } = await req.json();
    if (!email || !password || !full_name || !role) {
      throw new Error('email, password, full_name, and role are required');
    }
    if (!['teacher', 'student'].includes(role)) {
      throw new Error('Admins may only create teacher or student accounts here');
    }

    // Admin client — this is the ONLY place the service role key is used.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, course_id: course_id || null, title: title || null },
    });
    if (createErr) throw createErr;

    // handle_new_user() always inserts new profiles as role='student' —
    // deliberately, so client-supplied signup metadata can never grant a
    // role. Promoting to 'teacher' happens here instead: a direct table
    // update using the service role key, which only this trusted,
    // admin-verified server-side code path can do.
    if (role === 'teacher') {
      const { error: promoteErr } = await adminClient
        .from('profiles')
        .update({ role: 'teacher', course_id: course_id || null, title: title || null })
        .eq('id', created.user.id);
      if (promoteErr) throw promoteErr;
    }

    return new Response(JSON.stringify({ user: created.user }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { basePath } from './paths';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** These public settings identify a project; access is enforced by its RLS. */
export const cloudAvailable = Boolean(supabaseUrl && supabaseAnonKey);

let cloudClient: SupabaseClient | null = null;

export function getCloudClient(): SupabaseClient | null {
  if (!cloudAvailable) return null;
  cloudClient ??= createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return cloudClient;
}

function requireClient(): SupabaseClient {
  const client = getCloudClient();
  if (!client) {
    throw new Error(
      'Sinkronisasi belum dikonfigurasi. Lengkapi pengaturan Supabase terlebih dahulu.',
    );
  }
  return client;
}

async function scopedRequestClient(
  client: SupabaseClient,
  expectedUserId?: string,
): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Masuk dengan Google untuk menyinkronkan perjalananmu.');
  if (expectedUserId && data.session.user.id !== expectedUserId) {
    throw new Error('Akun berubah saat sinkronisasi. Muat data akun yang aktif terlebih dahulu.');
  }
  // Bind each operation to the session that started it. Otherwise switching
  // accounts while getSession() awaits could send an old snapshot using a new
  // account's Authorization header. RLS verifies this captured JWT on the server.
  const accessToken = data.session.access_token;
  return {
    client: createClient(supabaseUrl!, supabaseAnonKey!, {
      accessToken: async () => accessToken,
    }),
    userId: data.session.user.id,
  };
}

export async function signInWithGoogle(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Login Google tersedia melalui browser.');
  }
  const { error } = await requireClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${basePath}/` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const client = getCloudClient();
  if (!client) return;
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export type CloudStateRow = { data: unknown; revision: number };

export class CloudConflictError extends Error {
  constructor() {
    super('Data berubah di perangkat lain. Tinjau data terbaru sebelum menyimpan lagi.');
    this.name = 'CloudConflictError';
  }
}

export async function loadCloudState(expectedUserId?: string): Promise<CloudStateRow | null> {
  const { client, userId } = await scopedRequestClient(requireClient(), expectedUserId);
  const { data, error } = await client
    .from('app_state')
    .select('data, revision')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!Number.isSafeInteger(data.revision) || data.revision < 1) {
    throw new Error('Versi data cloud tidak valid. Data lokal tidak ditimpa.');
  }
  return { data: data.data, revision: data.revision };
}

/**
 * null means create-if-absent; a number means compare-and-swap that revision.
 * A conflict must be resolved explicitly by the caller, never blindly retried.
 */
export async function saveCloudState(
  data: unknown,
  expectedRevision: number | null,
  expectedUserId?: string,
): Promise<number> {
  if (
    expectedRevision !== null &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
  ) {
    throw new Error('Versi sinkronisasi tidak valid.');
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Data perjalanan harus berupa objek.');
  }
  const { client } = await scopedRequestClient(requireClient(), expectedUserId);
  const { data: revision, error } = await client.rpc('save_iris_state', {
    p_data: data,
    p_expected_revision: expectedRevision,
  });
  if (error) {
    if (error.code === 'P0001' && error.message.includes('IRIS_STATE_CONFLICT')) {
      throw new CloudConflictError();
    }
    throw error;
  }
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('Server mengembalikan versi sinkronisasi yang tidak valid.');
  }
  return revision;
}

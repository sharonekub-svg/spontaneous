import * as Crypto from 'expo-crypto';

import { supabase } from './supabase';

/**
 * Uploads a local file (file:// URI) to a Supabase Storage bucket under a
 * folder named by the user's id (required by the storage RLS policies).
 * Returns the storage path and a content hash used for duplicate detection.
 */
export async function uploadToBucket(params: {
  bucket: 'avatars' | 'proofs';
  userId: string;
  uri: string;
  contentType: string;
  extension: string;
}): Promise<{ path: string; hash: string }> {
  const response = await fetch(params.uri);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    // Hash a stable fingerprint: size + a sampling of bytes keeps it cheap on
    // large videos while still catching identical re-uploads.
    `${bytes.length}:${bytes.slice(0, 1024).join(',')}:${bytes.slice(-1024).join(',')}`,
  );

  const path = `${params.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${params.extension}`;

  const { error } = await supabase.storage.from(params.bucket).upload(path, arrayBuffer, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) throw error;

  return { path, hash };
}

/** Returns a signed URL for a private object (proofs), valid for one hour. */
export async function getSignedUrl(bucket: 'proofs', path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Public URL for objects in a public bucket (avatars). */
export function getPublicUrl(bucket: 'avatars', path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

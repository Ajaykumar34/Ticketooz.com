
import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to the Supabase Storage bucket 'event-logos'.
 * Returns the public URL of the uploaded file if successful.
 */
export async function uploadEventLogo(file: File, eventIdOrName?: string): Promise<{ url: string | null; error: string | null; }> {
  if (!file) {
    return { url: null, error: 'No file provided' };
  }

  // Use a unique path - eventId if available, otherwise timestamp+name
  const ext = file.name.split('.').pop();
  const fileName = `${eventIdOrName || 'event'}-${Date.now()}.${ext}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from('event-logos')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Error uploading file:', error);
    return { url: null, error: error.message || 'Upload failed' };
  }

  // Get the public URL
  const { data: publicUrlData } = supabase
    .storage
    .from('event-logos')
    .getPublicUrl(filePath);

  const url = publicUrlData?.publicUrl || null;
  return { url, error: null };
}

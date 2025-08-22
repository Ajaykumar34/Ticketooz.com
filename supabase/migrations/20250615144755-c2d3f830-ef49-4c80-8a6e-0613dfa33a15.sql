
-- Allow public access (read/write/delete) to all objects in the event-logos bucket

-- READ access for everyone
CREATE POLICY "Enable read access for all users" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-logos');

-- WRITE access for everyone
CREATE POLICY "Enable insert for all users" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'event-logos');

-- UPDATE access for everyone
CREATE POLICY "Enable update for all users" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'event-logos');

-- DELETE access for everyone
CREATE POLICY "Enable delete for all users" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'event-logos');

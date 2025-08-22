
-- Drop all existing tables in the correct order to avoid foreign key constraint violations
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS event_seat_pricing CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS seat_layouts CASCADE;
DROP TABLE IF EXISTS seat_categories CASCADE;
DROP TABLE IF EXISTS event_price_zones CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS event_requests CASCADE;
DROP TABLE IF EXISTS carousel_slides CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop any custom types
DROP TYPE IF EXISTS admin_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;

-- Drop any custom functions
DROP FUNCTION IF EXISTS create_default_seat_categories_for_venue() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_code() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_code_trigger() CASCADE;
DROP FUNCTION IF EXISTS get_admin_users_with_profiles() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS check_event_sold_out_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS trigger_check_sold_out_status() CASCADE;

-- Recreate custom types
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin');
CREATE TYPE booking_status AS ENUM ('Confirmed', 'Pending', 'Cancelled');
CREATE TYPE event_status AS ENUM ('Active', 'Inactive', 'Draft');

-- Create profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  email TEXT,
  phone TEXT,
  mobile_number TEXT,
  address TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  landmark TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  gender TEXT,
  birthday DATE,
  is_married BOOLEAN DEFAULT false,
  anniversary_date DATE,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create events table (with seat_map moved here from venues)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  sale_start TIMESTAMPTZ NOT NULL,
  sale_end TIMESTAMPTZ NOT NULL,
  poster TEXT,
  artist_name TEXT,
  artist_image TEXT,
  terms_and_conditions TEXT,
  status TEXT DEFAULT 'Active',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_regular BOOLEAN NOT NULL DEFAULT false,
  is_sold_out BOOLEAN DEFAULT false,
  sold_out_at TIMESTAMPTZ,
  seat_map JSONB,
  seat_map_config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create seat_categories table (linked to events instead of venues)
CREATE TABLE seat_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  base_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create seat_layouts table (linked to events instead of venues)
CREATE TABLE seat_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER DEFAULT 10,
  columns INTEGER DEFAULT 10,
  layout_data JSONB NOT NULL DEFAULT '{"rows": 10, "seats": [], "columns": 10}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create seats table
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_layout_id UUID NOT NULL REFERENCES seat_layouts(id) ON DELETE CASCADE,
  seat_category_id UUID NOT NULL REFERENCES seat_categories(id),
  seat_number TEXT NOT NULL,
  row_name TEXT NOT NULL,
  row_label TEXT,
  x_position INTEGER NOT NULL DEFAULT 0,
  y_position INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seat_layout_id, x_position, y_position)
);

-- Create event_seat_pricing table
CREATE TABLE event_seat_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  seat_category_id UUID REFERENCES seat_categories(id),
  base_price NUMERIC NOT NULL,
  convenience_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, seat_category_id)
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  status booking_status DEFAULT 'Confirmed',
  seat_numbers JSONB,
  booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  seat_id UUID REFERENCES seats(id),
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  price NUMERIC NOT NULL,
  ticket_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financial_transactions table
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  event_id UUID REFERENCES events(id),
  ticket_price NUMERIC NOT NULL,
  convenience_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  gst_on_commission NUMERIC DEFAULT 0,
  gst_on_convenience NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  customer_state TEXT,
  event_state TEXT,
  payment_mode TEXT DEFAULT 'online',
  actual_commission NUMERIC DEFAULT 0,
  gst_on_actual_commission NUMERIC DEFAULT 0,
  reimbursable_ticket_price NUMERIC DEFAULT 0,
  convenience_base_fee NUMERIC DEFAULT 0,
  gst_on_convenience_base_fee NUMERIC DEFAULT 0,
  is_wb_customer BOOLEAN DEFAULT false,
  is_wb_event BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create event_requests table
CREATE TABLE event_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_description TEXT,
  event_category TEXT NOT NULL,
  preferred_date TIMESTAMPTZ,
  preferred_venue TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create carousel_slides table
CREATE TABLE carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image TEXT,
  button_text TEXT,
  button_link TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event_price_zones table (for legacy compatibility)
CREATE TABLE event_price_zones (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  seat_layout_id VARCHAR,
  zone_name VARCHAR,
  base_price BIGINT,
  convenience_fee DOUBLE PRECISION,
  commission DOUBLE PRECISION,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_seat_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_price_zones ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (public read access for most tables)
CREATE POLICY "Allow public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON tags FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON venues FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON seat_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON seat_layouts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON seats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON event_seat_pricing FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON carousel_slides FOR SELECT USING (true);

-- Admin policies for management
CREATE POLICY "Allow all for admins" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON venues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON seat_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON seat_layouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON seats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON event_seat_pricing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON event_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON carousel_slides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON event_price_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for admins" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- User-specific policies for profiles (users can only see/edit their own)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Recreate essential functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_default_seat_categories_for_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.seat_categories (event_id, name, color, base_price, is_active)
  VALUES
    (NEW.id, 'General',    '#4ECDC4', 0, true),
    (NEW.id, 'VIP',        '#FFD700', 0, true),
    (NEW.id, 'Premium',    '#FF6B6B', 0, true),
    (NEW.id, 'Balcony',    '#45B7D1', 0, true),
    (NEW.id, 'Box',        '#96CEB4', 0, true),
    (NEW.id, 'Orchestra',  '#FFEAA7', 0, true),
    (NEW.id, 'Mezzanine',  '#DDA0DD', 0, true),
    (NEW.id, 'Economy',    '#98D8C8', 0, true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_ticket_code_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_code IS NULL THEN
    NEW.ticket_code := 'TKT' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 9));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_event_sold_out_status(event_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    total_seats INTEGER := 0;
    booked_seats INTEGER := 0;
    event_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get event end time
    SELECT end_datetime INTO event_end_time
    FROM events 
    WHERE id = event_uuid;
    
    -- Check if event has expired
    IF event_end_time < NOW() THEN
        -- Reset sold out status for expired events
        UPDATE events 
        SET is_sold_out = FALSE, sold_out_at = NULL 
        WHERE id = event_uuid;
        RETURN FALSE;
    END IF;
    
    -- Count total available seats for the event
    SELECT COUNT(s.id) INTO total_seats
    FROM seats s
    JOIN seat_layouts sl ON s.seat_layout_id = sl.id
    WHERE sl.event_id = event_uuid 
    AND s.is_available = TRUE 
    AND s.is_blocked = FALSE;
    
    -- Count booked seats for the event
    SELECT COALESCE(SUM(b.quantity), 0) INTO booked_seats
    FROM bookings b
    WHERE b.event_id = event_uuid 
    AND b.status = 'Confirmed';
    
    -- Update sold out status
    IF total_seats > 0 AND booked_seats >= total_seats THEN
        UPDATE events 
        SET is_sold_out = TRUE, sold_out_at = COALESCE(sold_out_at, NOW())
        WHERE id = event_uuid AND is_sold_out = FALSE;
        RETURN TRUE;
    ELSE
        UPDATE events 
        SET is_sold_out = FALSE, sold_out_at = NULL
        WHERE id = event_uuid AND is_sold_out = TRUE;
        RETURN FALSE;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_check_sold_out_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check sold out status for the event
    PERFORM check_event_sold_out_status(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.event_id
            ELSE NEW.event_id
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER trg_create_default_seat_categories
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_default_seat_categories_for_event();

CREATE TRIGGER trg_generate_ticket_code
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_code_trigger();

CREATE TRIGGER bookings_sold_out_check
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_check_sold_out_status();

-- Create indexes for better performance
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);
CREATE INDEX idx_events_sold_out ON events(is_sold_out, sold_out_at);
CREATE INDEX idx_seat_categories_event_id ON seat_categories(event_id);
CREATE INDEX idx_seat_layouts_event_id ON seat_layouts(event_id);
CREATE INDEX idx_seats_layout_id ON seats(seat_layout_id);
CREATE INDEX idx_seats_category_id ON seats(seat_category_id);
CREATE INDEX idx_event_seat_pricing_event_id ON event_seat_pricing(event_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_status ON bookings(event_id, status);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_state ON venues(state);

-- Insert some sample data for categories
INSERT INTO categories (name, description) VALUES
('Concert', 'Musical performances and concerts'),
('Theater', 'Theater performances and plays'),
('Sports', 'Sports events and competitions'),
('Comedy', 'Comedy shows and stand-up performances'),
('Conference', 'Business conferences and seminars'),
('Workshop', 'Educational workshops and training sessions');

-- Insert sample venues
INSERT INTO venues (name, address, city, state) VALUES
('Phoenix Arena', '123 Main Street, Phoenix Downtown', 'Phoenix', 'Arizona'),
('Mumbai Concert Hall', '456 Marine Drive, Nariman Point', 'Mumbai', 'Maharashtra'),
('Delhi Convention Center', '789 CP Block, Connaught Place', 'Delhi', 'Delhi'),
('Bangalore Tech Hub', '101 MG Road, Brigade Road', 'Bangalore', 'Karnataka'),
('Chennai Music Academy', '202 T Nagar, Anna Salai', 'Chennai', 'Tamil Nadu');

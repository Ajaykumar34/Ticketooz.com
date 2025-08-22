
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
DROP TYPE IF EXISTS layout_type CASCADE;

-- Drop any custom functions
DROP FUNCTION IF EXISTS create_default_seat_categories_for_venue() CASCADE;
DROP FUNCTION IF EXISTS create_default_seat_categories_for_event() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_code() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_code_trigger() CASCADE;
DROP FUNCTION IF EXISTS get_admin_users_with_profiles() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS check_event_sold_out_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS trigger_check_sold_out_status() CASCADE;

-- Create custom types
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin');
CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'cancelled');
CREATE TYPE event_status AS ENUM ('active', 'inactive', 'draft', 'cancelled');
CREATE TYPE layout_type AS ENUM ('general', 'seatmap');

-- Create profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  capacity INTEGER,
  facilities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create events table with layout_type
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  sale_start TIMESTAMPTZ NOT NULL,
  sale_end TIMESTAMPTZ NOT NULL,
  poster TEXT,
  artist_name TEXT,
  artist_image TEXT,
  terms_and_conditions TEXT,
  status event_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_regular BOOLEAN DEFAULT false,
  layout_type layout_type DEFAULT 'general',
  language TEXT,
  duration NUMERIC, -- in hours
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create seat_categories table (linked to venues)
CREATE TABLE seat_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4ECDC4',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(venue_id, name)
);

-- Create seat_layouts table (linked to events)
CREATE TABLE seat_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_data JSONB NOT NULL DEFAULT '{"rows": 10, "columns": 10, "seats": []}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create event_seat_pricing table
CREATE TABLE event_seat_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seat_category_id UUID NOT NULL REFERENCES seat_categories(id) ON DELETE CASCADE,
  base_price NUMERIC NOT NULL CHECK (base_price >= 0),
  convenience_fee NUMERIC DEFAULT 0 CHECK (convenience_fee >= 0),
  commission NUMERIC DEFAULT 0 CHECK (commission >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, seat_category_id)
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  status booking_status DEFAULT 'pending',
  booking_reference TEXT UNIQUE,
  seat_details JSONB DEFAULT '[]',
  payment_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_code TEXT UNIQUE,
  seat_number TEXT,
  seat_category TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_seat_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read access" ON events FOR SELECT USING (true);
CREATE POLICY "Public read access" ON seat_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON seat_layouts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON event_seat_pricing FOR SELECT USING (true);

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tickets" ON tickets 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = tickets.booking_id AND bookings.user_id = auth.uid()
  ));

-- Create admin policies
CREATE POLICY "Admin full access" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON admin_users FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON venues FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON seat_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON seat_layouts FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON event_seat_pricing FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);
CREATE POLICY "Admin full access" ON tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
);

-- Create essential functions
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

CREATE OR REPLACE FUNCTION create_default_seat_categories_for_venue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.seat_categories (venue_id, name, color)
  VALUES
    (NEW.id, 'General', '#4ECDC4'),
    (NEW.id, 'VIP', '#FFD700'),
    (NEW.id, 'Premium', '#FF6B6B'),
    (NEW.id, 'Balcony', '#45B7D1');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BK' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_ticket_code()
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

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER create_default_seat_categories
  AFTER INSERT ON venues
  FOR EACH ROW EXECUTE FUNCTION create_default_seat_categories_for_venue();

CREATE TRIGGER generate_booking_reference_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

CREATE TRIGGER generate_ticket_code_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_code();

-- Create indexes for better performance
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_layout_type ON events(layout_type);
CREATE INDEX idx_seat_categories_venue_id ON seat_categories(venue_id);
CREATE INDEX idx_seat_layouts_event_id ON seat_layouts(event_id);
CREATE INDEX idx_event_seat_pricing_event_id ON event_seat_pricing(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Concert', 'Musical performances and live concerts'),
('Theater', 'Theatrical performances and plays'),
('Sports', 'Sports events and competitions'),
('Comedy', 'Comedy shows and stand-up performances'),
('Conference', 'Business conferences and seminars'),
('Workshop', 'Educational workshops and training');

-- Insert sample venues
INSERT INTO venues (name, address, city, state, capacity) VALUES
('Phoenix Arena', '123 Main Street, Downtown', 'Phoenix', 'Arizona', 5000),
('Mumbai Concert Hall', '456 Marine Drive, Nariman Point', 'Mumbai', 'Maharashtra', 3000),
('Delhi Convention Center', '789 CP Block, Connaught Place', 'Delhi', 'Delhi', 2000),
('Bangalore Tech Hub', '101 MG Road, Brigade Road', 'Bangalore', 'Karnataka', 1500),
('Chennai Music Academy', '202 T Nagar, Anna Salai', 'Chennai', 'Tamil Nadu', 2500);

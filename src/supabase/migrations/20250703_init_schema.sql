-- Create tables for Ferry Transit application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ports table
CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_mainland BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ships table
CREATE TABLE IF NOT EXISTS ships (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  capacity_passengers INTEGER,
  capacity_cars INTEGER,
  speed_knots DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  from_port_id INTEGER REFERENCES ports(id),
  to_port_id INTEGER REFERENCES ports(id),
  ship_id INTEGER REFERENCES ships(id),
  duration_minutes INTEGER NOT NULL,
  distance_km DECIMAL(6, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_port_id, to_port_id, ship_id)
);

-- Timetables table
CREATE TABLE IF NOT EXISTS timetables (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  day_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  is_special_schedule BOOLEAN DEFAULT false,
  special_dates DATE[], -- Specific dates this schedule applies to
  excluded_dates DATE[], -- Specific dates this schedule does NOT apply to
  notes_ja TEXT,
  notes_en TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fares table
CREATE TABLE IF NOT EXISTS fares (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  passenger_type TEXT NOT NULL CHECK (passenger_type IN ('adult', 'child', 'student', 'senior')),
  fare_class TEXT NOT NULL CHECK (fare_class IN ('regular', 'first_class')),
  price INTEGER NOT NULL,
  peak_season_price INTEGER,
  valid_from DATE NOT NULL,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle fares table
CREATE TABLE IF NOT EXISTS vehicle_fares (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  vehicle_length_m DECIMAL(4, 2) NOT NULL,
  price INTEGER NOT NULL,
  peak_season_price INTEGER,
  valid_from DATE NOT NULL,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  name_ja TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_peak_season BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title_ja TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ja TEXT NOT NULL,
  content_en TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'alert')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_from TIMESTAMPTZ NOT NULL,
  display_until TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operation alerts table
CREATE TABLE IF NOT EXISTS operation_alerts (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  alert_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('normal', 'delayed', 'cancelled', 'extra')),
  delay_minutes INTEGER,
  reason_ja TEXT,
  reason_en TEXT,
  details_ja TEXT,
  details_en TEXT,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search logs table
CREATE TABLE IF NOT EXISTS search_logs (
  id BIGSERIAL PRIMARY KEY,
  from_port_id INTEGER REFERENCES ports(id),
  to_port_id INTEGER REFERENCES ports(id),
  search_date DATE,
  results_count INTEGER,
  user_locale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_timetables_route_id ON timetables(route_id);
CREATE INDEX idx_timetables_valid_from ON timetables(valid_from);
CREATE INDEX idx_timetables_day_of_week ON timetables USING GIN(day_of_week);
CREATE INDEX idx_fares_route_id ON fares(route_id);
CREATE INDEX idx_operation_alerts_date ON operation_alerts(alert_date);
CREATE INDEX idx_announcements_active ON announcements(is_active, display_from, display_until);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ports_updated_at BEFORE UPDATE ON ports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ships_updated_at BEFORE UPDATE ON ships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fares_updated_at BEFORE UPDATE ON fares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_fares_updated_at BEFORE UPDATE ON vehicle_fares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operation_alerts_updated_at BEFORE UPDATE ON operation_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial port data
INSERT INTO ports (code, name_ja, name_en, latitude, longitude, is_mainland, display_order) VALUES
('saigo', '西郷', 'Saigo', 36.2167, 133.3167, false, 1),
('hishiura', '菱浦', 'Hishiura', 36.3000, 133.2167, false, 2),
('beppu', '別府', 'Beppu', 36.3333, 133.2667, false, 3),
('kurii', '来居', 'Kurii', 36.1500, 133.1833, false, 4),
('shichirui', '七類', 'Shichirui', 35.5167, 133.1667, true, 5),
('sakaiminato', '境港', 'Sakaiminato', 35.5333, 133.2333, true, 6);

-- Insert initial ship data
INSERT INTO ships (code, name_ja, name_en, capacity_passengers, capacity_cars, speed_knots) VALUES
('oki', 'フェリーおき', 'Ferry Oki', 764, 100, 18.0),
('shirashima', 'フェリーしらしま', 'Ferry Shirashima', 764, 100, 18.0),
('kuniga', 'フェリーくにが', 'Ferry Kuniga', 764, 100, 18.0),
('dozen', 'フェリーどうぜん', 'Ferry Dozen', 350, 0, 20.0);
-- Seed data for Ferry Transit application

-- Insert initial routes
INSERT INTO routes (from_port_id, to_port_id, ship_id, duration_minutes, distance_km) VALUES
-- Ferry Oki/Shirashima/Kuniga routes
((SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ships WHERE code = 'oki'), 150, 85),
((SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ports WHERE code = 'hishiura'), (SELECT id FROM ships WHERE code = 'oki'), 180, 95),
((SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ships WHERE code = 'oki'), 210, 105),
((SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ships WHERE code = 'oki'), 150, 85),
((SELECT id FROM ports WHERE code = 'hishiura'), (SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ships WHERE code = 'oki'), 180, 95),
((SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ports WHERE code = 'shichirui'), (SELECT id FROM ships WHERE code = 'oki'), 210, 105),

-- Ferry Dozen routes
((SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ports WHERE code = 'hishiura'), (SELECT id FROM ships WHERE code = 'dozen'), 70, 45),
((SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ships WHERE code = 'dozen'), 100, 60),
((SELECT id FROM ports WHERE code = 'hishiura'), (SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ships WHERE code = 'dozen'), 70, 45),
((SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ports WHERE code = 'saigo'), (SELECT id FROM ships WHERE code = 'dozen'), 100, 60),
((SELECT id FROM ports WHERE code = 'kurii'), (SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ships WHERE code = 'dozen'), 35, 20),
((SELECT id FROM ports WHERE code = 'beppu'), (SELECT id FROM ports WHERE code = 'kurii'), (SELECT id FROM ships WHERE code = 'dozen'), 35, 20);

-- Insert sample timetables (current year)
-- Shichirui to Saigo
INSERT INTO timetables (route_id, departure_time, arrival_time, valid_from, day_of_week) VALUES
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo') AND ship_id = (SELECT id FROM ships WHERE code = 'oki')), 
 '09:00', '11:30', '2025-01-01', ARRAY[0,1,2,3,4,5,6]),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo') AND ship_id = (SELECT id FROM ships WHERE code = 'oki')), 
 '14:30', '17:00', '2025-01-01', ARRAY[0,1,2,3,4,5,6]);

-- Saigo to Shichirui
INSERT INTO timetables (route_id, departure_time, arrival_time, valid_from, day_of_week) VALUES
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'saigo') AND to_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND ship_id = (SELECT id FROM ships WHERE code = 'oki')), 
 '11:50', '14:20', '2025-01-01', ARRAY[0,1,2,3,4,5,6]),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'saigo') AND to_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND ship_id = (SELECT id FROM ships WHERE code = 'oki')), 
 '17:20', '19:50', '2025-01-01', ARRAY[0,1,2,3,4,5,6]);

-- Insert fares
INSERT INTO fares (route_id, passenger_type, fare_class, price, peak_season_price, valid_from) VALUES
-- Shichirui-Saigo fares
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 'adult', 'regular', 3190, 3510, '2025-01-01'),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 'child', 'regular', 1600, 1760, '2025-01-01'),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 'adult', 'first_class', 4790, 5110, '2025-01-01');

-- Insert vehicle fares
INSERT INTO vehicle_fares (route_id, vehicle_length_m, price, peak_season_price, valid_from) VALUES
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 3.0, 11880, 13070, '2025-01-01'),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 4.0, 15840, 17430, '2025-01-01'),
((SELECT id FROM routes WHERE from_port_id = (SELECT id FROM ports WHERE code = 'shichirui') AND to_port_id = (SELECT id FROM ports WHERE code = 'saigo')), 
 5.0, 19810, 21790, '2025-01-01');

-- Insert 2025 holidays
INSERT INTO holidays (date, name_ja, name_en, is_peak_season) VALUES
('2025-01-01', '元日', 'New Year''s Day', false),
('2025-01-13', '成人の日', 'Coming of Age Day', false),
('2025-02-11', '建国記念の日', 'National Foundation Day', false),
('2025-02-23', '天皇誕生日', 'Emperor''s Birthday', false),
('2025-03-20', '春分の日', 'Vernal Equinox Day', false),
('2025-04-29', '昭和の日', 'Showa Day', true),
('2025-05-03', '憲法記念日', 'Constitution Day', true),
('2025-05-04', 'みどりの日', 'Greenery Day', true),
('2025-05-05', 'こどもの日', 'Children''s Day', true),
('2025-07-21', '海の日', 'Marine Day', true),
('2025-08-11', '山の日', 'Mountain Day', true),
('2025-09-15', '敬老の日', 'Respect for the Aged Day', false),
('2025-09-23', '秋分の日', 'Autumnal Equinox Day', false),
('2025-10-13', 'スポーツの日', 'Sports Day', false),
('2025-11-03', '文化の日', 'Culture Day', false),
('2025-11-23', '勤労感謝の日', 'Labor Thanksgiving Day', false);

-- Insert sample announcement
INSERT INTO announcements (title_ja, title_en, content_ja, content_en, type, priority, display_from, display_until) VALUES
('システムメンテナンスのお知らせ', 
 'System Maintenance Notice', 
 '2025年7月10日（木）午前2時から午前5時まで、システムメンテナンスを実施いたします。この間、一部機能がご利用いただけません。', 
 'System maintenance will be performed on July 10, 2025 (Thu) from 2:00 AM to 5:00 AM. Some features will be unavailable during this time.',
 'info', 
 0, 
 '2025-07-01 00:00:00+09', 
 '2025-07-10 05:00:00+09');
-- password_hash placeholder for initial bootstrap; replace in deployment with secure hash.
INSERT INTO admin_users (username, password_hash, is_active)
VALUES ('admin', '$2a$10$Drq/izdON6wN.eztf6csDe/XmKZ3he/eqMWsvCRS5xeNRXKQq4.1C', TRUE)
ON CONFLICT (username) DO NOTHING;

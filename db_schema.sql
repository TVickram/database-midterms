-- Enable foreign key constraints
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Table: site_settings
CREATE TABLE IF NOT EXISTS site_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL,
    site_description TEXT NOT NULL
);

-- Insert default site settings
INSERT INTO site_settings (site_name, site_description)
VALUES ('My Event Manager', 'Description of your event manager');

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TEXT NOT NULL, -- ISO8601 date string
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_modified TEXT NOT NULL DEFAULT (datetime('now')),
    published_at TEXT,
    tickets_full INTEGER NOT NULL CHECK (tickets_full >= 0),
    price_full REAL NOT NULL CHECK (price_full >= 0),
    tickets_concession INTEGER NOT NULL CHECK (tickets_concession >= 0),
    price_concession REAL NOT NULL CHECK (price_concession >= 0)
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    attendee_name TEXT NOT NULL,
    tickets_full INTEGER NOT NULL DEFAULT 0 CHECK (tickets_full >= 0),
    tickets_concession INTEGER NOT NULL DEFAULT 0 CHECK (tickets_concession >= 0),
    booked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
);

COMMIT;
// index.js
// Main entry point for the Event Manager application

// 1. Load core dependencies
const express = require('express');             // Fast, unopinionated web framework
const path    = require('path');                // Utilities for working with file and directory paths
const sqlite3 = require('sqlite3').verbose();   // SQLite driver with verbose debugging output

// 2. Create & configure the Express application
const app  = express();
const port = process.env.PORT || 3000;

// 3. Middleware setup
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies (HTML forms)
app.use(express.json());                          // Parse JSON request bodies

// 4. View engine configuration
app.set('views', path.join(__dirname, 'views'));  // Directory for EJS templates
app.set('view engine', 'ejs');                    // Use EJS as templating language

// 5. Static assets
app.use(express.static(path.join(__dirname, 'public'))); // Serve CSS, JS, images from /public

// 6. Initialize SQLite database connection
global.db = new sqlite3.Database(
  path.join(__dirname, 'database.db'), // Path to your SQLite file
  (err) => {
    if (err) {
      console.error('❌ Failed to connect to database:', err.message);
      process.exit(1); // Terminate the app if DB connection fails
    }
    console.log('✅ Connected to SQLite database');
  }
);

// 7. Route handlers
const indexRoutes     = require('./routes/index');     // GET /
const usersRoutes     = require('./routes/users');     // GET /users/*
const organiserRoutes = require('./routes/organiser'); // GET/POST /organiser/*
const attendeeRoutes  = require('./routes/attendee');  // GET /attendee/*

// 8. Mount routes on their respective base paths
app.use('/',       indexRoutes);
app.use('/users',  usersRoutes);
app.use('/organiser', organiserRoutes);
app.use('/attendee',  attendeeRoutes);

// 9. 404 handler — catch-all for unknown routes
app.use((req, res) => {
  res.status(404).send('🚧 Page not found');
});

// 10. Global error handler — logs and returns 500
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.stack);
  res.status(500).send('💥 Internal Server Error');
});

// 11. Start the HTTP server
app.listen(port, () => {
  console.log(`🚀 Event Manager app listening at http://localhost:${port}`);
});

// index.js
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const sqlite3         = require('sqlite3').verbose();

const authRoutes      = require('./routes/auth');
const organiserRoutes = require('./routes/organiser');
const attendeeRoutes  = require('./routes/attendee');

const app = express();

// 1) Open SQLite database
const dbFile = path.join(__dirname, 'database.db');
global.db = new sqlite3.Database(dbFile, err => {
  if (err) {
    console.error('❌ Could not open database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite DB at', dbFile);
});

// 2) Middleware
app.use(express.urlencoded({ extended: false }));           // form parsing
app.use(express.static(path.join(__dirname)));               // serve main.css, etc.
app.use(session({                                           // session for login
  secret: 'REPLACE_WITH_A_SECURE_SECRET',
  resave: false,
  saveUninitialized: false
}));

// 3) View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 4) Auth routes (/login, /logout)
app.use('/', authRoutes);

// 5) Protect organiser routes
function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}
app.use('/organiser', ensureAuth, organiserRoutes);

// 6) Attendee routes (public)
app.use('/attendee', attendeeRoutes);

// 7) Landing page with links to Organiser & Attendee
app.get('/', (req, res) => {
  global.db.get(
    `SELECT site_name AS name, site_description AS description
       FROM site_settings LIMIT 1`,
    (err, siteSettings) => {
      if (err) return res.status(500).send('Internal Server Error');
      res.render('index', { siteSettings });
    }
  );
});

// 8) 404 & error handlers
app.use((req, res) => res.status(404).send('🚧 Page not found'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('💥 Internal Server Error');
});

// 9) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

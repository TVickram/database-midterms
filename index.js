// index.js
const express    = require('express');
const path       = require('path');
const session    = require('express-session');
const sqlite3    = require('sqlite3').verbose();

// Routers
const authRoutes      = require('./routes/auth');
const organiserRoutes = require('./routes/organiser');
const attendeeRoutes  = require('./routes/attendee');

// ─── 1) CREATE APP ──────────────────────────────────────────────────────
const app = express();

// ─── 2) OPEN DATABASE ──────────────────────────────────────────────────
const dbFile = path.join(__dirname, 'database.db');
global.db = new sqlite3.Database(dbFile, err => {
  if (err) {
    console.error('❌ Could not open database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite DB at', dbFile);
});

// ─── 3) MIDDLEWARE ──────────────────────────────────────────────────────
// Body parser
app.use(express.urlencoded({ extended: false }));

// Serve Bootstrap & Icons from node_modules
app.use('/css',  express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js',   express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/icons',express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));

// Serve your own static (e.g. /main.css, /hero-bg.jpg)
app.use(express.static(path.join(__dirname)));

// Sessions for login
app.use(session({
  secret: 'CHANGE_THIS_TO_A_SECURE_SECRET',
  resave: false,
  saveUninitialized: false
}));

// ─── 4) VIEW ENGINE ─────────────────────────────────────────────────────
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ─── 5) ROUTES ─────────────────────────────────────────────────────────
// Auth
app.use('/', authRoutes);

// Protect organiser
function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}
app.use('/organiser', ensureAuth, organiserRoutes);

// Public attendee
app.use('/attendee', attendeeRoutes);

// Landing page
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

// 404 & error handlers
app.use((req, res) => res.status(404).send('🚧 Page not found'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('💥 Internal Server Error');
});

// ─── 6) START SERVER ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

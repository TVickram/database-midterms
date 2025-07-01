// routes/organiser.js
// ------------------------------------------------------------------
// Organiser routes: dashboard, site settings, and event management
// ------------------------------------------------------------------

const express = require('express');
const router  = express.Router();

// Helper: load the single row of site settings
function getSiteSettings(cb) {
  global.db.get(
    `SELECT
       site_name        AS name,
       site_description AS description
     FROM site_settings
     LIMIT 1`,
    cb
  );
}

// ----------------------------------------------------------------------------
// GET /organiser
//    Dashboard: list drafts & published events with stats
// ----------------------------------------------------------------------------
router.get('/', (req, res, next) => {
  getSiteSettings((err, siteSettings) => {
    if (err) return next(err);
    siteSettings = siteSettings || { name: '', description: '' };

    global.db.all(`SELECT * FROM events ORDER BY event_date ASC`, (err, events) => {
      if (err) return next(err);

      global.db.all(
        `SELECT event_id,
                COALESCE(SUM(tickets_full),0)        AS booked_full,
                COALESCE(SUM(tickets_concession),0) AS booked_conc
         FROM bookings
         GROUP BY event_id`,
        (err, bookings) => {
          if (err) return next(err);
          const map = {};
          bookings.forEach(b => map[b.event_id] = b);

          const enriched = events.map(ev => {
            const b = map[ev.event_id] || { booked_full: 0, booked_conc: 0 };
            const totalQty = ev.tickets_full + ev.tickets_concession;
            const soldTotal = b.booked_full + b.booked_conc;
            return {
              id:           ev.event_id,
              title:        ev.title,
              date:         ev.event_date,
              full_qty:     ev.tickets_full,
              conc_qty:     ev.tickets_concession,
              total_qty:    totalQty,
              sold_full:    b.booked_full,
              sold_conc:    b.booked_conc,
              sold_total:   soldTotal,
              created_at:   ev.created_at,
              published_at: ev.published_at
            };
          });

          res.render('organiser-home', {
            siteSettings,
            draftEvents:     enriched.filter(e => !e.published_at),
            publishedEvents: enriched.filter(e => e.published_at)
          });
        }
      );
    });
  });
});

// ----------------------------------------------------------------------------
// GET /organiser/settings
// ----------------------------------------------------------------------------
router.get('/settings', (req, res, next) => {
  getSiteSettings((err, row) => {
    if (err) return next(err);
    res.render('site-settings', {
      site_name:        row?.name        || '',
      site_description: row?.description || ''
    });
  });
});

// ----------------------------------------------------------------------------
// POST /organiser/settings
// ----------------------------------------------------------------------------
router.post('/settings', (req, res, next) => {
  const { site_name, site_description } = req.body;
  global.db.run(
    `UPDATE site_settings
       SET site_name = ?, site_description = ?`,
    [site_name, site_description],
    function(err) {
      if (err) return next(err);
      if (this.changes === 0) {
        global.db.run(
          `INSERT INTO site_settings (site_name, site_description) VALUES (?,?)`,
          [site_name, site_description],
          err => err ? next(err) : res.redirect('/organiser')
        );
      } else {
        res.redirect('/organiser');
      }
    }
  );
});

// ----------------------------------------------------------------------------
// GET /organiser/events/new
//    Show blank form (no DB write)
// ----------------------------------------------------------------------------
router.get('/events/new', (req, res, next) => {
  getSiteSettings((err, siteSettings) => {
    if (err) return next(err);
    siteSettings = siteSettings || { name: '', description: '' };
    const today = new Date().toISOString().split('T')[0];
    res.render('edit-event', {
      siteSettings,
      event: {
        id:           null,
        title:        '',
        description:  '',
        date:         today,
        full_qty:     0,
        full_price:   0,
        conc_qty:     0,
        conc_price:   0,
        created_at:   null
      }
    });
  });
});

// ----------------------------------------------------------------------------
// POST /organiser/events/new
//    Create event on Save (using system time)
// ----------------------------------------------------------------------------
router.post('/events/new', (req, res, next) => {
  const { title, description, event_date, full_qty, full_price, conc_qty, conc_price } = req.body;
  const now = new Date().toISOString();
  global.db.run(
    `INSERT INTO events
       (title, description, event_date,
        tickets_full, price_full,
        tickets_concession, price_concession,
        created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [ title, description, event_date,
      full_qty, full_price,
      conc_qty, conc_price,
      now ],
    function(err) {
      if (err) return next(err);
      res.redirect('/organiser');
    }
  );
});

// ----------------------------------------------------------------------------
// GET /organiser/events/:id/edit
//    Show edit form
// ----------------------------------------------------------------------------
router.get('/events/:id/edit', (req, res, next) => {
  const id = req.params.id;
  getSiteSettings((err, siteSettings) => {
    if (err) return next(err);
    siteSettings = siteSettings || { name: '', description: '' };

    global.db.get(`SELECT * FROM events WHERE event_id = ?`, [id], (err, ev) => {
      if (err) return next(err);
      if (!ev) return res.status(404).send('Event not found');

      res.render('edit-event', {
        siteSettings,
        event: {
          id:           ev.event_id,
          title:        ev.title,
          description:  ev.description,
          date:         ev.event_date,
          full_qty:     ev.tickets_full,
          full_price:   ev.price_full,
          conc_qty:     ev.tickets_concession,
          conc_price:   ev.price_concession,
          created_at:   ev.created_at
        }
      });
    });
  });
});

// ----------------------------------------------------------------------------
// POST /organiser/events/:id/edit
//    Save edits & redirect
// ----------------------------------------------------------------------------
router.post('/events/:id/edit', (req, res, next) => {
  const { title, description, event_date, full_qty, full_price, conc_qty, conc_price } = req.body;
  global.db.run(
    `UPDATE events
       SET title             = ?,
           description       = ?,
           event_date        = ?,
           tickets_full      = ?,
           price_full        = ?,
           tickets_concession = ?,
           price_concession  = ?,
           last_modified     = datetime('now')
     WHERE event_id = ?`,
    [ title, description, event_date, full_qty, full_price, conc_qty, conc_price, req.params.id ],
    err => err ? next(err) : res.redirect('/organiser')
  );
});

// ----------------------------------------------------------------------------
// POST /organiser/events/:id/publish
//    Set published_at to system time
// ----------------------------------------------------------------------------
router.post('/events/:id/publish', (req, res, next) => {
  const now = new Date().toISOString();
  global.db.run(
    `UPDATE events
       SET published_at = ?
     WHERE event_id = ?`,
    [ now, req.params.id ],
    err => err ? next(err) : res.redirect('/organiser')
  );
});

// ----------------------------------------------------------------------------
// POST /organiser/events/:id/delete
//    Delete an event
// ----------------------------------------------------------------------------
router.post('/events/:id/delete', (req, res, next) => {
  global.db.run(
    `DELETE FROM events WHERE event_id = ?`,
    [req.params.id],
    err => err ? next(err) : res.redirect('/organiser')
  );
});

module.exports = router;

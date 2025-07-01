// routes/attendee.js
// Attendee routes: list events, view single event, book tickets

const express = require('express');
const router  = express.Router();

// Helper: load site settings
function getSiteSettings(cb) {
  global.db.get(
    `SELECT site_name AS name, site_description AS description
     FROM site_settings
     LIMIT 1`,
    cb
  );
}

// GET /attendee
router.get('/', (req, res, next) => {
  getSiteSettings((err, siteSettings) => {
    if (err) return next(err);
    siteSettings = siteSettings || { name: '', description: '' };

    global.db.all(
      `SELECT event_id, title, event_date,
              tickets_full, tickets_concession,
              price_full, price_concession
       FROM events
       WHERE published_at IS NOT NULL
       ORDER BY event_date ASC`,
      (err, rows) => {
        if (err) return next(err);

        // fetch booking aggregates
        global.db.all(
          `SELECT event_id,
                  COALESCE(SUM(tickets_full),0)        AS booked_full,
                  COALESCE(SUM(tickets_concession),0) AS booked_conc
           FROM bookings
           GROUP BY event_id`,
          (err, bookings) => {
            if (err) return next(err);

            const map = {};
            bookings.forEach(b => { map[b.event_id] = b; });

            const events = rows.map(ev => {
              const booked = map[ev.event_id] || { booked_full:0, booked_conc:0 };
              const fullLeft = ev.tickets_full - booked.booked_full;
              const concLeft = ev.tickets_concession - booked.booked_conc;
              return {
                id:                ev.event_id,
                title:             ev.title,
                date:              ev.event_date,
                price_full:        parseFloat(ev.price_full),
                price_concession:  parseFloat(ev.price_concession),
                full_remaining:    fullLeft,
                conc_remaining:    concLeft
              };
            });

            res.render('attendee-home', { siteSettings, events });
          }
        );
      }
    );
  });
});

// GET /attendee/events/:id
router.get('/events/:id', (req, res, next) => {
  const eventId = req.params.id;
  getSiteSettings((err, siteSettings) => {
    if (err) return next(err);
    siteSettings = siteSettings || { name:'', description:'' };

    global.db.get(
      `SELECT * FROM events WHERE event_id = ?`,
      [eventId],
      (err, ev) => {
        if (err) return next(err);
        if (!ev) return res.status(404).send('Event not found');

        global.db.get(
          `SELECT
             COALESCE(SUM(tickets_full),0)        AS booked_full,
             COALESCE(SUM(tickets_concession),0) AS booked_conc
           FROM bookings
           WHERE event_id = ?`,
          [eventId],
          (err, sums) => {
            if (err) return next(err);

            const fullLeft = ev.tickets_full - sums.booked_full;
            const concLeft = ev.tickets_concession - sums.booked_conc;

            res.render('event', {
              siteSettings,
              event: {
                id:               ev.event_id,
                title:            ev.title,
                description:      ev.description,
                date:             ev.event_date,
                price_full:       parseFloat(ev.price_full),
                price_concession: parseFloat(ev.price_concession),
                full_remaining:   fullLeft,
                conc_remaining:   concLeft,
                total_qty:        ev.tickets_full + ev.tickets_concession,
                booked_full:      sums.booked_full,
                booked_conc:      sums.booked_conc
              }
            });
          }
        );
      }
    );
  });
});

// POST /attendee/events/:id/book unchanged…
router.post('/events/:id/book', (req, res, next) => {
  const eventId = req.params.id;
  const { attendee_name, full_tickets, conc_tickets } = req.body;
  global.db.run(
    `INSERT INTO bookings (event_id, attendee_name, tickets_full, tickets_concession)
     VALUES (?,?,?,?)`,
    [eventId, attendee_name, full_tickets||0, conc_tickets||0],
    err => err ? next(err) : res.redirect('/attendee')
  );
});

module.exports = router;
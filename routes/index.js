// routes/index.js

const express = require('express');
const router  = express.Router();

// GET /  – Main Home Page
router.get('/', (req, res, next) => {
  // pull your single row of site settings from SQLite
  global.db.get(
    `SELECT 
       site_name   AS name, 
       site_description AS description 
     FROM site_settings 
     LIMIT 1`,
    (err, row) => {
      if (err) return next(err);
      // pass the row back to the template as "siteSettings"
      res.render('index', { siteSettings: row });
    }
  );
});

module.exports = router;
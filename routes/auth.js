const express = require('express');
const router  = express.Router();

// In a real app you'd look up users in your DB.
// For now we'll hard-code a single admin account:
const ADMIN = { username: 'admin', password: 'password' };

/**
 * GET /login
 *   Show login form
 */
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

/**
 * POST /login
 *   Validate credentials and set session.user
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN.username && password === ADMIN.password) {
    req.session.user = username;
    return res.redirect('/organiser');
  }
  res.render('login', { error: 'Invalid username or password' });
});

/**
 * GET /logout
 *   Clear session and redirect to login
 */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;

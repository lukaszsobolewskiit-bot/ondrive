const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const onedrive = require('../onedrive');

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin-login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: 'Nieprawidłowe dane logowania' });
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

router.get('/', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const success = req.query.success;
  res.render('admin-dashboard', { users, baseUrl: process.env.BASE_URL, error: null, success });
});

router.post('/users/create', requireAdmin, async (req, res) => {
  const { username, display_name, email } = req.body;
  if (!username || !display_name) {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    return res.render('admin-dashboard', { users, baseUrl: process.env.BASE_URL, error: 'Nazwa i imię są wymagane', success: null });
  }
  const folderName = username.replace(/[^a-zA-Z0-9_-]/g, '_');
  const token = uuidv4();
  try {
    db.prepare('INSERT INTO users (username, email, display_name, token, onedrive_folder) VALUES (?, ?, ?, ?, ?)').run(username, email || null, display_name, token, folderName);
    await onedrive.ensureFolder(`${process.env.ONEDRIVE_ROOT_FOLDER || 'PortalUzytkownikow'}/${folderName}`);
    res.redirect('/admin?success=1');
  } catch (err) {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.render('admin-dashboard', { users, baseUrl: process.env.BASE_URL, error: err.message.includes('UNIQUE') ? 'Taka nazwa użytkownika już istnieje' : err.message, success: null });
  }
});

router.post('/users/:id/toggle', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (user) db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, user.id);
  res.redirect('/admin');
});

router.post('/users/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

router.post('/users/:id/regen-token', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(uuidv4(), req.params.id);
  res.redirect('/admin');
});

module.exports = router;

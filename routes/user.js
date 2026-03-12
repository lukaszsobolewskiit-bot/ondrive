const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const onedrive = require('../onedrive');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Login via unique token link
router.get('/portal/:token', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE token = ? AND is_active = 1').get(req.params.token);
  if (!user) return res.render('error', { message: 'Link jest nieprawidłowy lub konto zostało dezaktywowane.' });
  req.session.userId = user.id;
  req.session.userToken = user.token;
  req.session.userName = user.display_name;
  res.redirect('/portal');
});

// User portal
router.get('/portal', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(req.session.userId);
  if (!user) { req.session.destroy(); return res.redirect('/login'); }

  try {
    const files = await onedrive.listFiles(user.onedrive_folder);
    res.render('user-portal', {
      user,
      files,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    res.render('user-portal', { user, files: [], error: 'Błąd połączenia z OneDrive: ' + err.message, success: null });
  }
});

// Upload file
router.post('/portal/upload', upload.array('files', 10), async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(req.session.userId);
  if (!user) return res.redirect('/login');

  if (!req.files || req.files.length === 0) {
    return res.redirect('/portal?error=Nie wybrano pliku');
  }

  try {
    for (const file of req.files) {
      await onedrive.uploadFile(user.onedrive_folder, file.originalname, file.buffer);
      db.prepare('INSERT INTO upload_logs (user_id, filename, filesize) VALUES (?, ?, ?)').run(user.id, file.originalname, file.size);
    }
    res.redirect('/portal?success=Pliki przesłane pomyślnie');
  } catch (err) {
    res.redirect('/portal?error=' + encodeURIComponent('Błąd przesyłania: ' + err.message));
  }
});

// Download file
router.get('/portal/download/:itemId', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const url = await onedrive.getDownloadUrl(req.params.itemId);
    res.redirect(url);
  } catch (err) {
    res.redirect('/portal?error=Nie można pobrać pliku');
  }
});

// Delete file
router.post('/portal/delete/:itemId', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  try {
    await onedrive.deleteFile(user.onedrive_folder, req.params.itemId);
    res.redirect('/portal?success=Plik usunięty');
  } catch (err) {
    res.redirect('/portal?error=Nie można usunąć pliku');
  }
});

// Logout
router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// Login page (for session-based re-login)
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/portal');
  res.render('user-login', { error: null });
});

module.exports = router;

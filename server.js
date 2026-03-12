require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { setupRootFolder } = require('./onedrive');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Routes
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/user'));

// Home redirect
app.get('/', (req, res) => res.redirect('/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n🚀 Serwer uruchomiony: http://localhost:${PORT}`);
  console.log(`👤 Panel admina:       http://localhost:${PORT}/admin`);
  console.log(`📁 OneDrive folder:    ${process.env.ONEDRIVE_ROOT_FOLDER || 'PortalUzytkownikow'}\n`);
  await setupRootFolder();
});

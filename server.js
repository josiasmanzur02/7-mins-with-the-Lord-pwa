const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const { db, runMigrations } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

// Ensure DB schema is ready before handling requests
const migrationsReady = runMigrations();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      dir: path.join(__dirname, 'data'),
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, // 30 days
  })
);

app.use(async (req, res, next) => {
  try {
    await migrationsReady;
  } catch (err) {
    return next(err);
  }
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth');
  }
  next();
}

// Helpers
function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function findUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function createUser({ email, password, displayName }) {
  return new Promise(async (resolve, reject) => {
    try {
      const existing = await findUserByEmail(email);
      if (existing) return reject(new Error('Email already in use.'));
      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
        [email, hash, displayName],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, email, display_name: displayName });
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

function updateUserSession(req, userRow) {
  req.session.user = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.display_name,
    streak: userRow.streak_count,
    lastCheck: userRow.last_check_in_date,
    theme: userRow.theme,
    language: userRow.language,
  };
}

async function recordCheckIn(userId) {
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const user = await findUserById(userId);
  let newStreak = 1;

  if (user.last_check_in_date === today) {
    newStreak = user.streak_count;
  } else if (user.last_check_in_date === yesterday) {
    newStreak = user.streak_count + 1;
  }

  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET streak_count = ?, last_check_in_date = ? WHERE id = ?',
      [newStreak, today, userId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO devotions (user_id, segments_completed, date_key, completed_at) VALUES (?, ?, ?, datetime(\'now\'))',
      [userId, 7, today],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  const updated = await findUserById(userId);
  return updated;
}

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/auth');
});

app.get('/auth', (req, res) => {
  res.render('auth', { tab: req.query.tab === 'signup' ? 'signup' : 'login' });
});

app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    req.session.flash = { type: 'error', message: 'All fields are required.' };
    return res.redirect('/auth?tab=signup');
  }
  try {
    const user = await createUser({
      email: email.toLowerCase().trim(),
      password,
      displayName: name.trim(),
    });
    const freshUser = await findUserById(user.id);
    updateUserSession(req, freshUser);
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: err.message || 'Sign up failed.' };
    res.redirect('/auth?tab=signup');
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.session.flash = { type: 'error', message: 'Email and password required.' };
    return res.redirect('/auth');
  }
  try {
    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) throw new Error('Invalid credentials.');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new Error('Invalid credentials.');
    updateUserSession(req, user);
    res.redirect('/home');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message || 'Login failed.' };
    res.redirect('/auth');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth'));
});

app.get('/home', requireAuth, async (req, res) => {
  const fresh = await findUserById(req.session.user.id);
  updateUserSession(req, fresh);
  const today = dayjs().format('YYYY-MM-DD');
  const isCheckedToday = fresh.last_check_in_date === today;
  res.render('home', {
    streak: fresh.streak_count || 0,
    lastCheck: fresh.last_check_in_date,
    checkedToday: isCheckedToday,
  });
});

app.get('/timer', requireAuth, (req, res) => {
  const steps = [
    { key: 'calling', label: 'Calling on the Lord', seconds: 60 },
    { key: 'pray', label: 'Pray', seconds: 60 },
    { key: 'pray-read', label: 'Pray-Read', seconds: 60 },
    { key: 'confession', label: 'Confession', seconds: 60 },
    { key: 'consecration', label: 'Consecration', seconds: 60 },
    { key: 'thanks', label: 'Give Thanks', seconds: 60 },
    { key: 'petition', label: 'Petition', seconds: 60 },
  ];
  res.render('timer', { steps });
});

app.post('/devotion/complete', requireAuth, async (req, res) => {
  try {
    const updated = await recordCheckIn(req.session.user.id);
    updateUserSession(req, updated);
    res.json({ ok: true, streak: updated.streak_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Could not record session.' });
  }
});

app.get('/settings', requireAuth, (req, res) => {
  res.render('settings');
});

app.post('/settings', requireAuth, (req, res) => {
  const { theme = 'light', language = 'en' } = req.body;
  db.run(
    'UPDATE users SET theme = ?, language = ? WHERE id = ?',
    [theme, language, req.session.user.id],
    (err) => {
      if (err) {
        console.error(err);
        req.session.flash = { type: 'error', message: 'Unable to save settings.' };
        return res.redirect('/settings');
      }
      req.session.user.theme = theme;
      req.session.user.language = language;
      req.session.flash = { type: 'success', message: 'Settings updated.' };
      res.redirect('/settings');
    }
  );
});

app.get('/install', requireAuth, (req, res) => {
  res.render('install');
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).render('auth', { tab: 'login' });
});

migrationsReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`7 Minutes server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Cannot start server; migrations failed.', err);
    process.exit(1);
  });

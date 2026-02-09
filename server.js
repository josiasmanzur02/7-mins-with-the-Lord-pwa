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

// Basic i18n strings
const translations = {
  en: {
    brand: '7 Minutes',
    nav_home: 'Home',
    nav_start: 'Start',
    nav_settings: 'Settings',
    nav_install: 'Install',
    nav_logout: 'Log out',
    nav_login: 'Log in',
    nav_signup: 'Sign up',
    auth_login: 'Log in',
    auth_signup: 'Sign up',
    auth_name: 'Name',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_confirm_password: 'Confirm password',
    auth_show_password: 'Show password',
    auth_hide_password: 'Hide password',
    auth_create: 'Create account',
    auth_log_in: 'Log in',
    home_title: 'Stay consistent with the Lord',
    home_subtitle: 'Current streak',
    home_cta_start: 'Start 7 minutes',
    home_cta_install: 'Install on phone',
    how_it_works: 'How it works',
    settings_title: 'Settings',
    settings_theme: 'Theme',
    settings_language: 'Language',
    settings_save: 'Save',
    settings_password_title: 'Change password',
    settings_old_password: 'Current password',
    settings_new_password: 'New password',
    settings_new_confirm: 'Confirm new password',
    settings_change_password: 'Change password',
    install_title: 'Install on your phone',
    install_desc: 'The app is a PWA. Add it to your home screen to use it like a native app.',
    install_ios: 'iOS (Safari)',
    install_android: 'Android (Chrome)',
    timer_focus: 'Focused time',
    timer_tip: 'Tip: stay with the short timer; it keeps the flow moving.',
    progress: 'Progress',
    step_calling: 'Calling on the Lord',
    step_pray: 'Pray',
    step_pray_read: 'Pray-Read',
    step_confession: 'Confession',
    step_consecration: 'Consecration',
    step_thanks: 'Give Thanks',
    step_petition: 'Petition',
  },
  es: {
    brand: '7 Minutos',
    nav_home: 'Inicio',
    nav_start: 'Comenzar',
    nav_settings: 'Ajustes',
    nav_install: 'Instalar',
    nav_logout: 'Salir',
    nav_login: 'Ingresar',
    nav_signup: 'Registrarse',
    auth_login: 'Ingresar',
    auth_signup: 'Registrarse',
    auth_name: 'Nombre',
    auth_email: 'Correo',
    auth_password: 'Contraseña',
    auth_confirm_password: 'Confirmar contraseña',
    auth_show_password: 'Mostrar contraseña',
    auth_hide_password: 'Ocultar contraseña',
    auth_create: 'Crear cuenta',
    auth_log_in: 'Ingresar',
    home_title: 'Permanece constante con el Señor',
    home_subtitle: 'Racha actual',
    home_cta_start: 'Empezar 7 minutos',
    home_cta_install: 'Instalar en el teléfono',
    how_it_works: 'Cómo funciona',
    settings_title: 'Ajustes',
    settings_theme: 'Tema',
    settings_language: 'Idioma',
    settings_save: 'Guardar',
    settings_password_title: 'Cambiar contraseña',
    settings_old_password: 'Contraseña actual',
    settings_new_password: 'Nueva contraseña',
    settings_new_confirm: 'Confirmar nueva contraseña',
    settings_change_password: 'Cambiar contraseña',
    install_title: 'Instala en tu teléfono',
    install_desc: 'La app es una PWA. Añádela a tu pantalla de inicio para usarla como app nativa.',
    install_ios: 'iOS (Safari)',
    install_android: 'Android (Chrome)',
    timer_focus: 'Tiempo enfocado',
    timer_tip: 'Consejo: quédate con el temporizador corto para mantener el ritmo.',
    progress: 'Progreso',
    step_calling: 'Invocar al Señor',
    step_pray: 'Orar',
    step_pray_read: 'Orar-leer',
    step_confession: 'Confesión',
    step_consecration: 'Consagración',
    step_thanks: 'Dar gracias',
    step_petition: 'Petición',
  },
};

function resolveLang(req) {
  return (req.session.user && req.session.user.language) || req.query.lang || 'en';
}

function translate(lang, key) {
  return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
}

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
  const lang = resolveLang(req);
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.lang = lang;
  res.locals.t = (key) => translate(lang, key);
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
  const { email, password, confirm_password, name } = req.body;
  if (!email || !password || !name || !confirm_password) {
    req.session.flash = { type: 'error', message: 'All fields are required.' };
    return res.redirect('/auth?tab=signup');
  }
  if (password !== confirm_password) {
    req.session.flash = { type: 'error', message: 'Passwords do not match.' };
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
    req.session.flash = { type: 'success', message: 'Account created! Welcome.' };
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
    { key: 'calling', label: translate(res.locals.lang, 'step_calling'), seconds: 60 },
    { key: 'pray', label: translate(res.locals.lang, 'step_pray'), seconds: 60 },
    { key: 'pray-read', label: translate(res.locals.lang, 'step_pray_read'), seconds: 60 },
    { key: 'confession', label: translate(res.locals.lang, 'step_confession'), seconds: 60 },
    { key: 'consecration', label: translate(res.locals.lang, 'step_consecration'), seconds: 60 },
    { key: 'thanks', label: translate(res.locals.lang, 'step_thanks'), seconds: 60 },
    { key: 'petition', label: translate(res.locals.lang, 'step_petition'), seconds: 60 },
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

app.post('/settings/password', requireAuth, async (req, res) => {
  const { current_password, new_password, new_password_confirm } = req.body;
  if (!current_password || !new_password || !new_password_confirm) {
    req.session.flash = { type: 'error', message: 'All password fields are required.' };
    return res.redirect('/settings');
  }
  if (new_password !== new_password_confirm) {
    req.session.flash = { type: 'error', message: 'New passwords do not match.' };
    return res.redirect('/settings');
  }
  if (new_password.length < 6) {
    req.session.flash = { type: 'error', message: 'New password must be at least 6 characters.' };
    return res.redirect('/settings');
  }
  try {
    const user = await findUserById(req.session.user.id);
    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) {
      req.session.flash = { type: 'error', message: 'Current password is incorrect.' };
      return res.redirect('/settings');
    }
    const hash = await bcrypt.hash(new_password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id], (err) => {
      if (err) {
        console.error(err);
        req.session.flash = { type: 'error', message: 'Could not update password.' };
        return res.redirect('/settings');
      }
      req.session.flash = { type: 'success', message: 'Password updated successfully.' };
      res.redirect('/settings');
    });
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Could not update password.' };
    res.redirect('/settings');
  }
});

app.get('/install', (req, res) => {
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

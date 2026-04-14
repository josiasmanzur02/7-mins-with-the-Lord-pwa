const path = require('path');
const express = require('express');

const { translations, resolveLang, translateWithVars, getSteps } = require('./site-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.flash = null;
  res.locals.translations = translations;
  res.locals.asset = (assetPath) => `/${assetPath.replace(/^\/+/, '')}`;
  next();
});

app.get('/', (req, res) => {
  res.redirect(`/${resolveLang(req)}/home/`);
});

app.get('/:lang', (req, res, next) => {
  if (!translations[req.params.lang]) return next();
  res.redirect(`/${req.params.lang}/home/`);
});

function preparePage(req, res, next) {
  const lang = req.params.lang;
  if (!translations[lang]) return next();
  if (req.query.lang && translations[req.query.lang]) {
    res.cookie('lang', req.query.lang, { maxAge: 31536000000, httpOnly: false, sameSite: 'lax' });
  }
  res.locals.lang = lang;
  res.locals.t = (key, vars) => translateWithVars(lang, key, vars);
  res.locals.route = (page, routeLang = lang) => `/${routeLang}/${page}/`;
  res.locals.appDepth = 2;
  next();
}

app.get('/:lang/home', preparePage, (req, res) => {
  res.render('home', { pageName: 'home', pageScript: 'js/home.js' });
});

app.get('/:lang/timer', preparePage, (req, res) => {
  res.render('timer', {
    pageName: 'timer',
    pageScript: 'js/timer.js',
    bodyClass: 'page-timer',
    steps: getSteps(res.locals.lang),
  });
});

app.get('/:lang/settings', preparePage, (req, res) => {
  res.render('settings', { pageName: 'settings', pageScript: 'js/settings.js' });
});

app.get('/:lang/install', preparePage, (req, res) => {
  res.render('install', { pageName: 'install' });
});

for (const page of ['home', 'timer', 'settings', 'install']) {
  app.get(`/${page}`, (req, res) => {
    res.redirect(`/${resolveLang(req)}/${page}/`);
  });
}

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).redirect(`/${resolveLang(req)}/home/`);
});

app.listen(PORT, () => {
  console.log(`7 Minutes server running at http://localhost:${PORT}`);
});

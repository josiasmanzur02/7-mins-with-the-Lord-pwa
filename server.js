const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic i18n strings
const translations = {
  en: {
    brand: '7 Minutes',
    nav_home: 'Home',
    nav_start: 'Start',
    nav_settings: 'Settings',
    nav_install: 'Install',
    home_title: 'Stay consistent with the Lord',
    home_subtitle: 'Current streak',
    home_cta_start: 'Start 7 minutes',
    home_cta_install: 'Install on phone',
    how_it_works: 'How it works',
    settings_title: 'Settings',
    settings_theme: 'Theme',
    settings_language: 'Language',
    settings_save: 'Save',
    settings_sound: 'Sound',
    settings_sound_enable: 'Play sounds',
    settings_volume: 'Volume',
    settings_alarm: 'Reminders',
    settings_alarm_time: 'Reminder time',
    settings_alarm_days: 'Days of week',
    settings_alarm_enable: 'Enable reminders',
    settings_alarm_test: 'Test alarm now',
    settings_export: 'Export data',
    settings_import: 'Import data file',
    settings_reset: 'Reset local data',
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
    home_title: 'Permanece constante con el Señor',
    home_subtitle: 'Racha actual',
    home_cta_start: 'Empezar 7 minutos',
    home_cta_install: 'Instalar en el teléfono',
    how_it_works: 'Cómo funciona',
    settings_title: 'Ajustes',
    settings_theme: 'Tema',
    settings_language: 'Idioma',
    settings_save: 'Guardar',
    settings_sound: 'Sonido',
    settings_sound_enable: 'Reproducir sonidos',
    settings_volume: 'Volumen',
    settings_alarm: 'Recordatorios',
    settings_alarm_time: 'Hora del recordatorio',
    settings_alarm_days: 'Días de la semana',
    settings_alarm_enable: 'Activar recordatorios',
    settings_alarm_test: 'Probar alarma ahora',
    settings_export: 'Exportar datos',
    settings_import: 'Importar archivo',
    settings_reset: 'Restablecer datos locales',
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
  return req.query.lang || 'en';
}

function translate(lang, key) {
  return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  const lang = resolveLang(req);
  res.locals.currentUser = null;
  res.locals.flash = null;
  res.locals.lang = lang;
  res.locals.t = (key) => translate(lang, key);
  next();
});

app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', async (req, res) => {
  res.render('home');
});

app.get('/timer', (req, res) => {
  const steps = [
    { key: 'calling', label: translate(res.locals.lang, 'step_calling'), seconds: 60 },
    { key: 'pray', label: translate(res.locals.lang, 'step_pray'), seconds: 60 },
    { key: 'pray-read', label: translate(res.locals.lang, 'step_pray_read'), seconds: 60 },
    { key: 'confession', label: translate(res.locals.lang, 'step_confession'), seconds: 60 },
    { key: 'consecration', label: translate(res.locals.lang, 'step_consecration'), seconds: 60 },
    { key: 'thanks', label: translate(res.locals.lang, 'step_thanks'), seconds: 60 },
    { key: 'petition', label: translate(res.locals.lang, 'step_petition'), seconds: 60 },
  ];
  res.render('timer', { steps, bodyClass: 'page-timer' });
});

app.get('/settings', (req, res) => {
  res.render('settings');
});

app.get('/install', (req, res) => {
  res.render('install');
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).redirect('/home');
});

app.listen(PORT, () => {
  console.log(`7 Minutes server running at http://localhost:${PORT}`);
});

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic i18n strings (shared with client)
const translations = {
  en: {
    brand: '7 Minutes',
    nav_home: 'Home', 
    nav_start: 'Start',
    nav_settings: 'Settings',
    nav_install: 'Install',
    nav_toggle: 'Toggle menu',
    home_title: 'Stay consistent with the Lord',
    home_subtitle: 'Current streak',
    home_keep_up: 'Keep up your streak!',
    home_cta_start: 'Start 7 minutes',
    home_cta_install: 'Install on phone',
    home_no_sessions: 'No sessions yet. Today is a great day to start.',
    home_last_time: 'Last time: {{date}}',
    home_week_goal: 'Week goal',
    home_calendar_complete: 'Completed',
    home_calendar_missed: 'Missed',
    home_day: 'day',
    home_days: 'days',
    how_it_works: 'How it works',

    settings_title: 'Settings',
    settings_theme: 'Theme',
    settings_theme_light: 'Light',
    settings_theme_dark: 'Dark',
    settings_language: 'Language',
    settings_save: 'Save',
    settings_saved: 'Preferences saved to device.',
    settings_sound: 'Sound',
    settings_sound_enable: 'Play sounds',
    settings_volume: 'Volume',
    settings_alarm: 'Reminders',
    settings_alarm_hint: 'Best effort while the app is open. Notifications depend on browser permission. iOS PWAs cannot ring in the background.',
    settings_alarm_time: 'Reminder time',
    settings_alarm_days: 'Days of week',
    settings_alarm_enable: 'Enable reminders',
    settings_alarm_test: 'Test alarm now',
    settings_alarm_saved: 'Reminder settings saved.',
    settings_alarm_none: 'No upcoming reminder scheduled.',
    settings_alarm_next: 'Next reminder: {{datetime}}',
    settings_export: 'Export data',
    settings_import: 'Import data file',
    settings_exported: 'Exported data.',
    settings_imported: 'Imported data.',
    settings_invalid_file: 'Invalid file.',
    settings_reset: 'Reset local data',
    settings_reset_confirm: 'Reset all local data? This cannot be undone.',
    settings_reset_done: 'Local data reset.',
    settings_backup_title: 'Streak & preferences backup',
    settings_backup_desc: 'Everything is stored on this device. Export/import to move streak, settings, alarms.',
    settings_feedback: 'Feedback',
    settings_feedback_desc: 'Found a bug or have a suggestion? Email manzur.josias@gmail.com.',
    settings_days_short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    install_title: 'Install on your phone',
    install_desc: 'The app is a PWA. Add it to your home screen to use it like a native app.',
    install_ios: 'iOS (Safari)',
    install_ios_1: 'Open this site in Safari.',
    install_ios_2: 'Tap the Share icon.',
    install_ios_3: 'Choose “Add to Home Screen”.',
    install_ios_4: 'Tap Add. Launch the icon from your home screen.',
    install_android: 'Android (Chrome)',
    install_android_1: 'Open this site in Chrome.',
    install_android_2: 'Tap the ⋮ menu and choose “Install app” (or “Add to Home screen”).',
    install_android_3: 'Confirm and wait for the shortcut to appear.',
    install_offline: 'You can also use the app offline; it will sync your streak the next time you’re online.',

    timer_focus: 'Focused time',
    timer_tip: 'Tip: stay with the short timer; it keeps the flow moving.',
    timer_start: 'Start',
    timer_pause: 'Pause',
    timer_resume: 'Resume',
    timer_restart: 'Restart',
    timer_back: 'Back',
    timer_exit: 'Exit',
    timer_show_steps: 'Show steps ↓',
    timer_hide_steps: 'Hide steps ↑',
    timer_saving: 'Well done. Saving your session...',
    timer_saved: 'Streak: {{count}} {{label}}.',
    timer_reminder_triggered: 'Reminder triggered — start when ready.',

    progress: 'Progress', 
    step_calling: 'Calling on the Lord',
    step_pray: 'Pray',
    step_pray_read: 'Pray-Read',
    step_confession: 'Confession',
    step_consecration: 'Consecration',
    step_thanks: 'Give Thanks',
    step_petition: 'Petition',

    alarm_title: 'Reminder',
    alarm_heading: 'Time with the Lord',
    alarm_body: 'Your scheduled time is now. Start 7 minutes or snooze 10 minutes.',
    alarm_start: 'Start 7 minutes',
    alarm_snooze: 'Snooze 10 min',
    alarm_stop: 'Stop',
    alarm_notification_title: '7 Minutes — time to start',
    alarm_notification_body: 'Your 7-minute time is ready. Tap to open.',
  },
  es: {
    brand: '7 Minutos',
    nav_home: 'Inicio',
    nav_start: 'Comenzar',
    nav_settings: 'Ajustes',
    nav_install: 'Instalar',
    nav_toggle: 'Abrir/cerrar menú',
    home_title: 'Permanece constante con el Señor',
    home_subtitle: 'Racha actual',
    home_keep_up: '¡Sigue con tu racha!',
    home_cta_start: 'Empezar 7 minutos',
    home_cta_install: 'Instalar en el teléfono',
    home_no_sessions: 'Aún no hay sesiones. Hoy es un gran día para empezar.',
    home_last_time: 'Última vez: {{date}}',
    home_week_goal: 'Meta semanal',
    home_calendar_complete: 'Completado',
    home_calendar_missed: 'Sin completar',
    home_day: 'día',
    home_days: 'días',
    how_it_works: 'Cómo funciona',

    settings_title: 'Ajustes',
    settings_theme: 'Tema',
    settings_theme_light: 'Claro',
    settings_theme_dark: 'Oscuro',
    settings_language: 'Idioma',
    settings_save: 'Guardar',
    settings_saved: 'Preferencias guardadas en el dispositivo.',
    settings_sound: 'Sonido',
    settings_sound_enable: 'Reproducir sonidos',
    settings_volume: 'Volumen',
    settings_alarm: 'Recordatorios',
    settings_alarm_hint: 'Mejor esfuerzo mientras la app está abierta. Las notificaciones dependen del permiso del navegador. Las PWA en iOS no pueden sonar en segundo plano.',
    settings_alarm_time: 'Hora del recordatorio',
    settings_alarm_days: 'Días de la semana',
    settings_alarm_enable: 'Activar recordatorios',
    settings_alarm_test: 'Probar alarma ahora',
    settings_alarm_saved: 'Recordatorios guardados.',
    settings_alarm_none: 'No hay un recordatorio programado.',
    settings_alarm_next: 'Próximo recordatorio: {{datetime}}',
    settings_export: 'Exportar datos',
    settings_import: 'Importar archivo',
    settings_exported: 'Datos exportados.',
    settings_imported: 'Datos importados.',
    settings_invalid_file: 'Archivo no válido.',
    settings_reset: 'Restablecer datos locales',
    settings_reset_confirm: '¿Restablecer todos los datos locales? Esto no se puede deshacer.',
    settings_reset_done: 'Datos locales restablecidos.',
    settings_backup_title: 'Respaldo de racha y preferencias',
    settings_backup_desc: 'Todo se guarda en este dispositivo. Exporta/importa para mover la racha, ajustes y recordatorios.',
    settings_feedback: 'Comentarios',
    settings_feedback_desc: '¿Encontraste un error o tienes una sugerencia? Escribe a manzur.josias@gmail.com.',
    settings_days_short: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],

    install_title: 'Instala en tu teléfono',
    install_desc: 'La app es una PWA. Añádela a tu pantalla de inicio para usarla como app nativa.',
    install_ios: 'iOS (Safari)',
    install_ios_1: 'Abre este sitio en Safari.',
    install_ios_2: 'Toca el ícono de Compartir.',
    install_ios_3: 'Elige “Añadir a pantalla de inicio”.',
    install_ios_4: 'Toca Añadir. Abre el ícono desde tu pantalla.',
    install_android: 'Android (Chrome)',
    install_android_1: 'Abre este sitio en Chrome.',
    install_android_2: 'Toca el menú ⋮ y elige “Instalar app” (o “Añadir a pantalla de inicio”).',
    install_android_3: 'Confirma y espera el acceso directo.',
    install_offline: 'También puedes usar la app sin conexión; se sincronizará cuando vuelvas a estar en línea.',

    timer_focus: 'Tiempo enfocado',
    timer_tip: 'Consejo: quédate con el temporizador corto para mantener el ritmo.',
    timer_start: 'Iniciar',
    timer_pause: 'Pausar',
    timer_resume: 'Reanudar',
    timer_restart: 'Reiniciar',
    timer_back: 'Atrás',
    timer_exit: 'Salir',
    timer_show_steps: 'Mostrar pasos ↓',
    timer_hide_steps: 'Ocultar pasos ↑',
    timer_saving: 'Bien hecho. Guardando tu sesión...',
    timer_saved: 'Racha: {{count}} {{label}}.',
    timer_reminder_triggered: 'Recordatorio activado — empieza cuando quieras.',

    progress: 'Progreso',
    step_calling: 'Invocar al Señor',
    step_pray: 'Orar',
    step_pray_read: 'Orar-leer',
    step_confession: 'Confesión',
    step_consecration: 'Consagración',
    step_thanks: 'Dar gracias',
    step_petition: 'Petición',

    alarm_title: 'Recordatorio',
    alarm_heading: 'Tiempo con el Señor',
    alarm_body: 'Tu horario es ahora. Empieza 7 minutos o pospone 10 minutos.',
    alarm_start: 'Empezar 7 minutos',
    alarm_snooze: 'Posponer 10 min',
    alarm_stop: 'Detener',
    alarm_notification_title: '7 Minutos — hora de empezar',
    alarm_notification_body: 'Tus 7 minutos están listos. Toca para abrir.',
  },
};

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split('=');
    if (!rawKey) return acc;
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rest.join('=') || '');
    acc[key] = value;
    return acc;
  }, {});
}

function resolveLang(req) {
  const fromQuery = req.query.lang;
  if (fromQuery && translations[fromQuery]) return fromQuery;
  const cookies = parseCookies(req);
  if (cookies.lang && translations[cookies.lang]) return cookies.lang;
  const accept = req.headers['accept-language'];
  if (accept) {
    const preferred = accept
      .split(',')
      .map((item) => item.trim().slice(0, 2))
      .find((code) => translations[code]);
    if (preferred) return preferred;
  }
  return 'en';
}

function translate(lang, key) {
  return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
}

function translateWithVars(lang, key, vars = {}) {
  const template = translate(lang, key);
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  const lang = resolveLang(req);
  if (req.query.lang && translations[req.query.lang]) {
    res.cookie('lang', lang, { maxAge: 31536000000, httpOnly: false, sameSite: 'lax' });
  }
  res.locals.currentUser = null;
  res.locals.flash = null;
  res.locals.lang = lang;
  res.locals.t = (key, vars) => translateWithVars(lang, key, vars);
  res.locals.translations = translations;
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

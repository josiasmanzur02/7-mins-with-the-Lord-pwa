const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const { translations, translateWithVars, getSteps } = require('../site-data');

const ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(ROOT, 'views');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_DIR = path.join(ROOT, 'docs');
const LOCALES = Object.keys(translations);
const PAGE_CONFIG = [
  { name: 'home', template: 'home.ejs', pageScript: 'js/home.js' },
  { name: 'timer', template: 'timer.ejs', pageScript: 'js/timer.js', bodyClass: 'page-timer' },
  { name: 'settings', template: 'settings.ejs', pageScript: 'js/settings.js' },
  { name: 'install', template: 'install.ejs' },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function renderRedirectPage(targetExpression, noScriptTarget) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>7 Minutes with the Lord</title>
    <script>
      (function () {
        var supported = ['en', 'es'];
        var saved = null;
        try {
          saved = localStorage.getItem('sevenMinutes:lang');
        } catch (_) {}
        var browser = (navigator.language || 'en').slice(0, 2);
        var lang = supported.includes(saved) ? saved : supported.includes(browser) ? browser : 'en';
        window.location.replace(${targetExpression});
      })();
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0; url=${noScriptTarget}" />
    </noscript>
  </head>
  <body></body>
</html>
`;
}

async function renderPage(config, lang) {
  const outputFile = path.join(OUTPUT_DIR, lang, config.name, 'index.html');
  const locals = {
    lang,
    bodyClass: config.bodyClass,
    pageScript: config.pageScript,
    pageName: config.name,
    appDepth: 2,
    currentUser: null,
    flash: null,
    relativePrefix: '../../',
    translations,
    t: (key, vars) => translateWithVars(lang, key, vars),
    asset: (assetPath) => `../../${assetPath.replace(/^\/+/, '')}`,
    route: (page, routeLang = lang) => `../${page}/`,
    steps: config.name === 'timer' ? getSteps(lang) : undefined,
  };

  const html = await ejs.renderFile(path.join(VIEWS_DIR, config.template), locals, {
    views: [VIEWS_DIR],
  });
  writeFile(outputFile, html);
}

async function build() {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  ensureDir(OUTPUT_DIR);
  fs.cpSync(PUBLIC_DIR, OUTPUT_DIR, { recursive: true });
  writeFile(path.join(OUTPUT_DIR, '.nojekyll'), '');

  for (const lang of LOCALES) {
    for (const config of PAGE_CONFIG) {
      await renderPage(config, lang);
    }
  }

  writeFile(
    path.join(OUTPUT_DIR, 'index.html'),
    renderRedirectPage("('./' + lang + '/home/')", './en/home/')
  );
  writeFile(
    path.join(OUTPUT_DIR, '404.html'),
    renderRedirectPage("('./' + lang + '/home/')", './en/home/')
  );

  for (const config of PAGE_CONFIG) {
    const target = "('../' + lang + '/" + config.name + "/')";
    writeFile(
      path.join(OUTPUT_DIR, config.name, 'index.html'),
      renderRedirectPage(target, `../en/${config.name}/`)
    );
  }

  fs.rmSync(path.join(OUTPUT_DIR, '.DS_Store'), { force: true });
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

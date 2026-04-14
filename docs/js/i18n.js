(() => {
  const STRINGS = window.I18N || {};
  const LANG = window.I18N_LANG || (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en';

  function interpolate(template, vars = {}) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] ?? ''));
  }

  function t(key, vars) {
    const value = STRINGS[key];
    if (value === undefined) return key;
    if (Array.isArray(value)) return value;
    return interpolate(value, vars);
  }

  function plural(count, singularKey, pluralKey) {
    return count === 1 ? t(singularKey) : t(pluralKey);
  }

  window.t = t;
  window.tPlural = plural;
  window.I18N_LANG = LANG;
})();

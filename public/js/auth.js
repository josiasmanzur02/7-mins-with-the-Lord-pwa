// Checkbox toggles for showing password(s)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pwd-toggle').forEach((toggle) => {
    const targets = (toggle.dataset.targets || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!targets.length) return;

    let showLabel = toggle.dataset.labelShow || 'Show password';
    let hideLabel = toggle.dataset.labelHide || 'Hide password';
    if (showLabel === 'auth_show_password') showLabel = 'Show password';
    if (hideLabel === 'auth_hide_password') hideLabel = 'Hide password';
    const labelSpan = toggle.nextElementSibling;

    function setVisibility(visible) {
      targets.forEach((el) => {
        try {
          el.type = visible ? 'text' : 'password';
        } catch (e) {
          // ignore
        }
      });
      if (labelSpan) {
        labelSpan.textContent = visible ? hideLabel : showLabel;
      }
    }

    // initialize
    setVisibility(toggle.checked);

    toggle.addEventListener('change', () => {
      setVisibility(toggle.checked);
    });
  });
});

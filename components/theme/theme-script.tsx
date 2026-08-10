const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('ks_theme') || 'system';
    var resolved = stored;
    if (stored === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-preference', stored);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      id="ks-theme-init"
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

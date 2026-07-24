import Script from "next/script";

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
    // This lint rule predates the App Router, where rendering a beforeInteractive
    // Script from the root layout (not pages/_document.js) is the documented,
    // supported way to block a theme flash before paint.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="ks-theme-init" strategy="beforeInteractive">
      {THEME_SCRIPT}
    </Script>
  );
}

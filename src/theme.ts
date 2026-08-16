export function applyThemeChrome(isDark: boolean) {
  const themeColor = isDark ? '#000000' : '#ffffff';

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', themeColor);

  document.documentElement.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;
}

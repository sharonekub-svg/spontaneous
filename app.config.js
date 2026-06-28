// Dynamic Expo config. Keeps app.json as the source of truth and only injects
// a web `baseUrl` when EXPO_PUBLIC_BASE_URL is set (e.g. on GitHub Pages, where
// the site is served under /spontaneous). On Vercel/local the var is unset, so
// the app is served from the root and nothing changes.
const appJson = require('./app.json');

module.exports = ({ config }) => {
  const merged = { ...appJson.expo, ...config };
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (baseUrl) {
    merged.experiments = { ...(merged.experiments || {}), baseUrl };
  }
  return merged;
};

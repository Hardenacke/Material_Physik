/*
 * Öffentliche Frontend-Konfiguration für den Cloudflare-Worker.
 * Die Worker-URL darf öffentlich sein. Cloudflare-API-Schlüssel oder andere
 * Geheimnisse dürfen niemals in diese Datei eingetragen werden.
 */
window.OptikQuizCloudflareConfig = Object.assign({
  apiBaseUrl: '',
  leaderboardPath: '/api/leaderboard',
  submitPath: '/api/submit',
  quizId: 'physik-optik-klasse-8-v1',
  defaultCompetitionId: 'optik-klasse-8',
  maxEntries: 10,
  refreshIntervalMs: 20000
}, window.OptikQuizCloudflareConfig || {});

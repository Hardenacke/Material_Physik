// Auf Cloudflare genügt die leere Adresse (gleiche Herkunft).
// Bei GitHub Pages hier die veröffentlichte Worker-Adresse eintragen, ohne / am Ende.
const sameOrigin = location.hostname.endsWith('.workers.dev') || ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_BASE = sameOrigin ? '' : 'https://physik-wettkampf-api.physik-wettkampf-api.workers.dev';

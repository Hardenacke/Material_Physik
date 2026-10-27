// JSON-Objektschlüssel kanonisch sortieren; Arrayreihenfolge ist Teil des Inhalts.
export function canonicalJSON(value) {
  if(value===null || typeof value==='string' || typeof value==='boolean') return JSON.stringify(value);
  if(typeof value==='number' && Number.isFinite(value)) return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(canonicalJSON).join(',')+']';
  if(value && typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype)
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(value[k])).join(',')+'}';
  throw new Error('Fingerabdruck erfordert ausschließlich gültige JSON-Werte.');
}
export async function fingerprint(value) {
  const data=new TextEncoder().encode(canonicalJSON(value));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function definitionFingerprint(config) {
  const {status,...definition}=config;
  return fingerprint(definition);
}

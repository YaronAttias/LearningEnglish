// Keep the existing, directly runnable dist/ app. Bundle its assets into the
// dependency-free Worker; no files outside this explicit allowlist are served.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['index.html','style.css','theme.css','penalty.css','words.js','shootout.js','penalty.js','app.js','present-simple-data.js','present-simple.js','present-simple.css','about.js','usage.js','admin.html','admin.css','admin.js','images/vocabulary-atlas.png'];
const assets = Object.fromEntries(files.map(f => ['/' + f, fs.readFileSync(path.join(root, 'dist', f)).toString('base64')]));
const worker = fs.readFileSync(path.join(root, 'worker/index.mjs'), 'utf8');
const source = worker + '\nconst assets = ' + JSON.stringify(assets) + `;
function asset(route, request, headers) {
  if (!Object.hasOwn(assets, route)) return new Response('Not found', {status:404,headers});
  const ext = route.split('.').pop();
  const type = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png'}[ext];
  const bytes = request.method === 'HEAD' ? null : Uint8Array.from(atob(assets[route]), c => c.charCodeAt(0));
  return new Response(bytes, {headers:{...headers,'Content-Type':type}});
}
export default {fetch(request, env) { return handle(request, env, asset); }};
`;
fs.mkdirSync(path.join(root, 'dist/server'), {recursive: true});
fs.mkdirSync(path.join(root, 'dist/.openai'), {recursive: true});
fs.writeFileSync(path.join(root, 'dist/server/index.js'), source);
fs.copyFileSync(path.join(root, '.openai/hosting.json'), path.join(root, 'dist/.openai/hosting.json'));
console.log('Worker built with ' + files.length + ' allowlisted assets; ' + Buffer.byteLength(source) + ' bytes.');

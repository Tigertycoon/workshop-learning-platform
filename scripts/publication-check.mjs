import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';

// Keep the public source tree free of runtime data and unreviewed binary assets.
// Secret detection is a separate Gitleaks job; these checks are not a privacy audit.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (paths.length === 0) throw new Error('No tracked release files. Stage the candidate before checking.');
const rootFiles = new Set(['.editorconfig', '.gitattributes', '.gitignore', '.nvmrc', 'package.json',
  'README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'NOTICE.md']);
const screenshots = new Set(['login', 'workshop', 'review', 'register-mobile']);
const reviewedAssets = new Set(['docs/media/canyon.png', 'docs/media/mountain.png',
  'unity/Activity-example/Assets/wooden_bridge.glb']);
const issues = [];
for (const name of paths) {
  const sourcePath = /^(app\/(client|server)\/|scripts\/|docs\/|unity\/|\.github\/)/.test(name)
    || ['app/package.json', 'app/package-lock.json', 'app/.env.example'].includes(name) || rootFiles.has(name);
  if (!sourcePath) issues.push(`${name}: outside reviewed source directories`);
  if (/(^|\/)(node_modules|dist|uploads|games|Bilder|Videos|Screenshots|\.git|\.plastic|[Ll]ibrary|[Tt]emp|[Oo]bj|[Ll]ogs|[Uu]ser[Ss]ettings|[Bb]uilds?)(\/|$)/.test(name)
      || /\.(db|sqlite|zip|mp4|pdf|docx|fbx|unitypackage|pem|key)(-|$|\.)/i.test(name)
      || /(^|\/)\.env($|\.(?!example$))/.test(name)) issues.push(`${name}: runtime/private/asset file`);
  const stat = lstatSync(name);
  const sizeLimit = reviewedAssets.has(name) ? 16 * 1024 * 1024 : 2 * 1024 * 1024;
  if (!stat.isFile() || stat.size > sizeLimit) issues.push(`${name}: unsupported type or size`);
  const bytes = readFileSync(name);
  const screenshot = name.match(/^docs\/screenshots\/([a-z-]+)\.jpg$/);
  if (screenshot && screenshots.has(screenshot[1])) {
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) issues.push(`${name}: not a JPEG`);
  } else if (reviewedAssets.has(name) && name.endsWith('.png')) {
    if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) issues.push(`${name}: not a PNG`);
  } else if (reviewedAssets.has(name) && name.endsWith('.glb')) {
    if (bytes.subarray(0, 4).toString() !== 'glTF' || bytes.readUInt32LE(8) !== bytes.length) issues.push(`${name}: invalid GLB container`);
  } else if (bytes.includes(0) || !/\.(tsx?|mjs|cjs|js|json|css|html|md|ya?ml|toml|cs|meta|asset|mat|unity|inputactions|txt)$/.test(name)
      && !rootFiles.has(name) && name !== 'app/.env.example') {
    issues.push(`${name}: unreviewed file format`);
  }
}
if (issues.length) throw new Error(issues.join('\n'));
console.log(`Publication boundary passed for ${paths.length} tracked files.`);

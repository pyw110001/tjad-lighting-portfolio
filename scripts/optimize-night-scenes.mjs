/** Preserve named interaction surfaces/camera extras; compress geometry and GPU textures. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'blender/night-scenes/exports');
const output = join(root, 'public/assets/light-lab/night/models');
const ktxBin = process.env.KTX_BIN ?? join(homedir(), '.codex/tools/ktx/portable/bin');
const env = { ...process.env, PATH: ktxBin + ';' + process.env.PATH };
const cli = join(root, 'node_modules/@gltf-transform/cli/bin/cli.js');
const evidence = [];
mkdirSync(output, { recursive: true });
function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`glTF optimization failed (${args[0]})`);
}
for (const kind of process.argv.slice(2).length ? process.argv.slice(2) : ['fluid', 'field']) {
  const standard = join(source, `${kind}-standard.glb`), gpu = join(source, `${kind}-ktx.glb`), web = join(output, `${kind}-web.glb`);
  run(['uastc', standard, gpu, '--level', '2', '--zstd', '18', '--jobs', '2']);
  run(['meshopt', gpu, web, '--level', 'high', '--quantize-position', '16', '--quantize-texcoord', '14']);
  const bytes = statSync(web).size;
  if (bytes > 25 * 1024 ** 2) throw new Error(`${kind} exceeds 25 MiB`);
  evidence.push({ kind, standardBytes: statSync(standard).size, webBytes: bytes, compression: 'EXT_meshopt_compression + KHR_texture_basisu' });
}
const basis = join(root, 'public/assets/decoders/basis'); mkdirSync(basis, { recursive: true });
for (const name of ['basis_transcoder.js', 'basis_transcoder.wasm']) cpSync(join(root, 'node_modules/three/examples/jsm/libs/basis', name), join(basis, name));
cpSync(join(root, 'node_modules/three/examples/jsm/libs/basis/README.md'), join(basis, 'README.md'));
cpSync(join(root, 'node_modules/three/LICENSE'), join(basis, 'three-LICENSE.txt'));
writeFileSync(join(source, 'optimization.json'), JSON.stringify(evidence, null, 2));
console.log(evidence);

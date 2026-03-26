const path = require('path');
const esbuild = require('./node_modules/esbuild');

async function build() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'index.ts')],
    outfile: path.join(__dirname, 'dist', 'index.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: true,
    logLevel: 'info',
  });
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

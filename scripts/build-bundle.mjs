import { mkdirSync, rmSync, copyFileSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const withPush = process.argv.includes('--push');

const paths = {
  backend: join(repoRoot, 'backend'),
  frontend: join(repoRoot, 'frontend'),
  cli: join(repoRoot, 'cli'),
  bundle: join(repoRoot, 'bundle'),
  bundlePublic: join(repoRoot, 'bundle', 'public'),
  frontendBrowser: join(repoRoot, 'frontend', 'dist', 'snip-frontend', 'browser'),
};

function bin(name) {
  return name;
}

function run(command, args, cwd = repoRoot) {
  if (process.platform === 'win32' && (command === 'npm' || command === 'npx')) {
    const quoted = [command, ...args]
      .map((arg) => {
        if (arg.length === 0) {
          return '""';
        }

        if (/\s|"/.test(arg)) {
          return `"${arg.replace(/"/g, '\\"')}"`;
        }

        return arg;
      })
      .join(' ');

    const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', quoted], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      const message = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      throw new Error(message || `${command} ${args.join(' ')} failed with exit code ${result.status}`);
    }

    return result.stdout.trim();
  }

  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(message || `${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result.stdout.trim();
}

function git(args, cwd = repoRoot) {
  return run('git', args, cwd);
}

function stageHasChanges(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd,
    stdio: 'ignore',
  });

  return result.status === 1;
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, text) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, text);
}

function commitIfChanged(cwd, message) {
  git(['add', '-A'], cwd);

  if (!stageHasChanges(cwd)) {
    return false;
  }

  git(['commit', '-m', message], cwd);
  return true;
}

function pushBundle() {
  git(['push', 'origin', 'HEAD:bundle'], paths.bundle);
}

function pushMain() {
  git(['push', 'origin', 'main'], repoRoot);
}

run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

run(bin('npm'), ['install'], paths.frontend);
run(bin('npx'), ['ng', 'build'], paths.frontend);

if (!existsSync(join(paths.frontendBrowser, 'index.html'))) {
  throw new Error('frontend/dist/snip-frontend/browser/index.html is missing after ng build');
}

rmSync(paths.bundlePublic, { recursive: true, force: true });
ensureDir(paths.bundle);

copyFileSync(join(paths.backend, 'server.js'), join(paths.bundle, 'server.js'));
copyFileSync(join(paths.cli, 'cli.js'), join(paths.bundle, 'cli.js'));
cpSync(paths.frontendBrowser, paths.bundlePublic, { recursive: true });

writeText(join(paths.bundle, '.env'), 'PUBLIC_DIR=./public\n');
writeText(
  join(paths.bundle, 'package.json'),
  JSON.stringify(
    {
      name: 'snip-bundle',
      private: true,
      scripts: {
        start: 'bun server.js',
      },
    },
    null,
    2,
  ) + '\n',
);
writeText(
  join(paths.bundle, 'Dockerfile'),
  ['FROM oven/bun:1-alpine', 'WORKDIR /app', 'COPY . .', 'ENV PORT=3000', 'EXPOSE 3000', 'CMD ["bun", "server.js"]', ''].join('\n'),
);
writeText(
  join(paths.bundle, '.dockerignore'),
  ['.git', '.gitmodules', 'backend', 'frontend', 'cli', 'scripts', 'node_modules', '.angular', 'dist', ''].join('\n'),
);
writeText(
  join(paths.bundle, 'railway.json'),
  JSON.stringify({ build: { builder: 'DOCKERFILE' } }, null, 2) + '\n',
);

const bundleCommitted = commitIfChanged(paths.bundle, 'Generate bundle release');
if (bundleCommitted && withPush) {
  pushBundle();
}

git(['add', 'backend', 'frontend', 'cli', 'bundle'], repoRoot);

const mainCommitted = commitIfChanged(repoRoot, 'Update bundle release pointers');
if (mainCommitted && withPush) {
  pushMain();
}

if (!bundleCommitted && !mainCommitted) {
  console.log('unchanged');
}
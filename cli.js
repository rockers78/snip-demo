const { spawn } = require('node:child_process');

const apiBase = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

const usage = `Snip CLI

Usage:
  snip add <url>    Create a short link and print the short URL
  snip ls           List all links
  snip open <code>  Open the original URL for a short code
  snip help         Show this help

Environment:
  SNIP_API         Backend base URL (default: http://localhost:3000)`;

function printUsage() {
  process.stdout.write(`${usage}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function readErrorMessage(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return await response.text();
  }

  try {
    const body = await response.json();
    if (body && typeof body === 'object' && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    return '';
  }

  return '';
}

async function postLink(url) {
  const response = await fetch(`${apiBase}/api/links`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    fail(message || `Request failed with status ${response.status}`);
  }

  const body = await response.json();
  process.stdout.write(`${body.shortUrl}\n`);
}

async function listLinks() {
  const response = await fetch(`${apiBase}/api/links`);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    fail(message || `Request failed with status ${response.status}`);
  }

  const links = await response.json();
  if (!Array.isArray(links) || links.length === 0) {
    process.stdout.write('No links yet.\n');
    return;
  }

  const rows = links.map((link) => ({
    code: String(link.code ?? ''),
    hits: String(link.hits ?? ''),
    url: String(link.url ?? ''),
  }));

  const widths = rows.reduce(
    (accumulator, row) => ({
      code: Math.max(accumulator.code, row.code.length),
      hits: Math.max(accumulator.hits, row.hits.length),
      url: Math.max(accumulator.url, row.url.length),
    }),
    { code: 4, hits: 4, url: 3 }
  );

  const header = [
    'CODE'.padEnd(widths.code),
    'HITS'.padStart(widths.hits),
    'URL',
  ].join('  ');
  const separator = [
    '-'.repeat(widths.code),
    '-'.repeat(widths.hits),
    '-'.repeat(widths.url),
  ].join('  ');

  const lines = rows.map((row) => [
    row.code.padEnd(widths.code),
    row.hits.padStart(widths.hits),
    row.url,
  ].join('  '));

  process.stdout.write([header, separator, ...lines].join('\n') + '\n');
}

function openBrowser(url) {
  return new Promise((resolve, reject) => {
    let command;
    let args;

    if (process.platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', url];
    } else if (process.platform === 'darwin') {
      command = 'open';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function openLink(code) {
  const response = await fetch(`${apiBase}/${encodeURIComponent(code)}`, {
    redirect: 'manual',
  });

  if (response.status === 404) {
    fail('Unknown code.');
  }

  if (response.status < 300 || response.status >= 400) {
    const message = await readErrorMessage(response);
    fail(message || `Request failed with status ${response.status}`);
  }

  const location = response.headers.get('location');
  if (!location) {
    fail('Missing redirect target.');
  }

  await openBrowser(location);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  try {
    if (command === 'add') {
      const [url] = rest;
      if (!url) {
        fail('Missing URL.');
      }
      if (!isHttpUrl(url)) {
        fail('URL must start with http:// or https://.');
      }
      await postLink(url);
      return;
    }

    if (command === 'ls') {
      await listLinks();
      return;
    }

    if (command === 'open') {
      const [code] = rest;
      if (!code) {
        fail('Missing code.');
      }
      await openLink(code);
      return;
    }

    fail(`Unknown command: ${command}`);
  } catch (error) {
    if (error instanceof TypeError && error.message === 'fetch failed') {
      fail(`Unable to reach backend at ${apiBase}.`);
    }
    fail(error instanceof Error ? error.message : 'Unexpected error.');
  }
}

main();
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { npmReadme } from '../scripts/sync-readme.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('npm README contains the complete root README with repository links', () => {
  assert.equal(read('../dialectic/README.md'), npmReadme(read('../README.md')));
  assert.doesNotMatch(read('../dialectic/README.md'), /\]\(\.\//u);
});

test('README synchronization converts file and directory links without changing other content', () => {
  assert.equal(
    npmReadme('# Dialectic\n[file](./dialectic/VERSION) [dir](./dialectic/) [web](https://example.com)\n'),
    '# Dialectic\n[file](https://github.com/Kaczev/dsh-DialecticMode/blob/main/dialectic/VERSION) [dir](https://github.com/Kaczev/dsh-DialecticMode/tree/main/dialectic/) [web](https://example.com)\n',
  );
});

test('README, VERSION and npm manifest agree on the release version', () => {
  const manifest = JSON.parse(read('../dialectic/package.json'));
  assert.equal(read('../dialectic/VERSION').trim(), manifest.version);
  assert.equal(/当前版本 \*\*([^*]+)\*\*/u.exec(read('../README.md'))?.[1], manifest.version);
  assert.ok(read('../README.md').includes(`dsh-dialecticmode@${manifest.version}`));
});

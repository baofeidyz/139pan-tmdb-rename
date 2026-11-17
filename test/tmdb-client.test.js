import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/types.js';
import '../src/tmdb-client.js';

const { TOKEN_KEY, LEGACY_TOKEN_KEY, createTmdbClient, redactError, getTmdbToken, setTmdbToken, clearTmdbToken } = globalThis.GTR;

function withModernStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  globalThis.GM = {
    getValue: async (key, fallback) => values.has(key) ? values.get(key) : fallback,
    setValue: async (key, value) => { values.set(key, value); },
    deleteValue: async (key) => { values.delete(key); }
  };
  return values;
}

test('maps TV candidates and does not auto-select one', async () => {
  const request = async () => ({ status: 200, responseText: JSON.stringify({ results: [{ id: 10, name: 'A', original_name: 'AA', first_air_date: '2026-01-01', origin_country: ['CN'], poster_path: '/a.jpg' }] }) });
  const results = await createTmdbClient({ token: 'secret', request }).searchTv('A');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 10);
  assert.equal(Object.hasOwn(results, 'selected'), false);
});

test('loads season fields and language fallback names', async () => {
  const request = async ({ url }) => ({ status: 200, responseText: JSON.stringify({ episodes: [{ id: 1, season_number: 3, episode_number: 2, name: url.includes('en-US') ? 'English title' : '中文标题', air_date: '2026-01-02' }] }) });
  const episodes = await createTmdbClient({ token: 'secret', request }).getSeasonWithFallback(9, 3);
  assert.equal(episodes[0].episodeNumber, 2);
  assert.deepEqual(episodes[0].alternateNames, ['English title']);
});

test('redacts tokens in errors and rejects invalid credentials', async () => {
  assert.equal(redactError('Bearer abc.def api_key=secret'), 'Bearer <redacted> api_key=<redacted>');
  const request = async () => ({ status: 401, responseText: 'Bearer secret' });
  await assert.rejects(() => createTmdbClient({ token: 'secret', request }).searchTv('A'), /凭据无效/);
});

test('persists, verifies and clears the token through modern isolated storage', async (t) => {
  t.after(() => { delete globalThis.GM; });
  const values = withModernStorage();
  await setTmdbToken('  secret-token  ');
  assert.equal(values.get(TOKEN_KEY), 'secret-token');
  assert.equal(await getTmdbToken(), 'secret-token');
  await clearTmdbToken();
  assert.equal(await getTmdbToken(), '');
});

test('migrates the legacy token key and removes the old value', async (t) => {
  t.after(() => { delete globalThis.GM; });
  const values = withModernStorage({ [LEGACY_TOKEN_KEY]: 'legacy-token' });
  assert.equal(await getTmdbToken(), 'legacy-token');
  assert.equal(values.get(TOKEN_KEY), 'legacy-token');
  assert.equal(values.has(LEGACY_TOKEN_KEY), false);
});

test('reports unavailable storage instead of silently claiming success', async (t) => {
  t.after(() => { delete globalThis.GM; });
  delete globalThis.GM;
  await assert.rejects(() => setTmdbToken('secret-token'), /隔离存储不可用/);
});

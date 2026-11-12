import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/bridge.js';

const { classifyRequest, createCapture, sanitizeObservedHeaders, contextFromCaptures } = globalThis.GTR;

test('classifies only the supported personal-cloud endpoints', () => {
  assert.equal(classifyRequest('https://personal-kd-njs.yun.139.com/hcy/file/list'), 'list');
  assert.equal(classifyRequest('https://personal-kd-njs.yun.139.com/hcy/file/update'), 'rename');
  assert.equal(classifyRequest('https://evil.example/hcy/file/list'), null);
});

test('allowlists runtime headers and builds in-memory context', () => {
  const headers = sanitizeObservedHeaders({ Authorization: 'Bearer synthetic', Cookie: 'forbidden', 'x-yun-client-info': 'web' });
  assert.deepEqual(headers, { authorization: 'Bearer synthetic', 'x-yun-client-info': 'web' });
  const list = createCapture('https://personal-kd-njs.yun.139.com/hcy/file/list', 'POST', headers, JSON.stringify({ parentFileId: 'folder', pageInfo: { pageSize: 100 } }));
  const context = contextFromCaptures({ list });
  assert.equal(context.listBody.parentFileId, 'folder');
  assert.match(context.renameUrl, /\/hcy\/file\/update$/);
  assert.equal('cookie' in context.headers, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/139-client.js';

const { create139Client, normalize139File, planRenamePhases, withRetry, executeRenamePlan } = globalThis.GTR;
const response = (body, status = 200) => ({ status, responseText: JSON.stringify(body) });
const context = { headers: { authorization: 'Bearer synthetic' }, listUrl: 'https://personal-kd-njs.yun.139.com/hcy/file/list' };

test('normalizes folders and files from 139pan records', () => {
  assert.equal(normalize139File({ fileId: 'd', parentFileId: '/', name: 'S01', type: 'folder' }).type, 'directory');
  const file = normalize139File({ fileId: 'f', parentFileId: 'd', name: 'x.mp4', type: 'file', size: 12, mediaMetaInfo: { width: 1920 } });
  assert.equal(file.type, 'file'); assert.equal(file.parentId, 'd'); assert.equal(file.detail.width, 1920);
});

test('follows nextPageCursor and preserves observed list shape', async () => {
  const bodies = [];
  const request = async ({ data }) => {
    const body = JSON.parse(data); bodies.push(body);
    return body.pageInfo.pageCursor
      ? response({ success: true, code: '0000', data: { items: [{ fileId: '2', name: 'b.mp4', type: 'file' }], nextPageCursor: null } })
      : response({ success: true, code: '0000', data: { items: [{ fileId: '1', name: 'a.mp4', type: 'file' }], nextPageCursor: 'next' } });
  };
  const files = await create139Client({ context: { ...context, listBody: { orderBy: 'updated_at', pageInfo: { pageSize: 100 } } }, request }).listFiles('p');
  assert.deepEqual(files.map((file) => file.id), ['1', '2']);
  assert.equal(bodies[0].parentFileId, 'p'); assert.equal(bodies[1].pageInfo.pageCursor, 'next');
});

test('stops safely when the server repeats a page cursor', async () => {
  let calls = 0;
  const request = async () => { calls += 1; return response({ success: true, code: '0000', data: { items: [{ fileId: String(calls), name: `${calls}.mp4`, type: 'file' }], nextPageCursor: 'same' } }); };
  const files = await create139Client({ context, request }).listFiles('p', { pageSize: 1 });
  assert.equal(calls, 2); assert.deepEqual(files.map((file) => file.id), ['1', '2']);
});

test('update sends full name and stable description', async () => {
  let sent;
  const request = async (details) => { sent = { url: details.url, body: JSON.parse(details.data) }; return response({ success: true, code: '0000' }); };
  await create139Client({ context, request }).renameFile('7', 'Show.S01E01.mp4');
  assert.match(sent.url, /\/hcy\/file\/update$/);
  assert.deepEqual(sent.body, { description: '', fileId: '7', name: 'Show.S01E01.mp4' });
});

test('generic execution handles cycles, retry, and verified recovery', async () => {
  const swap = [
    { fileId: '1', parentId: 'p', oldName: 'a', targetName: 'b', selected: true, parsed: { extension: '' } },
    { fileId: '2', parentId: 'p', oldName: 'b', targetName: 'a', selected: true, parsed: { extension: '' } }
  ];
  assert.equal(planRenamePhases(swap, [{ id: '1', name: 'a' }, { id: '2', name: 'b' }]).temporary.length, 2);
  let attempts = 0; assert.equal(await withRetry(async () => { if (++attempts < 2) throw Object.assign(new Error('busy'), { status: 500 }); return 1; }, { sleep: async () => {} }), 1);
  let reads = 0; const calls = [];
  const outcome = await executeRenamePlan({ plan: [swap[0]], listFiles: async () => (++reads === 1 ? [{ id: '1', name: 'a' }] : [{ id: '1', name: 'b' }]), renameFile: async (...args) => calls.push(args) });
  assert.deepEqual(calls, [['1', 'b']]); assert.equal(outcome.results[0].status, 'verified');
  assert.equal(outcome.recoveryPlan[0].targetName, 'a'); assert.equal(outcome.recoveryPlan[0].parentId, 'p');
});

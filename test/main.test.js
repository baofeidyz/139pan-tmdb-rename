import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.__GTR_TEST__ = true;
globalThis.MutationObserver = class { observe() {} disconnect() {} };
import '../src/main.js';

const { breadcrumbNames, folderFromCapture, selectedFolderName, cachedSeriesPatch, setPlanSelection } = globalThis.GTR;

test('reads the current 139pan breadcrumb leaf nodes', () => {
  const nodes = ['全部', '...', '低智商犯罪', 'S01'].map((textContent) => ({ textContent }));
  assert.deepEqual(breadcrumbNames({ querySelectorAll: () => nodes }), ['全部', '低智商犯罪', 'S01']);
});

test('combines captured directory ID with breadcrumb season', () => {
  const folder = folderFromCapture({ body: { parentFileId: 'dir-id' } }, ['2026', '低智商犯罪', 'S01']);
  assert.equal(folder.parentId, 'dir-id'); assert.equal(folder.seriesTitle, '低智商犯罪'); assert.equal(folder.seasonNumber, 1); assert.equal(folder.displayPath, '低智商犯罪/S01');
});

test('uses fallback when no selected row is available', () => {
  assert.equal(selectedFolderName({ querySelector: () => null }, '低智商犯罪'), '低智商犯罪');
});

test('restores a cached series only for a recognized folder without a current selection', () => {
  const cached = { id: 272432, name: '低智商犯罪' };
  assert.deepEqual(cachedSeriesPatch({ displayPath: '低智商犯罪/S01' }, null, (key) => key === '低智商犯罪/S01' ? cached : null), {
    series: cached, candidates: [cached], progress: '已恢复该目录确认过的 TMDB 剧集，可重新扫描并预览'
  });
  assert.deepEqual(cachedSeriesPatch({ displayPath: '低智商犯罪/S01' }, cached, () => cached), {});
});

test('bulk selection includes only matched files whose target name changes', () => {
  const episode = { seasonNumber: 1, episodeNumber: 1 };
  const plan = [
    { oldName: 'a.iso', targetName: '节目.S01E01.iso', episode, selected: false },
    { oldName: 'same.iso', targetName: 'same.iso', episode, selected: true },
    { oldName: 'unknown.iso', targetName: '', episode: null, selected: true }
  ];
  assert.deepEqual(setPlanSelection(plan, true).map((item) => item.selected), [true, false, false]);
  assert.deepEqual(setPlanSelection(plan, false).map((item) => item.selected), [false, false, false]);
});

globalThis.GTR = globalThis.GTR || {};

(() => {
  const G = globalThis.GTR;

  function breadcrumbNames(documentLike = document) {
    const direct = [...(documentLike.querySelectorAll?.('.document_title_item_text, .document_title_item_text_all') || [])]
      .map((node) => String(node.textContent || '').trim()).filter((value) => value && value !== '...');
    if (direct.length) return direct.slice(-3);
    const input = documentLike.querySelector?.('input[placeholder="搜索当前文件夹内容"]');
    const area = input?.closest?.('[class]')?.parentElement || input?.parentElement?.parentElement;
    if (!area) return [];
    const candidates = [...area.querySelectorAll('span,div')].map((node) => String(node.textContent || '').trim()).filter((text) => text && text.length < 100);
    const ignored = new Set(['...', '搜索当前文件夹内容']);
    const unique = [];
    for (const value of candidates) if (!ignored.has(value) && !unique.some((item) => item === value || item.includes(value))) unique.push(value);
    return unique.filter((value) => !value.includes('搜索当前文件夹内容')).slice(-3);
  }

  function folderFromCapture(capture, names = []) {
    const parentId = String(capture?.body?.parentFileId || '');
    const currentName = names.at(-1) || '';
    const parentName = names.at(-2) || '';
    const seasonMatch = currentName.match(/(?:^|\b)S(\d{1,3})(?:\b|$)/i);
    return { parentId, currentName, seriesTitle: seasonMatch ? parentName : currentName, seasonNumber: seasonMatch ? Number(seasonMatch[1]) : null, displayPath: names.slice(-2).join('/') };
  }

  function selectedFolderName(documentLike, fallback = '') {
    const selected = documentLike.querySelector?.('[data-file-type="folder"][aria-selected="true"], .document-list-item.is-checked, .document-table-row.selected');
    const value = selected?.getAttribute?.('title') || selected?.textContent;
    return String(value || fallback).trim();
  }

  function cachedSeriesPatch(folder, currentSeries, getCachedSeries) {
    if (currentSeries || !folder?.displayPath || typeof getCachedSeries !== 'function') return {};
    const cached = getCachedSeries(folder.displayPath);
    return cached ? { series: cached, candidates: [cached], progress: '已恢复该目录确认过的 TMDB 剧集，可重新扫描并预览' } : {};
  }

  function setPlanSelection(plan = [], selected) {
    return plan.map((item) => ({
      ...item,
      selected: Boolean(selected && item.episode && item.targetName && item.oldName !== item.targetName)
    }));
  }

  function startApplication({ document: doc = document, pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window } = {}) {
    const captures = {}; let ui; let contextKey = '';
    let state = { folder: folderFromCapture(null, []), selectedFolderName: '', hasToken: Boolean(G.getTmdbToken()), authReady: false, query: '', candidates: [], series: null, episodes: [], files: [], plan: [], validation: null, mode: 'full', results: [], recoveryPlan: [], running: false, progress: '' };
    const update = (patch = {}) => { state = { ...state, ...patch }; ui?.render(state); return state; };
    const refreshFolder = () => {
      const folder = folderFromCapture(captures.list, breadcrumbNames(doc));
      const nextKey = `${folder.parentId}:${folder.displayPath}`;
      const chosen = selectedFolderName(doc, folder.seriesTitle);
      const changed = Boolean(contextKey && nextKey && nextKey !== contextKey);
      if (changed) update({ folder, selectedFolderName: chosen, query: '', series: null, candidates: [], files: [], plan: [], validation: null, results: [], recoveryPlan: [], progress: '目录已变化，旧计划已清除', ...cachedSeriesPatch(folder, null, G.getCachedSeries) });
      else if (state.folder.parentId !== folder.parentId || state.folder.displayPath !== folder.displayPath || state.selectedFolderName !== chosen) update({ folder, selectedFolderName: chosen, ...cachedSeriesPatch(folder, state.series, G.getCachedSeries) });
      if (nextKey) contextKey = nextKey;
    };
    const stopObserver = G.install139RequestObserver(pageWindow, (capture) => { captures[capture.kind] = capture; update({ authReady: Boolean(G.contextFromCaptures(captures)) }); if (capture.kind === 'list') queueMicrotask(refreshFolder); });

    async function scan() {
      const context = G.contextFromCaptures(captures); if (!context) throw new Error('尚未捕获移动云盘授权；请刷新当前文件列表');
      const folder = folderFromCapture(captures.list, breadcrumbNames(doc)); if (!folder.parentId) throw new Error('尚未识别当前目录 ID');
      const client = G.create139Client({ context });
      const files = (await client.enrichFileDetails((await client.listFiles(folder.parentId)).filter((file) => file.type === 'file'))).map((file) => ({ ...file, parsed: G.parseFilename(file.name) }));
      return { client, files, folder };
    }
    async function loadPlan(series = state.series) {
      if (!series) throw new Error('请先明确选择一个 TMDB 剧集');
      const { client, files, folder } = await scan(); if (!Number.isInteger(folder.seasonNumber)) throw new Error('当前目录名未包含 Sxx 季号');
      const seasons = await G.createTmdbClient().loadSeasons(series.id, folder.seasonNumber); const episodes = [...seasons.regular, ...seasons.specials];
      const plan = G.createRenamePlan(files, G.matchDirectory(files, seasons.regular, seasons.specials), { seriesTitle: series.name, mode: state.mode });
      update({ client, files, folder, episodes, plan, validation: G.validatePlan(plan, files), results: [], recoveryPlan: [], running: false, progress: `已载入 ${files.length} 个文件` });
    }
    const reportError = (error) => update({ running: false, progress: error?.message || String(error) });
    const handlers = {
      open: () => { refreshFolder(); update({ hasToken: Boolean(G.getTmdbToken()), authReady: Boolean(G.contextFromCaptures(captures)) }); },
      'save-token': (panel) => { G.setTmdbToken(panel.querySelector('#gtr-token').value); update({ hasToken: Boolean(G.getTmdbToken()), progress: 'TMDB Token 已保存到油猴隔离存储' }); },
      search: async (panel) => { try { const query = selectedFolderName(doc, state.folder.seriesTitle) || panel.querySelector('#gtr-query').value.trim(); update({ query, progress: `正在搜索“${query}”…` }); const candidates = await G.createTmdbClient().searchTv(query); update({ candidates, progress: candidates.length ? '请选择准确的 TMDB 剧集' : 'TMDB 未找到匹配剧集' }); } catch (error) { reportError(error); } },
      'choose-series': async (panel) => { try { const id = Number(panel.querySelector('input[name="gtr-series"]:checked')?.value); const series = state.candidates.find((item) => item.id === id); if (!series) throw new Error('请明确选择一个候选剧集'); G.cacheSeries(state.folder.displayPath, series); update({ series, progress: '正在读取目录和 TMDB 季信息…' }); await loadPlan(series); } catch (error) { reportError(error); } },
      reload: async () => { try { update({ running: true, progress: '正在重新扫描移动云盘目录和 TMDB 季信息…' }); await loadPlan(); } catch (error) { reportError(error); } },
      'select-all': () => { const plan = setPlanSelection(state.plan, true); update({ plan, validation: G.validatePlan(plan, state.files) }); },
      'select-none': () => { const plan = setPlanSelection(state.plan, false); update({ plan, validation: G.validatePlan(plan, state.files) }); },
      'choose-episode': ({ index, key }) => { const plan = [...state.plan]; const [season, episode] = key.split(':').map(Number); const selectedEpisode = key ? state.episodes.find((item) => item.seasonNumber === season && item.episodeNumber === episode) : null; if (key && !selectedEpisode) return; plan[index] = G.assignEpisode(plan[index], selectedEpisode); update({ plan, validation: G.validatePlan(plan, state.files) }); },
      execute: async () => { try { const validation = G.validatePlan(state.plan, state.files); update({ validation }); if (!validation.valid) throw new Error('计划存在阻断错误'); const selected = state.plan.filter((item) => item.selected); if (!confirm(`将重命名 ${selected.length} 个文件，是否继续？`)) return; update({ running: true }); const outcome = await G.executeRenamePlan({ plan: state.plan, listFiles: state.client.listFiles, renameFile: state.client.renameFile, onProgress: (detail) => update({ progress: `${detail.completed || 0}/${detail.total || selected.length}` }) }); update({ running: false, results: outcome.results, recoveryPlan: outcome.recoveryPlan, progress: outcome.aborted ? '批次已停止' : '执行并校验完成' }); } catch (error) { reportError(error); } },
      recover: async () => { try { if (!confirm(`恢复 ${state.recoveryPlan.length} 个文件的原名称？`)) return; const outcome = await G.executeRenamePlan({ plan: state.recoveryPlan, listFiles: state.client.listFiles, renameFile: state.client.renameFile }); update({ results: outcome.results, recoveryPlan: [], progress: '恢复操作完成并已校验' }); } catch (error) { reportError(error); } },
      change: (event) => { if (event.target.id === 'gtr-mode') { const mode = event.target.value; const plan = state.plan.map((item) => ({ ...item, mode, targetName: item.episode ? G.generateTargetName(item.seriesTitle, item.episode, item.parsed.extension, mode, item.variantTags) : '' })); update({ mode, plan, validation: G.validatePlan(plan, state.files) }); } const row = event.target.closest?.('tr[data-index]'); if (row && event.target.classList.contains('gtr-select')) { const plan = [...state.plan]; const index = Number(row.dataset.index); plan[index] = { ...plan[index], selected: event.target.checked }; update({ plan, validation: G.validatePlan(plan, state.files) }); } }
    };
    const mount = () => { if (!doc.body || doc.getElementById('gtr-launcher')) return; ui = G.createUi(doc, handlers, state); refreshFolder(); };
    if (doc.body) mount(); else doc.addEventListener('DOMContentLoaded', mount, { once: true });
    let refreshQueued = false;
    const mutation = new MutationObserver(() => { if (refreshQueued) return; refreshQueued = true; queueMicrotask(() => { refreshQueued = false; refreshFolder(); }); });
    if (doc.documentElement) mutation.observe(doc.documentElement, { childList: true, subtree: true });
    return { getState: () => state, handlers, stop: () => { stopObserver(); mutation.disconnect(); } };
  }

  Object.assign(G, { breadcrumbNames, folderFromCapture, selectedFolderName, cachedSeriesPatch, setPlanSelection, startApplication });
  if (typeof document !== 'undefined' && !globalThis.__GTR_TEST__) startApplication();
})();

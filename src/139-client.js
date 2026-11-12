globalThis.GTR = globalThis.GTR || {};

(() => {
  const DEFAULT_API = 'https://personal-kd-njs.yun.139.com';
  const DEFAULT_PATHS = {
    list: '/hcy/file/list',
    rename: '/hcy/file/update'
  };

  function responseCode(payload) { return String(payload?.code ?? payload?.status ?? ''); }
  function businessOk(payload, status) {
    if (status < 200 || status >= 300 || payload?.success === false || payload?.status === 'error') return false;
    const code = responseCode(payload);
    return payload?.success === true || !code || ['0', '0000', '200', '2000'].includes(code) || code.startsWith('2');
  }
  function errorMessage(payload, fallback = '移动云盘 API 请求失败') {
    return String(payload?.message || payload?.msg || payload?.show_msg || payload?.error || fallback);
  }
  function defaultRequest(details) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') return reject(new Error('GM_xmlhttpRequest 不可用'));
      GM_xmlhttpRequest({ ...details, onload: resolve, onerror: () => reject(new Error('移动云盘网络请求失败')), ontimeout: () => reject(new Error('移动云盘请求超时')) });
    });
  }
  function parseResponse(response) {
    try { return JSON.parse(response.responseText || '{}'); } catch { return null; }
  }
  function findArray(value, depth = 0) {
    if (depth > 5 || value == null) return null;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') return null;
    for (const key of ['files', 'items', 'list', 'rows', 'records', 'data']) {
      const found = findArray(value[key], depth + 1);
      if (found) return found;
    }
    for (const child of Object.values(value)) {
      const found = findArray(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  function firstValue(raw, keys) {
    for (const key of keys) if (raw?.[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
    return null;
  }
  function normalize139File(raw, parentId = '') {
    const id = firstValue(raw, ['fileId', 'id', 'resourceId', 'resId', 'bizId', 'objId']);
    const name = firstValue(raw, ['name', 'fileName', 'filename', 'title']);
    if (id == null || name == null) return null;
    const rawType = String(firstValue(raw, ['type', 'fileType', 'resourceType']) || '').toLowerCase();
    const dirFlag = firstValue(raw, ['isDir', 'isFolder', 'folder', 'dir']);
    const type = dirFlag === true || dirFlag === 1 || ['folder', 'directory', 'dir'].includes(rawType) ? 'directory' : 'file';
    const size = Number(firstValue(raw, ['size', 'fileSize', 'length']));
    return {
      id: String(id), parentId: String(firstValue(raw, ['parentFileId', 'parentId', 'parent_id']) || parentId),
      name: String(name), type, size: Number.isFinite(size) ? size : null,
      modifiedAt: firstValue(raw, ['updatedAt', 'modifiedAt', 'modifyTime', 'updateTime']) || null,
      detail: raw.mediaMetaInfo || null, raw
    };
  }
  function paginationToken(payload) {
    const keys = ['nextPageCursor', 'nextCursor', 'nextToken', 'pageToken', 'cursor', 'marker', 'lastId'];
    for (const key of keys) {
      const value = payload?.data?.[key] ?? payload?.[key];
      if (value !== undefined && value !== null && value !== '') return { key, value };
    }
    return null;
  }

  function create139Client({ context, request = defaultRequest } = {}) {
    if (!context) throw new Error('缺少移动云盘请求上下文');
    const headers = { 'content-type': 'application/json', ...(context.headers || {}) };
    async function post(url, body) {
      if (!headers.authorization) throw new Error('等待移动云盘页面授权上下文');
      const response = await request({ method: 'POST', url, headers, data: JSON.stringify(body), timeout: 20000 });
      const payload = parseResponse(response);
      if (response.status === 401 || response.status === 403) {
        const error = new Error('移动云盘授权已失效'); error.status = response.status; throw error;
      }
      if (!businessOk(payload, response.status)) {
        const error = new Error(errorMessage(payload, `移动云盘 API 请求失败 (${response.status})`));
        error.status = response.status; error.payload = payload; throw error;
      }
      return payload || {};
    }
    async function listFiles(parentId, options = {}) {
      const pageSize = options.pageSize || 100;
      const maxPages = options.maxPages || 200;
      const observed = context.listBody || {};
      const baseBody = {
        ...observed,
        pageInfo: { ...(observed.pageInfo || {}), pageSize, pageCursor: null },
        orderBy: observed.orderBy || 'updated_at', orderDirection: observed.orderDirection || 'DESC',
        parentFileId: String(parentId), imageThumbnailStyleList: observed.imageThumbnailStyleList || ['Small', 'Large'],
        ...(options.body || {})
      };
      const url = context.listUrl || `${DEFAULT_API}${DEFAULT_PATHS.list}`;
      const all = [];
      const seenIds = new Set();
      let cursor = null;
      for (let page = 0; page < maxPages; page += 1) {
        const body = { ...baseBody, pageInfo: { ...baseBody.pageInfo, pageCursor: cursor?.value ?? null } };
        const payload = await post(url, body);
        const rows = findArray(payload) || [];
        const normalized = rows.map((row) => normalize139File(row, parentId)).filter(Boolean);
        const added = normalized.filter((file) => !seenIds.has(file.id));
        added.forEach((file) => seenIds.add(file.id));
        all.push(...added);
        const next = paginationToken(payload);
        if (next && (!cursor || next.value !== cursor.value)) { cursor = next; continue; }
        if (next && cursor && next.value === cursor.value) break;
        if (rows.length < pageSize) break;
        if (!next && page > 0 && !added.length) break;
      }
      return [...new Map(all.map((file) => [file.id, file])).values()];
    }
    async function enrichFileDetails(files, options = {}) {
      return files.map((file) => ({ ...file, detail: file.detail || file.raw?.mediaMetaInfo || null }));
    }
    async function renameFile(fileId, newName, extras = {}) {
      const url = context.renameUrl || `${DEFAULT_API}${DEFAULT_PATHS.rename}`;
      const stable = { description: '' };
      for (const key of ['description']) {
        if (context.renameBody?.[key] !== undefined && context.renameBody[key] !== '') stable[key] = context.renameBody[key];
      }
      return post(url, { ...stable, ...extras, fileId: String(fileId), name: String(newName) });
    }
    return { listFiles, enrichFileDetails, renameFile, post };
  }

  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  async function withRetry(operation, options = {}) {
    const retries = options.retries ?? 3;
    for (let attempt = 0; ; attempt += 1) {
      try { return await operation(attempt); } catch (error) {
        if ([401, 403].includes(error.status) || attempt >= retries || !(error.status === 429 || error.status >= 500 || error.status == null)) throw error;
        const delay = Math.min(options.maxDelay ?? 4000, (options.baseDelay ?? 250) * (2 ** attempt));
        options.onRetry?.({ attempt: attempt + 1, delay, error });
        await (options.sleep || sleep)(delay);
      }
    }
  }
  function planRenamePhases(plan, currentFiles) {
    const selected = plan.filter((item) => item.selected);
    const oldNameOwners = new Map(selected.map((item) => [item.oldName, item.fileId]));
    const occupiedByPlan = new Set(selected.filter((item) => oldNameOwners.has(item.targetName) && oldNameOwners.get(item.targetName) !== item.fileId).map((item) => String(item.fileId)));
    const used = new Set(currentFiles.map((file) => file.name));
    const temporary = [];
    for (const item of selected) {
      if (!occupiedByPlan.has(String(item.fileId))) continue;
      let index = 0;
      let tempName;
      do { tempName = `.__gtr_tmp_${item.fileId}_${Date.now()}_${index++}${item.parsed?.extension || ''}`; } while (used.has(tempName));
      used.add(tempName);
      temporary.push({ ...item, targetName: tempName, finalTargetName: item.targetName, phase: 'temporary' });
    }
    return { temporary, final: selected.map((item) => ({ ...item, phase: 'final' })) };
  }
  function verifyExecution(plan, files, apiResults = []) {
    const byId = new Map(files.map((file) => [String(file.id), file]));
    const apiById = new Map(apiResults.map((result) => [String(result.fileId), result]));
    return plan.filter((item) => item.selected).map((item) => {
      const current = byId.get(String(item.fileId));
      if (current?.name === item.targetName) return { ...item, status: 'verified', ok: true };
      const api = apiById.get(String(item.fileId));
      return { ...item, status: api?.ok === false ? 'failed' : 'mismatch', ok: false, message: api?.message || '服务端最终名称与计划不一致' };
    });
  }
  function createRecoveryPlan(results) {
    return results.filter((item) => item.status === 'verified').map((item) => ({
      fileId: item.fileId, parentId: item.parentId, oldName: item.targetName,
      targetName: item.oldName, selected: true, parsed: item.parsed
    }));
  }

  async function executeRenamePlan({ plan, listFiles, renameFile, onProgress, retryOptions = {} }) {
    const parentId = plan.find((item) => item.selected)?.parentId || '';
    const current = await listFiles(parentId);
    const currentById = new Map(current.map((file) => [String(file.id), file]));
    const runnable = [];
    const results = [];
    for (const item of plan.filter((entry) => entry.selected)) {
      const live = currentById.get(String(item.fileId));
      if (!live) { results.push({ ...item, status: 'stale', ok: false, message: '文件已不存在' }); continue; }
      if (live.name === item.targetName) { results.push({ ...item, status: 'skipped', ok: true, message: '已是目标名称' }); continue; }
      if (live.name !== item.oldName) { results.push({ ...item, status: 'stale', ok: false, message: `源名称已变化: ${live.name}` }); continue; }
      runnable.push(item);
    }
    const phases = planRenamePhases(runnable, current);
    const tempById = new Map();
    for (const item of phases.temporary) {
      try {
        await withRetry(() => renameFile(item.fileId, item.targetName), retryOptions);
        tempById.set(String(item.fileId), item.targetName);
      } catch (error) {
        results.push({ ...item, status: 'failed', ok: false, message: `临时改名失败: ${error.message}` });
        const blocked = new Set(phases.temporary.map((entry) => String(entry.fileId)));
        for (const finalItem of phases.final.filter((entry) => blocked.has(String(entry.fileId)) && !results.some((result) => String(result.fileId) === String(entry.fileId)))) {
          results.push({ ...finalItem, status: 'failed', ok: false, message: '依赖的临时改名阶段失败' });
        }
        return { results, recoveryPlan: [], aborted: true };
      }
    }
    let authFailed = false; let nextIndex = 0; let completed = 0;
    const concurrency = Math.max(1, Math.min(4, retryOptions.concurrency ?? 2));
    async function worker() {
      while (nextIndex < phases.final.length && !authFailed) {
        const index = nextIndex++; const item = phases.final[index];
        if (results.some((result) => String(result.fileId) === String(item.fileId))) continue;
        try {
          await withRetry(() => renameFile(item.fileId, item.targetName), { ...retryOptions, onRetry: (detail) => { retryOptions.onRetry?.(detail); onProgress?.({ type: 'retry', item, ...detail }); } });
          results.push({ ...item, status: 'submitted', ok: true });
        } catch (error) {
          if ([401, 403].includes(error.status)) authFailed = true;
          results.push({ ...item, status: 'failed', ok: false, message: error.message });
        }
        completed += 1; onProgress?.({ type: 'progress', completed, total: phases.final.length, item });
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, phases.final.length) }, worker));
    if (authFailed) for (const item of phases.final.slice(nextIndex)) results.push({ ...item, status: 'failed', ok: false, message: '因授权失败停止批次' });
    const finalFiles = await listFiles(parentId);
    const verified = verifyExecution(runnable, finalFiles, results);
    const merged = [...results.filter((result) => ['stale', 'skipped'].includes(result.status)), ...verified];
    return { results: merged, recoveryPlan: createRecoveryPlan(verified), aborted: authFailed };
  }

  Object.assign(globalThis.GTR, {
    DEFAULT_API, DEFAULT_PATHS, businessOk, errorMessage, findArray, normalize139File,
    create139Client, withRetry, planRenamePhases, verifyExecution, createRecoveryPlan, executeRenamePlan
  });
})();

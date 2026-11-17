globalThis.GTR = globalThis.GTR || {};

(() => {
  const TOKEN_KEY = '139pan_tmdb_read_token';
  const LEGACY_TOKEN_KEY = 'guangya_tmdb_read_token';
  const SERIES_KEY_PREFIX = 'guangya_tmdb_series:';

  async function gmGet(key, fallback = '') {
    if (typeof globalThis.GM?.getValue === 'function') return globalThis.GM.getValue(key, fallback);
    if (typeof globalThis.GM_getValue === 'function') return globalThis.GM_getValue(key, fallback);
    throw new Error('油猴隔离存储不可用，请检查脚本管理器和 @grant 配置');
  }
  async function gmSet(key, value) {
    if (typeof globalThis.GM?.setValue === 'function') return globalThis.GM.setValue(key, value);
    if (typeof globalThis.GM_setValue === 'function') return globalThis.GM_setValue(key, value);
    throw new Error('油猴隔离存储不可用，请检查脚本管理器和 @grant 配置');
  }
  async function gmDelete(key) {
    if (typeof globalThis.GM?.deleteValue === 'function') return globalThis.GM.deleteValue(key);
    if (typeof globalThis.GM_deleteValue === 'function') return globalThis.GM_deleteValue(key);
    return gmSet(key, '');
  }
  async function getTmdbToken() {
    const current = String(await gmGet(TOKEN_KEY, '') || '').trim();
    if (current) return current;
    const legacy = String(await gmGet(LEGACY_TOKEN_KEY, '') || '').trim();
    if (!legacy) return '';
    await gmSet(TOKEN_KEY, legacy);
    await gmDelete(LEGACY_TOKEN_KEY);
    return legacy;
  }
  async function setTmdbToken(token) {
    const normalized = String(token || '').trim();
    if (!normalized) throw new Error('TMDB Token 不能为空；如需移除，请点击“清除 Token”');
    await gmSet(TOKEN_KEY, normalized);
    if (String(await gmGet(TOKEN_KEY, '') || '').trim() !== normalized) throw new Error('TMDB Token 保存校验失败');
    await gmDelete(LEGACY_TOKEN_KEY);
  }
  async function clearTmdbToken() {
    await Promise.all([gmDelete(TOKEN_KEY), gmDelete(LEGACY_TOKEN_KEY)]);
    if (await getTmdbToken()) throw new Error('TMDB Token 清除校验失败');
  }
  function cacheSeries(folderKey, series) { return gmSet(`${SERIES_KEY_PREFIX}${folderKey}`, series); }
  function getCachedSeries(folderKey) { return gmGet(`${SERIES_KEY_PREFIX}${folderKey}`, null); }

  function redactError(value) {
    return String(value || 'TMDB 请求失败')
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer <redacted>')
      .replace(/api_key=[^&\s]+/gi, 'api_key=<redacted>');
  }

  function defaultRequest(details) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') return reject(new Error('GM_xmlhttpRequest 不可用'));
      GM_xmlhttpRequest({
        ...details,
        onload: (response) => resolve(response),
        onerror: () => reject(new Error('TMDB 网络请求失败')),
        ontimeout: () => reject(new Error('TMDB 请求超时'))
      });
    });
  }

  function createTmdbClient({ token, request = defaultRequest, language = 'zh-CN' } = {}) {
    let resolvedToken = token;
    async function get(path, params = {}) {
      if (resolvedToken === undefined) resolvedToken = await getTmdbToken();
      if (!resolvedToken) throw new Error('请先配置 TMDB Read Access Token');
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      url.searchParams.set('language', params.language || language);
      for (const [key, value] of Object.entries(params)) if (key !== 'language' && value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
      const response = await request({ method: 'GET', url: url.toString(), timeout: 15000, headers: { Accept: 'application/json', Authorization: `Bearer ${resolvedToken}` } });
      if (response.status === 401 || response.status === 403) throw new Error('TMDB 凭据无效或无权限');
      if (response.status < 200 || response.status >= 300) throw new Error(redactError(`TMDB 请求失败 (${response.status}): ${response.responseText || ''}`));
      try { return JSON.parse(response.responseText); } catch { throw new Error('TMDB 返回了无效 JSON'); }
    }

    async function searchTv(query, year) {
      const data = await get('/search/tv', { query, year, include_adult: false, page: 1 });
      if (!Array.isArray(data.results)) throw new Error('TMDB 搜索响应缺少 results');
      return data.results.map((item) => ({
        id: item.id, name: item.name || '', originalName: item.original_name || '',
        firstAirDate: item.first_air_date || '', originCountry: item.origin_country || [],
        posterPath: item.poster_path || null,
        tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`
      })).filter((item) => Number.isInteger(item.id));
    }

    async function getSeason(seriesId, seasonNumber, requestedLanguage = language) {
      const data = await get(`/tv/${seriesId}/season/${seasonNumber}`, { language: requestedLanguage });
      if (!Array.isArray(data.episodes)) throw new Error('TMDB 季响应缺少 episodes');
      return data.episodes.map((item) => ({
        id: item.id, seasonNumber: item.season_number, episodeNumber: item.episode_number,
        name: item.name || '', alternateNames: [], airDate: item.air_date || null,
        overview: item.overview || '', episodeType: item.episode_type || '',
        tmdbUrl: `https://www.themoviedb.org/tv/${seriesId}/season/${seasonNumber}/episode/${item.episode_number}`
      })).filter((item) => Number.isInteger(item.id) && Number.isInteger(item.episodeNumber));
    }

    async function getSeasonWithFallback(seriesId, seasonNumber) {
      const primary = await getSeason(seriesId, seasonNumber, language);
      if (language === 'en-US') return primary;
      let fallback = [];
      try { fallback = await getSeason(seriesId, seasonNumber, 'en-US'); } catch { return primary; }
      const fallbackByEpisode = new Map(fallback.map((episode) => [episode.episodeNumber, episode]));
      return primary.map((episode) => ({
        ...episode,
        alternateNames: [fallbackByEpisode.get(episode.episodeNumber)?.name].filter((name) => name && name !== episode.name)
      }));
    }

    async function loadSeasons(seriesId, seasonNumber) {
      const [regular, specials] = await Promise.all([
        getSeasonWithFallback(seriesId, seasonNumber),
        seasonNumber === 0 ? Promise.resolve([]) : getSeasonWithFallback(seriesId, 0).catch(() => [])
      ]);
      return { regular, specials };
    }
    return { searchTv, getSeason, getSeasonWithFallback, loadSeasons };
  }

  Object.assign(globalThis.GTR, {
    TOKEN_KEY, LEGACY_TOKEN_KEY, getTmdbToken, setTmdbToken, clearTmdbToken, cacheSeries, getCachedSeries, redactError, createTmdbClient
  });
})();

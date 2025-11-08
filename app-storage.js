// app-storage.js  (자동 재연결 포함 완전판)
(() => {
  // ----- 전역 상태 & 로컬 백업 -----
  window.__STATE__ = { sites: [] };
  const LS_KEY = 'ai-dashboard-sites';

  // ----- DOM -----
  const $ = (s) => document.querySelector(s);
  const elPick   = $('#pick-file');
  const elOpen   = $('#open-file');
  const elSave   = $('#save-now');
  const elExport = $('#export-data');
  const elImport = $('#import-data');
  const elStatus = $('#storage-status');

  // ----- File System Access -----
  let fileHandle = null;
  const supportsFS = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

  const setStatus = (m) => { if (elStatus) elStatus.textContent = m || ''; };

  // ===== IndexedDB: 파일 핸들 영구 저장 =====
  const DB_NAME = 'ai-dashboard-db';
  const STORE   = 'handles';
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = () => reject(req.error);
    });
  }
  async function saveHandleToDB(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, 'main');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function loadHandleFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get('main');
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror   = () => reject(rq.error);
    });
  }

  // ===== 파일 저장/열기 =====
  async function saveToFile() {
    if (!fileHandle) { alert('먼저 "파일 연결" 또는 "열기"를 해주세요.'); return; }
    try {
      // 권한 확인/요청
      let perm = await fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') perm = await fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { setStatus('저장 실패(권한 거부)'); return; }

      const writable = await fileHandle.createWritable();
      await writable.write(new Blob([JSON.stringify(window.__STATE__, null, 2)], { type: 'application/json' }));
      await writable.close();
      setStatus('저장 완료');
    } catch (err) {
      console.error('saveToFile error:', err);
      alert('저장 중 오류가 발생했어요. 다운로드/문서 같은 일반 폴더로 다시 시도해 주세요.');
      setStatus('저장 실패');
    }
  }

  async function pickFile() {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: 'ai-dashboard.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      await saveHandleToDB(fileHandle);
      setStatus('파일 연결됨');
      await saveToFile(); // 초기 저장
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('pickFile error:', err);
        alert('파일을 만들 수 없어요. 다른 폴더로 다시 시도해 주세요.');
      }
    }
  }

  async function openFile() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      fileHandle = handle;
      await saveHandleToDB(fileHandle);
      const text = await (await fileHandle.getFile()).text();
      try { window.__STATE__ = JSON.parse(text) || { sites: [] }; }
      catch { window.__STATE__ = { sites: [] }; }
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
      setStatus('파일 연결됨');
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('openFile error:', err);
        alert('파일을 열 수 없어요. 다른 파일로 다시 시도해 주세요.');
      }
    }
  }

  // ===== 초기 로드: 로컬 백업 + 자동 재연결 =====
  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      window.__STATE__ = { sites: Array.isArray(arr) ? arr : [] };
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
      setStatus(supportsFS ? '로컬 백업 로드됨(파일 미연결)' : '로컬 백업 로드됨');
    } catch { window.__STATE__ = { sites: [] }; }
  }

  async function tryAutoReconnect() {
    if (!supportsFS) return;
    try {
      const saved = await loadHandleFromDB();
      if (!saved) return; // 저장된 핸들이 없음
      // 권한 확인/요청
      let perm = await saved.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') perm = await saved.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return; // 사용자가 거부
      fileHandle = saved;
      const file = await fileHandle.getFile();
      const text = await file.text();
      try { window.__STATE__ = JSON.parse(text) || { sites: [] }; }
      catch { window.__STATE__ = { sites: [] }; }
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
      setStatus('파일 자동 연결됨');
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
    } catch (err) {
      console.warn('자동 재연결 실패:', err);
    }
  }

  // ===== 내보내기/가져오기 =====
  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(window.__STATE__, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ai-dashboard-backup.json';
      a.click();
    } catch (err) {
      console.error('exportData error:', err);
      alert('내보내기 중 오류가 발생했어요.');
    }
  }

  async function importData(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const obj = JSON.parse(await file.text());
      window.__STATE__ = { sites: obj.sites || [] };
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites));
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
      setStatus('가져오기 완료');
      if (fileHandle) await saveToFile();
    } catch (err) {
      console.error('importData error:', err);
      alert('가져오기 중 오류가 발생했어요. JSON 형식을 확인해 주세요.');
    } finally {
      if (e?.target) e.target.value = '';
    }
  }

  // ===== 외부 저장 훅 =====
  window.__saveState__ = async function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
      if (fileHandle) await saveToFile();
    } catch (err) {
      console.error('__saveState__ error:', err);
      setStatus('저장 실패');
    }
  };

  // ===== 이벤트 바인딩 & 초기화 =====
  if (elExport) elExport.addEventListener('click', exportData);
  if (elImport) elImport.addEventListener('change', importData);

  if (supportsFS) {
    if (elPick) elPick.addEventListener('click', pickFile);
    if (elOpen) elOpen.addEventListener('click', openFile);
    if (elSave) elSave.addEventListener('click', () => window.__saveState__());
  } else {
    if (elPick) elPick.disabled = true;
    if (elOpen) elOpen.disabled = true;
    if (elSave) elSave.disabled = true;
    setStatus('이 브라우저는 파일 직접 저장 미지원(내보내기/가져오기 사용)');
  }

  // 초기 로드 + 자동 재연결 시도
  loadFromLocalStorage();
  tryAutoReconnect();
})();

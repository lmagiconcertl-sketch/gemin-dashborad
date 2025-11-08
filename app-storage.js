// app-storage.js
(() => {
  window.__STATE__ = { sites: [] };               // 전역 상태
  const LS_KEY = 'ai-dashboard-sites';            // 로컬스토리지 백업 키
  const $ = (s) => document.querySelector(s);

  const elPick = $('#pick-file');
  const elOpen = $('#open-file');
  const elSave = $('#save-now');
  const elExport = $('#export-data');
  const elImport = $('#import-data');
  const elStatus = $('#storage-status');

  let fileHandle = null;
  const supportsFS = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
  const setStatus = (m) => elStatus && (elStatus.textContent = m || '');

  async function saveToFile() {
    if (!fileHandle) { alert('먼저 "파일 연결" 또는 "열기"를 해주세요.'); return; }
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(window.__STATE__, null, 2)], { type: 'application/json' }));
    await writable.close();
    setStatus('저장 완료');
  }

  async function pickFile() {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'ai-dashboard.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    await saveToFile(); // 새 파일 초기화
  }

  async function openFile() {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    fileHandle = handle;
    const text = await (await fileHandle.getFile()).text();
    try { window.__STATE__ = JSON.parse(text) || { sites: [] }; }
    catch { window.__STATE__ = { sites: [] }; }
    localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
    setStatus('파일 연결됨');
    if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      window.__STATE__ = { sites: Array.isArray(arr) ? arr : [] };
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
      setStatus(supportsFS ? '로컬 백업 로드됨(파일 미연결)' : '로컬 백업 로드됨');
    } catch { window.__STATE__ = { sites: [] }; }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(window.__STATE__, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ai-dashboard-backup.json';
    a.click();
  }
  async function importData(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const obj = JSON.parse(await f.text());
    window.__STATE__ = { sites: obj.sites || [] };
    localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites));
    if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
    setStatus('가져오기 완료');
    if (fileHandle) await saveToFile();
  }

  window.__saveState__ = async function () {
    localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
    if (fileHandle) await saveToFile();
  };

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

  loadFromLocalStorage();
})();

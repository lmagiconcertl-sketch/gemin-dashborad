// app-storage.js  (전체 교체본)
(() => {
  // 전역 상태(초기값)
  window.__STATE__ = { sites: [] };

  // 로컬스토리지(백업/초기 로드용) 키
  const LS_KEY = 'ai-dashboard-sites';

  // 엘리먼트 헬퍼
  const $ = (s) => document.querySelector(s);

  // 버튼/표시 요소
  const elPick   = $('#pick-file');
  const elOpen   = $('#open-file');
  const elSave   = $('#save-now');
  const elExport = $('#export-data');
  const elImport = $('#import-data');
  const elStatus = $('#storage-status');

  // 파일 핸들
  let fileHandle = null;

  // 브라우저 지원 여부
  const supportsFS = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

  // 상태 표시
  function setStatus(msg) {
    if (elStatus) elStatus.textContent = msg || '';
  }

  // 파일로 저장(에러 처리 포함)
  async function saveToFile() {
    if (!fileHandle) {
      alert('먼저 "파일 연결" 또는 "열기"를 해주세요.');
      return;
    }
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(
        new Blob([JSON.stringify(window.__STATE__, null, 2)], { type: 'application/json' })
      );
      await writable.close();
      setStatus('저장 완료');
    } catch (err) {
      console.error('saveToFile error:', err);
      alert('저장 중 오류가 발생했어요. 다운로드/문서 같은 일반 폴더로 다시 시도해 주세요.');
      setStatus('저장 실패');
    }
  }

  // 새 저장 파일 선택(최초 1회)
  async function pickFile() {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: 'ai-dashboard.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      setStatus('파일 연결됨');
      await saveToFile(); // 초기 저장(빈 내용이라도 1회 기록)
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('pickFile error:', err);
        alert('파일을 만들 수 없어요. 다른 폴더로 다시 시도해 주세요.');
      }
    }
  }

  // 기존 파일 열기(재연결)
  async function openFile() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      fileHandle = handle;
      const file = await fileHandle.getFile();
      const text = await file.text();
      try {
        window.__STATE__ = JSON.parse(text) || { sites: [] };
      } catch {
        window.__STATE__ = { sites: [] };
      }
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
      setStatus('파일 연결됨');
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('openFile error:', err);
        alert('파일을 열 수 없어요. 다른 파일로 다시 시도해 주세요.');
      }
    }
  }

  // 로컬스토리지에서 초기 로드(백업/최초 진입용)
  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      window.__STATE__ = { sites: Array.isArray(arr) ? arr : [] };
      if (typeof window.renderSites === 'function') window.renderSites(window.__STATE__);
      setStatus(supportsFS ? '로컬 백업 로드됨(파일 미연결)' : '로컬 백업 로드됨');
    } catch {
      window.__STATE__ = { sites: [] };
    }
  }

  // 내보내기/가져오기(브라우저 호환)
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
      // 같은 파일을 다시 선택해도 change 이벤트가 뜨도록 입력값 초기화
      if (e && e.target) e.target.value = '';
    }
  }

  // 외부에서 저장 트리거할 수 있는 훅
  window.__saveState__ = async function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(window.__STATE__.sites || []));
      if (fileHandle) await saveToFile();
    } catch (err) {
      console.error('__saveState__ error:', err);
      setStatus('저장 실패');
    }
  };

  // 이벤트 바인딩
  if (elExport) elExport.addEventListener('click', exportData);
  if (elImport) elImport.addEventListener('change', importData);

  if (supportsFS) {
    if (elPick) elPick.addEventListener('click', pickFile);
    if (elOpen) elOpen.addEventListener('click', openFile);
    if (elSave) elSave.addEventListener('click', () => window.__saveState__());
  } else {
    // 사파리/모바일 등: 파일 직접 저장 미지원
    if (elPick) elPick.disabled = true;
    if (elOpen) elOpen.disabled = true;
    if (elSave) elSave.disabled = true;
    setStatus('이 브라우저는 파일 직접 저장 미지원(내보내기/가져오기 사용)');
  }

  // 초기 로드
  loadFromLocalStorage();
})();

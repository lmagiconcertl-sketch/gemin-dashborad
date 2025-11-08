// storage.js
(() => {
  const statusEl = () => document.getElementById('status');

  // ----- IndexedDB: file handle 저장 -----
  const DB = 'ai-dash-db';
  const STORE = 'handles';
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function putHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, 'main');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  async function getHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get('main');
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    });
  }

  // ----- 전역 상태 -----
  const LS_KEY = 'ai-dash-backup'; // 로컬스토리지 백업
  const storage = {
    _handle: null,
    _state: { sites: [], subscriptions: [] },
    _listeners: new Set(),

    getState() { return this._state; },
    setState(next) {
      this._state = next;
      // 로컬 백업
      try { localStorage.setItem(LS_KEY, JSON.stringify(this._state)); } catch {}
      // 상태 메시지 X (조용히)
      this._listeners.forEach(fn => fn(this._state));
    },

    onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },

    async _ensurePermission() {
      if (!this._handle) return false;
      let p = await this._handle.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted') p = await this._handle.requestPermission({ mode: 'readwrite' });
      return p === 'granted';
    },

    async save() {
      if (!this._handle) { statusEl()?.textContent = '파일 미연결(로컬 백업만 저장됨)'; return; }
      const ok = await this._ensurePermission();
      if (!ok) { statusEl()?.textContent = '저장 실패(권한 거부)'; return; }
      try {
        const w = await this._handle.createWritable();
        await w.write(new Blob([JSON.stringify(this._state, null, 2)], { type: 'application/json' }));
        await w.close();
        statusEl()?.textContent = '저장 완료';
      } catch (err) {
        console.error('save error', err);
        alert('저장 오류: 다른 폴더로 다시 시도해 주세요.');
        statusEl()?.textContent = '저장 실패';
      }
    },

    async connectNew() {
      if (!('showSaveFilePicker' in window)) {
        alert('이 브라우저는 파일 직접 저장을 지원하지 않아요. 내보내기/가져오기를 사용해 주세요.');
        return;
      }
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'ai-dashboard.json',
          types: [{ description:'JSON', accept: {'application/json':['.json']} }]
        });
        this._handle = handle;
        await putHandle(handle);
        statusEl()?.textContent = '파일 연결됨';
        await this.save();
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error('connectNew error', e);
          alert('파일 생성 실패. 다운로드/문서 폴더로 다시 시도해 주세요.');
        }
      }
    },

    async openExisting() {
      if (!('showOpenFilePicker' in window)) {
        alert('이 브라우저는 파일 열기를 지원하지 않아요.');
        return;
      }
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description:'JSON', accept: {'application/json':['.json']} }]
        });
        this._handle = handle;
        await putHandle(handle);
        const text = await (await handle.getFile()).text();
        const data = JSON.parse(text || '{}');
        // sites/subscriptions 기본 보정
        this._state = {
          sites: Array.isArray(data.sites) ? data.sites : [],
          subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : []
        };
        try { localStorage.setItem(LS_KEY, JSON.stringify(this._state)); } catch {}
        statusEl()?.textContent = '파일 연결됨';
        this._listeners.forEach(fn => fn(this._state));
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error('openExisting error', e);
          alert('파일을 열 수 없어요.');
        }
      }
    },

    exportJSON() {
      const blob = new Blob([JSON.stringify(this._state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ai-dashboard-backup.json';
      a.click();
    },

    async importJSON(file) {
      const text = await file.text();
      const data = JSON.parse(text || '{}');
      this._state = {
        sites: Array.isArray(data.sites) ? data.sites : [],
        subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : []
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(this._state)); } catch {}
      this._listeners.forEach(fn => fn(this._state));
      statusEl()?.textContent = '가져오기 완료';
      await this.save(); // 파일 연결되어 있으면 디스크에도 기록
    },

    async init() {
      // 로컬 백업 우선 로드
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) this._state = JSON.parse(raw);
      } catch {}
      this._listeners.forEach(fn => fn(this._state));
      // 자동 재연결
      if ('showOpenFilePicker' in window) {
        try {
          const saved = await getHandle();
          if (saved) {
            this._handle = saved;
            // 권한 가능하면 파일에서 최신 불러오기
            const ok = await this._ensurePermission();
            if (ok) {
              const text = await (await this._handle.getFile()).text();
              const data = JSON.parse(text || '{}');
              this._state = {
                sites: Array.isArray(data.sites) ? data.sites : [],
                subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : []
              };
              try { localStorage.setItem(LS_KEY, JSON.stringify(this._state)); } catch {}
              statusEl()?.textContent = '파일 자동 연결됨';
              this._listeners.forEach(fn => fn(this._state));
            } else {
              statusEl()?.textContent = '로컬 백업 로드됨(파일 미연결)';
            }
          } else {
            statusEl()?.textContent = '로컬 백업 로드됨(파일 미연결)';
          }
        } catch {
          statusEl()?.textContent = '로컬 백업 로드됨(파일 미연결)';
        }
      } else {
        statusEl()?.textContent = '파일 직접 저장 미지원(내보내기/가져오기 사용)';
      }
    }
  };

  // 전역 노출
  window.AppStorage = storage;
})();

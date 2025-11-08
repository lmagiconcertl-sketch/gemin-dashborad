// script.js  — 파일 저장 연동판
document.addEventListener('DOMContentLoaded', () => {
  // ===== 상수/공통 =====
  const USD_TO_KRW_RATE = 1380;

  // 공통 요소
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  const modal = document.getElementById('edit-modal');
  const closeModalBtn = document.querySelector('.close-btn');
  const editForm = document.getElementById('edit-form');

  // 바로가기(사이트) 요소
  const shortcutForm = document.getElementById('shortcut-form');
  const shortcutContainer = document.getElementById('shortcut-container');

  // 구독 관리 요소
  const subscriptionForm = document.getElementById('subscription-form');
  const subscriptionList = document.getElementById('subscription-list');
  const subscriptionTotals = document.getElementById('subscription-totals');

  // ===== 구독 데이터(로컬스토리지 유지) =====
  const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
  let subscriptions = JSON.parse(localStorage.getItem('subscriptions_v4')) || [];

  const formatKRW = (amount) => `₩${Math.round(amount).toLocaleString('ko-KR')}`;
  const formatUSD = (amount) => `$${amount.toFixed(2)}`;

  // ===== 사이트 데이터(파일 연동) =====
  // app-storage.js가 초기화한 전역 상태 사용:
  // window.__STATE__ = { sites: [] }
  // 없다면 안전하게 기본값 부여
  if (!window.__STATE__) window.__STATE__ = { sites: [] };

  // 카테고리 표기
  const CATEGORY_LABEL = {
    conversationalAI: '대화형 AI',
    generativeAI: '생성형 AI',
    otherSites: '그 외 사이트'
  };

  // 초기 기본값이 필요하면(파일/로컬 모두 비었을 때) 한 번만 주입
  if (!Array.isArray(window.__STATE__.sites) || window.__STATE__.sites.length === 0) {
    // 단, 파일이 이미 연결되어 있고 데이터가 있으면 app-storage가 불러오므로 여기서 굳이 넣지 않아도 됨.
    // 필요 시 아래 주석 해제:
    // window.__STATE__.sites = [
    //   { name: 'ChatGPT', url: 'https://chat.openai.com/', category: 'conversationalAI' },
    //   { name: 'Midjourney', url: 'https://www.midjourney.com/', category: 'generativeAI' },
    // ];
  }

  // ===== 유틸: 카테고리 별로 묶으면서 전역 인덱스 보존 =====
  function groupSitesWithIndex() {
    const grouped = {
      conversationalAI: [],
      generativeAI: [],
      otherSites: []
    };
    (window.__STATE__.sites || []).forEach((site, gidx) => {
      const cat = site?.category || 'otherSites';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ gidx, site });
    });
    return grouped;
  }

  // ===== 사이트 렌더 함수 (app-storage.js가 호출할 수 있게 전역에 노출) =====
  function renderSites(stateObj) {
    const state = stateObj || window.__STATE__ || { sites: [] };
    if (!state.sites) state.sites = [];
    const grouped = groupSitesWithIndex();

    shortcutContainer.innerHTML = '';
    ['conversationalAI', 'generativeAI', 'otherSites'].forEach((catKey) => {
      const items = grouped[catKey];
      if (!items || items.length === 0) return;

      const card = document.createElement('div');
      card.className = 'card shortcut-category';

      const itemsHTML = items.map(({ gidx, site }) => {
        let iconUrl = '';
        try {
          const domain = new URL(site.url).hostname;
          iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
          iconUrl = '';
        }
        const safeName = site.name || '';
        const safeUrl = site.url || '#';
        return `
          <div class="shortcut-item">
            <a href="${safeUrl}" target="_blank" rel="noopener">
              ${iconUrl ? `<img src="${iconUrl}" alt="${safeName}">` : ''}
              <span>${safeName}</span>
            </a>
            <div class="item-actions">
              <button class="action-btn edit-btn" data-type="shortcut" data-gidx="${gidx}" title="수정">✏️</button>
              <button class="action-btn delete-btn-icon" data-type="shortcut" data-gidx="${gidx}" title="삭제">X</button>
            </div>
          </div>
        `;
      }).join('');

      card.innerHTML = `<h3>${CATEGORY_LABEL[catKey] || catKey}</h3><div class="shortcut-grid">${itemsHTML}</div>`;
      shortcutContainer.appendChild(card);
    });
  }
  // 전역 노출 (app-storage.js가 호출)
  window.renderSites = renderSites;

  // ===== 구독 렌더 =====
  function renderSubscriptionsAndTotals() {
    subscriptionList.innerHTML = '';
    let totalMonthlyKRW = 0;

    subscriptions.forEach((sub, index) => {
      const monthlyKRW = (sub.type === 'monthly')
        ? ((sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE)
        : (((sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE) / 12);

      totalMonthlyKRW += monthlyKRW;

      // 갱신일 계산
      const lastPaymentDate = new Date(sub.date + 'T00:00:00');
      const nextRenewalDate = new Date(lastPaymentDate);
      if (sub.type === 'monthly') nextRenewalDate.setMonth(lastPaymentDate.getMonth() + 1);
      else nextRenewalDate.setFullYear(lastPaymentDate.getFullYear() + 1);

      const today = new Date(); today.setHours(0,0,0,0);
      const diffDays = Math.ceil((nextRenewalDate - today) / (1000 * 60 * 60 * 24));
      let renewalStatusHTML = `<span>${nextRenewalDate.toLocaleDateString('ko-KR')}</span>`;
      if (diffDays >= 0 && diffDays <= 7) {
        renewalStatusHTML += `<span class="renewal-imminent">${diffDays}일 후 갱신 임박!</span>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${sub.name}<span>${sub.type === 'monthly' ? '월간' : '연간'} / ${sub.currency}</span></td>
        <td>${formatKRW(monthlyKRW)}<span>${formatUSD(monthlyKRW / USD_TO_KRW_RATE)}</span></td>
        <td>${renewalStatusHTML}</td>
        <td class="actions">
          <button class="edit-btn" data-type="subscription" data-index="${index}">수정</button>
          <button class="delete-btn" data-type="subscription" data-index="${index}">삭제</button>
        </td>`;
      subscriptionList.appendChild(row);
    });

    const totalMonthlyUSD = totalMonthlyKRW / USD_TO_KRW_RATE;
    subscriptionTotals.innerHTML = `
      <div class="total-box"><h4>월간 총 구독료</h4><div class="price-krw">${formatKRW(totalMonthlyKRW)}</div><div class="price-usd">${formatUSD(totalMonthlyUSD)}</div></div>
      <div class="total-box"><h4>연간 총 구독료</h4><div class="price-krw">${formatKRW(totalMonthlyKRW * 12)}</div><div class="price-usd">${formatUSD(totalMonthlyUSD * 12)}</div></div>`;
  }

  // ===== 모달 =====
  function openEditModal(type, index, categoryOrGidx) {
    let content = '';
    if (type === 'shortcut') {
      const gidx = Number(categoryOrGidx);
      const item = window.__STATE__.sites[gidx];
      content = `
        <input type="hidden" id="edit-type" value="shortcut">
        <input type="hidden" id="edit-gidx" value="${gidx}">
        <label for="edit-shortcut-name">사이트 이름</label>
        <input type="text" id="edit-shortcut-name" value="${item?.name || ''}" required>
        <label for="edit-shortcut-url">사이트 주소</label>
        <input type="url" id="edit-shortcut-url" value="${item?.url || ''}" required>
        <label for="edit-shortcut-cat">카테고리</label>
        <select id="edit-shortcut-cat">
          <option value="conversationalAI" ${(item?.category === 'conversationalAI') ? 'selected' : ''}>대화형 AI</option>
          <option value="generativeAI" ${(item?.category === 'generativeAI') ? 'selected' : ''}>생성형 AI</option>
          <option value="otherSites" ${(item?.category === 'otherSites') ? 'selected' : ''}>그 외 사이트</option>
        </select>
        <button type="submit">저장하기</button>`;
    } else if (type === 'subscription') {
      const idx = Number(index);
      const s = subscriptions[idx];
      content = `
        <input type="hidden" id="edit-type" value="subscription">
        <input type="hidden" id="edit-index" value="${idx}">
        <label for="edit-service-name">서비스 이름</label>
        <input type="text" id="edit-service-name" value="${s.name}" required>
        <label for="edit-service-cost">구독료</label>
        <input type="number" id="edit-service-cost" value="${s.cost}" step="any" required>
        <label for="edit-service-currency">통화</label>
        <select id="edit-service-currency">
          <option value="KRW" ${s.currency === 'KRW' ? 'selected' : ''}>KRW (₩)</option>
          <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
        </select>
        <label for="edit-service-type">구분</label>
        <select id="edit-service-type">
          <option value="monthly" ${s.type === 'monthly' ? 'selected' : ''}>월간</option>
          <option value="yearly" ${s.type === 'yearly' ? 'selected' : ''}>연간</option>
        </select>
        <label for="edit-service-date">마지막 결제일</label>
        <input type="date" id="edit-service-date" value="${s.date}" required>
        <button type="submit">저장하기</button>`;
    }
    editForm.innerHTML = content;
    modal.style.display = 'block';
  }

  // ===== 탭 전환 =====
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  }));

  // ===== 사이트 추가 =====
  shortcutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const categorySel = document.getElementById('shortcut-category');
    const nameInput   = document.getElementById('shortcut-name');
    const urlInput    = document.getElementById('shortcut-url');

    const category = (categorySel?.value || '').trim();
    const name = (nameInput?.value || '').trim();
    const url  = (urlInput?.value  || '').trim();

    if (!category) { alert('카테고리를 선택하세요.'); return; }
    if (!name || !url) { alert('이름과 주소를 입력하세요.'); return; }

    // 파일/로컬 동시 저장 + 즉시 렌더 (app-storage.js 제공)
    if (typeof window.addSiteToState === 'function') {
      window.addSiteToState({ name, url, category });
    } else {
      // 안전장치(이상 시 로컬로만)
      window.__STATE__.sites.push({ name, url, category });
      if (typeof window.__saveState__ === 'function') window.__saveState__();
      renderSites();
    }

    shortcutForm.reset();
  });

  // ===== 사이트/구독 수정/삭제 위임 =====
  document.body.addEventListener('click', (e) => {
    const target = e.target;

    // 사이트 편집
    if (target.closest('.edit-btn')) {
      const btn = target.closest('.edit-btn');
      if (btn.dataset.type === 'shortcut') {
        openEditModal('shortcut', null, btn.dataset.gidx);
      } else if (btn.dataset.type === 'subscription') {
        openEditModal('subscription', btn.dataset.index);
      }
    }

    // 삭제(사이트/구독)
    if (target.closest('.delete-btn, .delete-btn-icon')) {
      if (!confirm('정말로 삭제하시겠습니까?')) return;
      const btn = target.closest('.delete-btn, .delete-btn-icon');

      if (btn.dataset.type === 'shortcut') {
        const gidx = Number(btn.dataset.gidx);
        if (!Number.isNaN(gidx)) {
          window.__STATE__.sites.splice(gidx, 1);
          if (typeof window.__saveState__ === 'function') window.__saveState__();
          renderSites();
        }
      } else if (btn.dataset.type === 'subscription') {
        const idx = Number(btn.dataset.index);
        if (!Number.isNaN(idx)) {
          subscriptions.splice(idx, 1);
          saveData('subscriptions_v4', subscriptions);
          renderSubscriptionsAndTotals();
        }
      }
    }
  });

  // ===== 모달 닫기 =====
  closeModalBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  // ===== 모달 저장 처리 =====
  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('edit-type').value;

    if (type === 'shortcut') {
      const gidx = Number(document.getElementById('edit-gidx').value);
      const name = document.getElementById('edit-shortcut-name').value.trim();
      const url  = document.getElementById('edit-shortcut-url').value.trim();
      const cat  = document.getElementById('edit-shortcut-cat').value;

      if (!Number.isNaN(gidx) && window.__STATE__.sites[gidx]) {
        window.__STATE__.sites[gidx] = { name, url, category: cat };
        if (typeof window.__saveState__ === 'function') window.__saveState__();
        renderSites();
      }
    } else if (type === 'subscription') {
      const index = Number(document.getElementById('edit-index').value);
      subscriptions[index] = {
        name: document.getElementById('edit-service-name').value,
        cost: parseFloat(document.getElementById('edit-service-cost').value),
        currency: document.getElementById('edit-service-currency').value,
        type: document.getElementById('edit-service-type').value,
        date: document.getElementById('edit-service-date').value
      };
      saveData('subscriptions_v4', subscriptions);
      renderSubscriptionsAndTotals();
    }
    modal.style.display = 'none';
  });

  // ===== 초기 렌더 =====
  renderSites(window.__STATE__);
  renderSubscriptionsAndTotals();
});

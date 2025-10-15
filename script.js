document.addEventListener('DOMContentLoaded', () => {
    // --- 환율 정보 (필요시 수정) ---
    const USD_TO_KRW_RATE = 1380;

    // --- 공통 요소 ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const modal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const editForm = document.getElementById('edit-form');

    // --- 바로 가기 관련 요소 ---
    const shortcutForm = document.getElementById('shortcut-form');
    const shortcutContainer = document.getElementById('shortcut-container');

    // --- 구독 관리 관련 요소 ---
    const subscriptionForm = document.getElementById('subscription-form');
    const subscriptionList = document.getElementById('subscription-list');
    const subscriptionTotals = document.getElementById('subscription-totals');

    // --- 데이터 로드 ---
    const initialShortcuts = {
        conversationalAI: [{ name: 'ChatGPT', url: 'https://chat.openai.com/' }, { name: 'Gemini', url: 'https://gemini.google.com/' }],
        generativeAI: [{ name: 'Midjourney', url: 'https://www.midjourney.com/' }, { name: 'Suno', url: 'https://suno.ai/' }],
        otherSites: [{ name: '어도비스톡', url: 'https://stock.adobe.com/kr' }]
    };
    let shortcuts = JSON.parse(localStorage.getItem('shortcuts_v3')) || initialShortcuts;
    let subscriptions = JSON.parse(localStorage.getItem('subscriptions_v3')) || [];

    // --- 데이터 저장 ---
    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    // --- 유틸리티 함수 ---
    const formatKRW = (amount) => `₩${Math.round(amount).toLocaleString('ko-KR')}`;
    const formatUSD = (amount) => `$${amount.toFixed(2)}`;

    // --- 렌더링 함수 ---
    function renderShortcuts() {
        shortcutContainer.innerHTML = '';
        const categoryNames = { conversationalAI: '대화형 AI', generativeAI: '생성형 AI', otherSites: '그 외 사이트' };
        for (const category in shortcuts) {
            if (Object.keys(shortcuts[category]).length === 0) continue;
            const categoryCard = document.createElement('div');
            categoryCard.className = 'card shortcut-category';
            let itemsHTML = shortcuts[category].map((item, index) => {
                const domain = new URL(item.url).hostname;
                const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                return `
                    <div class="shortcut-item">
                        <a href="${item.url}" target="_blank">
                            <img src="${iconUrl}" alt="${item.name}">
                            <span>${item.name}</span>
                        </a>
                        <div class="item-actions">
                            <button class="action-btn edit-btn" data-type="shortcut" data-category="${category}" data-index="${index}" title="수정">✏️</button>
                            <button class="action-btn delete-btn-icon" data-type="shortcut" data-category="${category}" data-index="${index}" title="삭제">X</button>
                        </div>
                    </div>`;
            }).join('');
            categoryCard.innerHTML = `<h3>${categoryNames[category]}</h3><div class="shortcut-grid">${itemsHTML}</div>`;
            shortcutContainer.appendChild(categoryCard);
        }
    }

    function renderSubscriptionsAndTotals() {
        subscriptionList.innerHTML = '';
        let totalMonthlyKRW = 0;
        subscriptions.forEach((sub, index) => {
            let monthlyKRW = (sub.type === 'monthly') ? ((sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE) : ((sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE) / 12;
            totalMonthlyKRW += monthlyKRW;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sub.name}</td>
                <td>${sub.type === 'monthly' ? '월간' : '연간'}</td>
                <td>${formatKRW(monthlyKRW)}<span>${formatUSD(monthlyKRW / USD_TO_KRW_RATE)}</span></td>
                <td>${formatKRW(monthlyKRW * 12)}<span>${formatUSD(monthlyKRW * 12 / USD_TO_KRW_RATE)}</span></td>
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
    
    // --- 모달 관리 함수 ---
    function openEditModal(type, index, category) {
        let content = '';
        if (type === 'shortcut') {
            const item = shortcuts[category][index];
            content = `
                <input type="hidden" id="edit-type" value="shortcut">
                <input type="hidden" id="edit-category" value="${category}">
                <input type="hidden" id="edit-index" value="${index}">
                <label for="edit-shortcut-name">사이트 이름</label><input type="text" id="edit-shortcut-name" value="${item.name}" required>
                <label for="edit-shortcut-url">사이트 주소</label><input type="url" id="edit-shortcut-url" value="${item.url}" required>
                <button type="submit">저장하기</button>`;
        } else if (type === 'subscription') {
            const item = subscriptions[index];
            content = `
                <input type="hidden" id="edit-type" value="subscription">
                <input type="hidden" id="edit-index" value="${index}">
                <label for="edit-service-name">서비스 이름</label><input type="text" id="edit-service-name" value="${item.name}" required>
                <label for="edit-service-cost">구독료</label><input type="number" id="edit-service-cost" value="${item.cost}" step="any" required>
                <label for="edit-service-currency">통화</label><select id="edit-service-currency">
                    <option value="KRW" ${item.currency === 'KRW' ? 'selected' : ''}>KRW (₩)</option>
                    <option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                </select>
                <label for="edit-service-type">구분</label><select id="edit-service-type">
                    <option value="monthly" ${item.type === 'monthly' ? 'selected' : ''}>월간</option>
                    <option value="yearly" ${item.type === 'yearly' ? 'selected' : ''}>연간</option>
                </select>
                <button type="submit">저장하기</button>`;
        }
        editForm.innerHTML = content;
        modal.style.display = 'block';
    }
    
    // --- 이벤트 리스너 ---
    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    }));

    shortcutForm.addEventListener('submit', e => {
        e.preventDefault();
        const category = document.getElementById('shortcut-category').value;
        if (!category) { alert('카테고리를 선택하세요.'); return; }
        shortcuts[category].push({ name: document.getElementById('shortcut-name').value, url: document.getElementById('shortcut-url').value });
        saveData('shortcuts_v3', shortcuts);
        renderShortcuts();
        shortcutForm.reset();
    });

    subscriptionForm.addEventListener('submit', e => {
        e.preventDefault();
        subscriptions.push({
            name: document.getElementById('service-name').value, cost: parseFloat(document.getElementById('service-cost').value),
            currency: document.getElementById('service-currency').value, type: document.getElementById('service-type').value,
        });
        saveData('subscriptions_v3', subscriptions);
        renderSubscriptionsAndTotals();
        subscriptionForm.reset();
    });
    
    document.body.addEventListener('click', e => {
        const target = e.target;
        const type = target.dataset.type;
        const index = target.dataset.index;
        const category = target.dataset.category;

        if (target.classList.contains('edit-btn')) {
            openEditModal(type, index, category);
        }
        if (target.classList.contains('delete-btn') || target.classList.contains('delete-btn-icon')) {
            if (!confirm('정말로 삭제하시겠습니까?')) return;
            if (type === 'shortcut') {
                shortcuts[category].splice(index, 1);
                saveData('shortcuts_v3', shortcuts);
                renderShortcuts();
            } else if (type === 'subscription') {
                subscriptions.splice(index, 1);
                saveData('subscriptions_v3', subscriptions);
                renderSubscriptionsAndTotals();
            }
        }
    });
    
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const type = document.getElementById('edit-type').value;
        const index = document.getElementById('edit-index').value;
        if (type === 'shortcut') {
            const category = document.getElementById('edit-category').value;
            shortcuts[category][index] = { name: document.getElementById('edit-shortcut-name').value, url: document.getElementById('edit-shortcut-url').value };
            saveData('shortcuts_v3', shortcuts);
            renderShortcuts();
        } else if (type === 'subscription') {
            subscriptions[index] = {
                name: document.getElementById('edit-service-name').value, cost: parseFloat(document.getElementById('edit-service-cost').value),
                currency: document.getElementById('edit-service-currency').value, type: document.getElementById('edit-service-type').value
            };
            saveData('subscriptions_v3', subscriptions);
            renderSubscriptionsAndTotals();
        }
        modal.style.display = 'none';
    });

    // --- 초기 렌더링 ---
    renderShortcuts();
    renderSubscriptionsAndTotals();
});

document.addEventListener('DOMContentLoaded', () => {
    // --- 환율 정보 ---
    // 이 값을 현재 환율에 맞게 직접 수정하시면 더 정확해집니다.
    const USD_TO_KRW_RATE = 1380;

    // --- 공통 요소 ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    // --- 바로 가기 관련 요소 ---
    const shortcutForm = document.getElementById('shortcut-form');
    const shortcutContainer = document.getElementById('shortcut-container');

    // --- 구독 관리 관련 요소 ---
    const subscriptionForm = document.getElementById('subscription-form');
    const subscriptionList = document.getElementById('subscription-list');
    const subscriptionTotals = document.getElementById('subscription-totals');

    // --- 데이터 로드 (localStorage) ---
    const initialShortcuts = {
        conversationalAI: [
            { name: 'ChatGPT', url: 'https://chat.openai.com/' },
            { name: 'Gemini', url: 'https://gemini.google.com/' },
        ],
        generativeAI: [
            { name: 'Manus', url: 'https://manus.io/' },
            { name: 'Midjourney', url: 'https://www.midjourney.com/' },
            { name: 'Higgsfield', url: 'https://www.higgsfield.io/' },
            { name: 'Suno', url: 'https://suno.ai/' },
            { name: 'Minimax', url: 'https://api.minimax.chat/' },
        ],
        otherSites: [
            { name: '어도비스톡', url: 'https://stock.adobe.com/kr' },
            { name: '모션엘리먼츠', url: 'https://www.motionelements.com/ko/' },
            { name: '크라우드픽', url: 'https://www.crowdpic.net/' },
        ]
    };

    let shortcuts = JSON.parse(localStorage.getItem('shortcuts_v2')) || initialShortcuts;
    let subscriptions = JSON.parse(localStorage.getItem('subscriptions_v2')) || [];

    // --- 함수 정의 ---

    function saveData(key, data) {
        localStorage.setItem(key, data ? JSON.stringify(data) : null);
    }

    // 통화 포맷팅 함수
    const formatKRW = (amount) => `₩${Math.round(amount).toLocaleString('ko-KR')}`;
    const formatUSD = (amount) => `$${amount.toFixed(2)}`;

    // 바로 가기 렌더링 함수
    function renderShortcuts() {
        shortcutContainer.innerHTML = '';
        const categoryNames = {
            conversationalAI: '대화형 AI',
            generativeAI: '생성형 AI',
            otherSites: '그 외 사이트'
        };

        for (const category in shortcuts) {
            if (shortcuts[category].length > 0) {
                const categoryCard = document.createElement('div');
                categoryCard.className = 'card shortcut-category';
                
                let itemsHTML = '';
                shortcuts[category].forEach((item, index) => {
                    const domain = new URL(item.url).hostname;
                    const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                    itemsHTML += `
                        <a href="${item.url}" target="_blank" class="shortcut-item">
                            <img src="${iconUrl}" alt="${item.name}">
                            <span>${item.name}</span>
                            <button class="item-delete-btn" data-category="${category}" data-index="${index}" title="삭제">X</button>
                        </a>
                    `;
                });

                categoryCard.innerHTML = `
                    <h3>${categoryNames[category]}</h3>
                    <div class="shortcut-grid">${itemsHTML}</div>
                `;
                shortcutContainer.appendChild(categoryCard);
            }
        }
    }

    // 구독 정보 렌더링 및 총계 계산 함수
    function renderSubscriptionsAndTotals() {
        subscriptionList.innerHTML = '';
        let totalMonthlyKRW = 0;

        subscriptions.forEach((sub, index) => {
            let monthlyKRW, monthlyUSD, yearlyKRW, yearlyUSD;

            if (sub.type === 'monthly') {
                monthlyKRW = (sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE;
                monthlyUSD = (sub.currency === 'USD') ? sub.cost : sub.cost / USD_TO_KRW_RATE;
            } else { // yearly
                monthlyKRW = ((sub.currency === 'KRW') ? sub.cost : sub.cost * USD_TO_KRW_RATE) / 12;
                monthlyUSD = ((sub.currency === 'USD') ? sub.cost : sub.cost / USD_TO_KRW_RATE) / 12;
            }
            
            yearlyKRW = monthlyKRW * 12;
            yearlyUSD = monthlyUSD * 12;
            totalMonthlyKRW += monthlyKRW;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sub.name}</td>
                <td>${sub.type === 'monthly' ? '월간' : '연간'}</td>
                <td>${formatKRW(monthlyKRW)}<span>${formatUSD(monthlyUSD)}</span></td>
                <td>${formatKRW(yearlyKRW)}<span>${formatUSD(yearlyUSD)}</span></td>
                <td><button class="delete-btn" data-index="${index}">삭제</button></td>
            `;
            subscriptionList.appendChild(row);
        });

        // 총계 렌더링
        const totalYearlyKRW = totalMonthlyKRW * 12;
        const totalMonthlyUSD = totalMonthlyKRW / USD_TO_KRW_RATE;
        const totalYearlyUSD = totalYearlyKRW / USD_TO_KRW_RATE;

        subscriptionTotals.innerHTML = `
            <div class="total-box">
                <h4>월간 총 구독료</h4>
                <div class="price-krw">${formatKRW(totalMonthlyKRW)}</div>
                <div class="price-usd">${formatUSD(totalMonthlyUSD)}</div>
            </div>
            <div class="total-box">
                <h4>연간 총 구독료</h4>
                <div class="price-krw">${formatKRW(totalYearlyKRW)}</div>
                <div class="price-usd">${formatUSD(totalYearlyUSD)}</div>
            </div>
        `;
    }

    // --- 이벤트 리스너 설정 ---

    // 탭 전환 이벤트
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // 바로 가기 추가
    shortcutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newShortcut = {
            name: document.getElementById('shortcut-name').value,
            url: document.getElementById('shortcut-url').value
        };
        const category = document.getElementById('shortcut-category').value;
        shortcuts[category].push(newShortcut);
        saveData('shortcuts_v2', shortcuts);
        renderShortcuts();
        shortcutForm.reset();
    });

    // 바로 가기 삭제
    shortcutContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('item-delete-btn')) {
            e.preventDefault();
            const category = e.target.dataset.category;
            const index = e.target.dataset.index;
            shortcuts[category].splice(index, 1);
            saveData('shortcuts_v2', shortcuts);
            renderShortcuts();
        }
    });

    // 구독 추가
    subscriptionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSubscription = {
            name: document.getElementById('service-name').value,
            cost: parseFloat(document.getElementById('service-cost').value),
            currency: document.getElementById('service-currency').value,
            type: document.getElementById('service-type').value,
        };
        subscriptions.push(newSubscription);
        saveData('subscriptions_v2', subscriptions);
        renderSubscriptionsAndTotals();
        subscriptionForm.reset();
    });

    // 구독 삭제
    subscriptionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.dataset.index;
            subscriptions.splice(index, 1);
            saveData('subscriptions_v2', subscriptions);
            renderSubscriptionsAndTotals();
        }
    });

    // --- 초기 렌더링 ---
    renderShortcuts();
    renderSubscriptionsAndTotals();
});

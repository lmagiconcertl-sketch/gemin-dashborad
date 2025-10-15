document.addEventListener('DOMContentLoaded', () => {
    // --- 바로 가기 관련 요소 ---
    const shortcutForm = document.getElementById('shortcut-form');
    const shortcutContainer = document.getElementById('shortcut-container');

    // --- 구독 관리 관련 요소 ---
    const subscriptionForm = document.getElementById('subscription-form');
    const subscriptionList = document.getElementById('subscription-list');

    // --- 데이터 로드 (localStorage) ---
    // 처음 방문 시 기본 목록을 제공하고, 그 이후에는 저장된 목록을 불러옵니다.
    const initialShortcuts = [
        { name: 'ChatGPT', url: 'https://chat.openai.com/' },
        { name: 'Gemini', url: 'https://gemini.google.com/' },
        { name: 'Manus', url: 'https://manus.io/' },
        { name: 'Midjourney', url: 'https://www.midjourney.com/' },
        { name: 'Higgsfield', url: 'https://www.higgsfield.io/' },
        { name: 'Suno', url: 'https://suno.ai/' },
        { name: 'Minimax', url: 'https://api.minimax.chat/' },
        { name: '어도비스톡(구매)', url: 'https://stock.adobe.com/kr' },
        { name: '모션엘리먼츠', url: 'https://www.motionelements.com/ko/' },
        { name: '크라우드픽', url: 'https://www.crowdpic.net/' },
    ];

    let shortcuts = JSON.parse(localStorage.getItem('shortcuts')) || initialShortcuts;
    let subscriptions = JSON.parse(localStorage.getItem('subscriptions')) || [];

    // --- 함수 정의 ---

    // 데이터를 localStorage에 저장하는 함수
    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // 바로 가기 목록을 화면에 그리는 함수
    function renderShortcuts() {
        shortcutContainer.innerHTML = '';
        shortcuts.forEach((item, index) => {
            const domain = new URL(item.url).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            
            const shortcutElement = document.createElement('a');
            shortcutElement.href = item.url;
            shortcutElement.target = '_blank';
            shortcutElement.className = 'shortcut-item';
            shortcutElement.innerHTML = `
                <img src="${iconUrl}" alt="${item.name} 아이콘">
                <span>${item.name}</span>
                <button class="item-delete-btn" data-index="${index}" title="삭제">X</button>
            `;
            shortcutContainer.appendChild(shortcutElement);
        });
    }

    // 구독 목록을 화면에 그리는 함수
    function renderSubscriptions() {
        subscriptionList.innerHTML = '';
        subscriptions.forEach((sub, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sub.name}</td>
                <td>${sub.cost}</td>
                <td>${sub.date}</td>
                <td><button class="delete-btn" data-index="${index}">삭제</button></td>
            `;
            subscriptionList.appendChild(row);
        });
    }

    // --- 이벤트 리스너 설정 ---

    // 바로 가기 추가 이벤트
    shortcutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newShortcut = {
            name: document.getElementById('shortcut-name').value,
            url: document.getElementById('shortcut-url').value
        };
        shortcuts.push(newShortcut);
        saveData('shortcuts', shortcuts);
        renderShortcuts();
        shortcutForm.reset();
    });

    // 바로 가기 삭제 이벤트 (이벤트 위임)
    shortcutContainer.addEventListener('click', (e) => {
        // a 태그 링크 이동 방지
        if (e.target.classList.contains('item-delete-btn')) {
            e.preventDefault(); 
            const index = e.target.getAttribute('data-index');
            shortcuts.splice(index, 1);
            saveData('shortcuts', shortcuts);
            renderShortcuts();
        }
    });

    // 구독 추가 이벤트
    subscriptionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSubscription = {
            name: document.getElementById('service-name').value,
            cost: document.getElementById('service-cost').value,
            date: document.getElementById('payment-date').value
        };
        subscriptions.push(newSubscription);
        saveData('subscriptions', subscriptions);
        renderSubscriptions();
        subscriptionForm.reset();
    });

    // 구독 삭제 이벤트 (이벤트 위임)
    subscriptionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.getAttribute('data-index');
            subscriptions.splice(index, 1);
            saveData('subscriptions', subscriptions);
            renderSubscriptions();
        }
    });

    // --- 초기 렌더링 ---
    renderShortcuts();
    renderSubscriptions();
});

document.addEventListener('DOMContentLoaded', () => {
    // --- 바로 가기 데이터 ---
    const shortcuts = [
        { name: 'ChatGPT', url: 'https://chat.openai.com/' },
        { name: 'Gemini', url: 'https://gemini.google.com/' },
        { name: 'Manus', url: 'https://manus.io/' },
        { name: 'Midjourney', url: 'https://www.midjourney.com/' },
        { name: 'Higgsfield', url: 'https://www.higgsfield.io/' },
        { name: 'Suno', url: 'https://suno.ai/' },
        { name: 'Minimax', url: 'https://api.minimax.chat/' },
        { name: '어도비 스톡(구매)', url: 'https://stock.adobe.com/kr' },
        { name: '어도비 스톡(판매)', url: 'https://contributor.stock.adobe.com/kr' },
        { name: '모션 엘리먼츠(구매)', url: 'https://www.motionelements.com/ko/' },
        { name: '모션 엘리먼츠(작가)', url: 'https://www.motionelements.com/ko/contributors' },
        { name: '크라우드픽(구매)', url: 'https://www.crowdpic.net/' },
        { name: '크라우드픽(작가)', url: 'https://www.crowdpic.net/apply' }
    ];

    // --- 구독 관리 데이터 및 기능 ---
    const subscriptionForm = document.getElementById('subscription-form');
    const subscriptionList = document.getElementById('subscription-list');
    let subscriptions = JSON.parse(localStorage.getItem('subscriptions')) || [];

    // 바로 가기 아이콘 렌더링
    function renderShortcuts() {
        const container = document.getElementById('shortcut-container');
        container.innerHTML = '';
        shortcuts.forEach(item => {
            const domain = new URL(item.url).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const shortcutElement = document.createElement('a');
            shortcutElement.href = item.url;
            shortcutElement.target = '_blank';
            shortcutElement.className = 'shortcut-item';
            shortcutElement.innerHTML = `
                <img src="${iconUrl}" alt="${item.name} 아이콘">
                <span>${item.name}</span>
            `;
            container.appendChild(shortcutElement);
        });
    }

    // 구독 목록 렌더링
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

    // 로컬 스토리지에 구독 목록 저장
    function saveSubscriptions() {
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    }

    // 구독 추가 이벤트 처리
    subscriptionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSubscription = {
            name: document.getElementById('service-name').value,
            cost: document.getElementById('service-cost').value,
            date: document.getElementById('payment-date').value
        };
        subscriptions.push(newSubscription);
        saveSubscriptions();
        renderSubscriptions();
        subscriptionForm.reset();
    });

    // 구독 삭제 이벤트 처리 (이벤트 위임)
    subscriptionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = e.target.getAttribute('data-index');
            subscriptions.splice(index, 1);
            saveSubscriptions();
            renderSubscriptions();
        }
    });

    // 초기 렌더링
    renderShortcuts();
    renderSubscriptions();
});

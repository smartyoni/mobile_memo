document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const memoForm = document.getElementById('memo-form');
    const memoInput = document.getElementById('memo-input');
    const memoList = document.getElementById('memo-list');
    const tabContainerPC = document.querySelector('.tabs-container-header .tabs');
    const addTabBtnPC = document.getElementById('add-tab-btn');
    const tabContainerMobile = document.querySelector('.tabs-container-mobile .tabs');
    const addTabBtnMobile = document.getElementById('add-tab-btn-mobile');
    const viewModal = document.getElementById('view-modal');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn');
    const editForm = document.getElementById('edit-form');
    const datetimeElement = document.getElementById('current-datetime');
    const listHeader = document.getElementById('list-header');
    const listHeaderTitle = document.getElementById('list-header-title');
    const listHeaderActions = document.getElementById('list-header-actions');

    let currentCategory = 'all';
    let memoTabs = [];

    const checkLayout = () => {
        const isMobileBefore = document.body.classList.contains('mobile-layout');
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }
        const isMobileAfter = document.body.classList.contains('mobile-layout');
        if (isMobileBefore !== isMobileAfter) {
            renderTabs();
        }
    };

    const makeDraggable = (modalContent, handle) => {
        let isDragging = false;
        let offsetX, offsetY;
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = modalContent.getBoundingClientRect();
            modalContent.style.transform = 'none';
            modalContent.style.left = `${rect.left}px`;
            modalContent.style.top = `${rect.top}px`;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) {
            if (!isDragging) return;
            modalContent.style.left = `${e.clientX - offsetX}px`;
            modalContent.style.top = `${e.clientY - offsetY}px`;
        }
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    };

    const linkify = (plainText) => {
        if (!plainText) return '';
        let linkedText = plainText;
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        linkedText = linkedText.replace(markdownLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        linkedText = linkedText.replace(urlRegex, (url) => {
            if (new RegExp(`href="https?:\/\/${url.replace(/^https?:\/\//, '')}"`).test(linkedText)) return url;
            let href = url;
            if (!href.match(/^[a-zA-Z]+:\/\//)) href = 'http://' + href;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        return linkedText;
    };

    const getRandomColor = () => {
        const rainbowColors = ['#ff7675', '#fab1a0', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe', '#fd79a8'];
        return rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
    };

    const loadData = () => {
        const memosJSON = localStorage.getItem('memos');
        const tabsJSON = localStorage.getItem('memoTabs');
        const memos = memosJSON ? JSON.parse(memosJSON) : [];
        const tabs = tabsJSON ? JSON.parse(tabsJSON) : [{ name: '계약', color: '#3498db', icon: '📄' }, { name: '광고', color: '#e74c3c', icon: '📢' }, { name: '기타', color: '#95a5a6', icon: '📌' }];
        return { memos, tabs };
    };
    const saveData = (data) => {
        if (data.memos !== undefined) localStorage.setItem('memos', JSON.stringify(data.memos));
        if (data.memoTabs !== undefined) localStorage.setItem('memoTabs', JSON.stringify(data.memoTabs));
    };
    
    const renderTabs = () => {
        const isMobile = document.body.classList.contains('mobile-layout');
        const container = isMobile ? tabContainerMobile : tabContainerPC;
        container.innerHTML = '';
        const allTab = document.createElement('button');
        allTab.className = 'tab-btn';
        allTab.dataset.category = 'all';
        if (isMobile) {
            allTab.innerHTML = `<span class="tab-icon">🗂️</span><span class="tab-text">전체</span>`;
        } else {
            allTab.textContent = '전체';
        }
        container.appendChild(allTab);
        memoTabs.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn';
            tabBtn.dataset.category = tab.name;
            if (isMobile) {
                tabBtn.innerHTML = `<span class="tab-icon">${tab.icon || '📑'}</span><span class="tab-text">${tab.name}</span>`;
            } else {
                tabBtn.style.setProperty('--tab-color', tab.color);
                tabBtn.innerHTML = `<span>${tab.name}</span>`;
            }
            container.appendChild(tabBtn);
        });
        document.querySelectorAll(`.tab-btn[data-category="${currentCategory}"]`).forEach(tab => tab.classList.add('active'));
    };

    const renderListHeader = () => {
        listHeaderActions.innerHTML = '';
        if (currentCategory === 'all' || !currentCategory) {
            listHeaderTitle.textContent = '메모 목록';
        } else {
            listHeaderTitle.textContent = currentCategory;
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '이름 수정';
            editBtn.onclick = handleEditTabName;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '탭 삭제';
            deleteBtn.onclick = handleDeleteTab;
            listHeaderActions.appendChild(editBtn);
            listHeaderActions.appendChild(deleteBtn);
        }
    };
    
    const renderEditCategoryDropdown = () => {
        const selectElement = document.getElementById('edit-category');
        selectElement.innerHTML = '';
        memoTabs.forEach(tab => {
            const option = document.createElement('option');
            option.value = tab.name;
            option.textContent = tab.name;
            selectElement.appendChild(option);
        });
    };

    const renderMemos = () => {
        const { memos } = loadData();
        memoList.innerHTML = '';
        const filteredMemos = memos.filter(memo => currentCategory === 'all' || memo.category === currentCategory);
        filteredMemos.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        filteredMemos.forEach(memo => {
            const li = document.createElement('li');
            li.className = memo.isPinned ? 'pinned' : '';
            li.dataset.id = memo.id;
            li.innerHTML = `<button class="pin-btn ${memo.isPinned ? 'pinned' : ''}" title="고정">${memo.isPinned ? '📌' : '📍'}</button><span class="memo-title">${memo.title}</span>`;
            memoList.appendChild(li);
        });
    };
    
    const handleAddTab = () => {
        const newTabName = prompt("새로운 카테고리 이름을 입력하세요:", `새 카테고리 ${memoTabs.length + 1}`);
        if (newTabName && !memoTabs.find(tab => tab.name === newTabName)) {
            memoTabs.push({ name: newTabName, color: getRandomColor(), icon: '📑' });
            saveData({ memoTabs });
            renderTabs();
            renderEditCategoryDropdown();
        } else if (newTabName) {
            alert("이미 존재하는 이름입니다.");
        }
    };
    addTabBtnPC.addEventListener('click', handleAddTab);
    addTabBtnMobile.addEventListener('click', handleAddTab);

    const handleTabClick = (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
            currentCategory = tabBtn.dataset.category;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll(`.tab-btn[data-category="${currentCategory}"]`).forEach(btn => btn.classList.add('active'));
            renderMemos();
            renderListHeader();
        }
    };
    document.querySelector('.tabs-container-header').addEventListener('click', handleTabClick);
    document.querySelector('.tabs-container-mobile').addEventListener('click', handleTabClick);
    
    const handleEditTabName = () => {
        const oldTabName = currentCategory;
        const newTabName = prompt("새로운 카테고리 이름을 입력하세요:", oldTabName);
        if (newTabName && newTabName !== oldTabName && !memoTabs.find(t => t.name === newTabName)) {
            const tab = memoTabs.find(t => t.name === oldTabName);
            if (tab) tab.name = newTabName;
            const { memos } = loadData();
            const updatedMemos = memos.map(memo => memo.category === oldTabName ? { ...memo, category: newTabName } : memo);
            saveData({ memoTabs, memos: updatedMemos });
            currentCategory = newTabName;
            renderTabs();
            renderEditCategoryDropdown();
            renderMemos();
            renderListHeader();
        } else if (newTabName && newTabName !== oldTabName) {
            alert("이미 존재하는 이름입니다.");
        }
    };

    const handleDeleteTab = () => {
        const tabNameToDelete = currentCategory;
        if (confirm(`'${tabNameToDelete}' 탭을 삭제하시겠습니까?\n이 탭에 포함된 모든 메모도 함께 삭제됩니다.`)) {
            let { memos } = loadData();
            const updatedMemos = memos.filter(memo => memo.category !== tabNameToDelete);
            memoTabs = memoTabs.filter(tab => tab.name !== tabNameToDelete);
            saveData({ memos: updatedMemos, memoTabs });
            currentCategory = 'all';
            renderTabs();
            renderEditCategoryDropdown();
            renderMemos();
            renderListHeader();
        }
    };
    
    memoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullText = memoInput.value.trim();
        if (fullText) {
            const lines = fullText.split('\n');
            const title = lines[0];
            const content = fullText;
            const { memos } = loadData();
            const categoryToSave = (currentCategory === 'all' || !memoTabs.find(t => t.name === currentCategory)) ? (memoTabs[0]?.name || '기타') : currentCategory;
            const newMemo = { id: Date.now().toString(), title, content, isPinned: false, category: categoryToSave };
            memos.push(newMemo);
            saveData({ memos });
            renderMemos();
            memoForm.reset();
        }
    });

    memoList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const { memos } = loadData();
        const memoId = li.dataset.id;
        const memo = memos.find(m => String(m.id) === memoId);
        if (!memo) return;
        const pinBtn = e.target.closest('.pin-btn');
        if (pinBtn) {
            memo.isPinned = !memo.isPinned;
            saveData({ memos });
            renderMemos();
            return;
        }
        viewModal.querySelector('.modal-content').style.cssText = '';
        document.getElementById('view-title').textContent = memo.title;
        document.getElementById('view-content').innerHTML = linkify(memo.content);
        const modalActions = viewModal.querySelector('.modal-actions');
        modalActions.innerHTML = `
            <button id="copy-memo-btn-popup" class="modal-btn">복사</button>
            <button id="edit-memo-btn-popup" class="modal-btn">수정</button>
            ${!memo.isPinned ? `<button id="delete-memo-btn-popup" class="modal-btn">삭제</button>` : ''}
        `;
        viewModal.style.display = 'block';
        modalActions.querySelector('#copy-memo-btn-popup').addEventListener('click', () => {
             const content = document.getElementById('view-content').textContent;
             navigator.clipboard.writeText(content).then(() => {
                const btn = modalActions.querySelector('#copy-memo-btn-popup');
                const originalText = btn.textContent;
                btn.textContent = '복사 완료!';
                btn.disabled = true;
                setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 1500);
             });
        });
        modalActions.querySelector('#edit-memo-btn-popup').addEventListener('click', () => {
            viewModal.style.display = 'none';
            const editModalContent = editModal.querySelector('.modal-content');
            editModalContent.style.cssText = ''; // Reset styles

            document.getElementById('edit-id').value = memo.id;
            document.getElementById('edit-input').value = memo.content;
            renderEditCategoryDropdown();
            document.getElementById('edit-category').value = memo.category || (memoTabs[0]?.name || '');
            editModal.style.display = 'block';

            // On mobile, move modal to top to avoid keyboard overlap
            if (document.body.classList.contains('mobile-layout')) {
                editModalContent.style.top = '5%';
                editModalContent.style.transform = 'translate(-50%, 0)';
                document.getElementById('edit-input').focus(); // Focus input to bring up keyboard
            }
        });
        const deleteBtn = modalActions.querySelector('#delete-memo-btn-popup');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm(`'${memo.title}' 메모를 정말 삭제하시겠습니까?`)) {
                    const updatedMemos = memos.filter(m => String(m.id) !== memoId);
                    saveData({ memos: updatedMemos });
                    renderMemos();
                    viewModal.style.display = 'none';
                }
            });
        }
    });
    
    closeModalBtns.forEach(btn => {
        btn.onclick = () => { viewModal.style.display = 'none'; editModal.style.display = 'none'; };
    });
    window.onclick = (event) => {
        if (event.target == viewModal || event.target == editModal) {
            viewModal.style.display = 'none';
            editModal.style.display = 'none';
        }
    };

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const fullText = document.getElementById('edit-input').value.trim();
        const newCategory = document.getElementById('edit-category').value;
        const lines = fullText.split('\n');
        const newTitle = lines[0];
        const newContent = fullText;
        const { memos } = loadData();
        const updatedMemos = memos.map(m => String(m.id) === id ? { ...m, title: newTitle, content: newContent, category: newCategory } : m);
        saveData({ memos: updatedMemos });
        editModal.style.display = 'none';
        renderMemos();
    });

    
    new Sortable(tabContainerPC, {
        animation: 150,
        filter: '.tab-btn[data-category="all"]',
        onEnd: (evt) => {
            const [movedTab] = memoTabs.splice(evt.oldIndex - 1, 1);
            memoTabs.splice(evt.newIndex - 1, 0, movedTab);
            saveData({ memoTabs });
            renderTabs();
        }
    });

    function updateTime() {
        const now = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const dayOfWeek = days[now.getDay()];
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const formattedDatetime = `${year}년 ${month}월 ${day}일 (${dayOfWeek}) ${ampm} ${hours}:${minutes}`;
        datetimeElement.textContent = formattedDatetime;
    }
    
    const initialize = () => {
        makeDraggable(document.querySelector('#view-modal .modal-content'), document.querySelector('#view-modal .modal-header'));
        makeDraggable(document.querySelector('#edit-modal .modal-content'), document.querySelector('#edit-modal .modal-header'));
        let data = loadData();
        if (data.tabs.length > 0 && typeof data.tabs[0] === 'string') {
            const newTabs = data.tabs.map(tabName => ({ name: tabName, color: getRandomColor() }));
            saveData({ memoTabs: newTabs });
            data.tabs = newTabs;
        }
        memoTabs = data.tabs;
        saveData({ memoTabs });
        renderTabs();
        renderEditCategoryDropdown();
        renderMemos();
        renderListHeader();
        updateTime();
        setInterval(updateTime, 1000);
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get('text');
        if (sharedText) {
            memoInput.value = sharedText;
            memoInput.scrollIntoView({ behavior: 'smooth' });
        }
        checkLayout();
        window.addEventListener('resize', checkLayout);
    };

    initialize();
});
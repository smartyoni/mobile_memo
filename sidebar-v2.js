document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const memoForm = document.getElementById('memo-form');
    const memoInput = document.getElementById('memo-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryAccordion = document.getElementById('category-accordion');
    const datetimeElement = document.getElementById('current-datetime');

    // 모달 관련 DOM 요소
    const viewModal = document.getElementById('view-modal');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn');
    const editForm = document.getElementById('edit-form');

    // 앱 상태 변수
    let categories = [];
    let memos = [];
    let activeCategoryId = null;
    let expandedCategoryId = null;

    // 색상 팔레트
    const PRETTY_COLORS = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#E0BBE4', '#957DAD', '#FFC72C', '#2ECC71'
    ];

    // --- 데이터 관리 ---
    const loadData = () => {
        let loadedCategories = JSON.parse(localStorage.getItem('categories')) || [];
        const loadedMemos = JSON.parse(localStorage.getItem('memos')) || [];
        
        // 데이터 마이그레이션: 기존 카테고리에 색상 속성 추가
        loadedCategories.forEach((cat, index) => {
            if (!cat.color) {
                cat.color = PRETTY_COLORS[index % PRETTY_COLORS.length];
            }
            // 데이터 마이그레이션: order 속성 추가
            if (cat.order === undefined) {
                cat.order = index; // Assign initial order based on current index
            }
        });

        // 기본 IN-BOX 카테고리 처리
        let inBox = loadedCategories.find(c => c.id === 'in-box');
        if (!inBox) {
            // IN-BOX가 없으면 새로 생성
            inBox = { id: 'in-box', name: 'IN-BOX', createdAt: Date.now(), color: '#FF69B4', order: -1 }; // Give IN-BOX a special order
            categories = [inBox, ...loadedCategories];
        } else {
            // IN-BOX가 있으면 색상 및 order 업데이트
            inBox.color = '#FF69B4'; // 강제로 핑크색으로 설정
            inBox.order = -1; // Ensure IN-BOX always has the lowest order
            categories = loadedCategories;
        }
        
        memos = loadedMemos;
        saveData(); // 마이그레이션 및 업데이트된 데이터 저장
    };

    const saveData = () => {
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('memos', JSON.stringify(memos));
    };

    // --- 렌더링 ---
    const render = () => {
        categoryAccordion.innerHTML = ''; // 아코디언 비우기

        const sortedCategories = [...categories].sort((a, b) => {
            if (a.id === 'in-box') return -1; // IN-BOX는 항상 위로
            if (b.id === 'in-box') return 1;
            return a.order - b.order; // Sort by order
        });

        sortedCategories.forEach(category => {
            const categoryMemos = memos.filter(memo => memo.categoryId === category.id);
            const isExpanded = category.id === expandedCategoryId;
            const isSelected = category.id === activeCategoryId;

            const categoryItem = document.createElement('div');
            categoryItem.className = `category-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`;
            categoryItem.dataset.id = category.id;
            categoryItem.style.setProperty('--category-bg-color', category.color);

            categoryItem.innerHTML = `
                <div class="category-header">
                    <h3>${category.name} (${categoryMemos.length})</h3>
                    <div class="category-controls-buttons">
                        ${category.id !== 'in-box' ? `
                            <button class="move-up-btn">▲</button>
                            <button class="move-down-btn">▼</button>
                        ` : ''}
                        <button class="edit-category-btn">수정</button>
                        ${category.id !== 'in-box' ? '<button class="delete-category-btn">삭제</button>' : ''}
                    </div>
                </div>
                <div class="memo-list-inner">
                    ${categoryMemos.map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-title">${memo.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            categoryAccordion.appendChild(categoryItem);
        });

        addEventListenersToItems();
    };

    // --- 이벤트 리스너 ---
    const addEventListenersToItems = () => {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', handleCategoryHeaderClick);
        });
        document.querySelectorAll('.memo-item').forEach(item => {
            item.addEventListener('click', handleMemoItemClick);
        });
        document.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', handleEditCategory);
        });
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteCategory);
        });
        document.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', moveCategoryUp);
        });
        document.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', moveCategoryDown);
        });
    };

    // --- 이벤트 핸들러 ---
    const handleQuickMemoSubmit = (e) => {
        e.preventDefault();
        const fullText = memoInput.value.trim();
        if (!fullText) return;

        const lines = fullText.split('\n');
        const title = lines[0];
        const newMemo = {
            id: Date.now().toString(),
            title: title,
            content: fullText,
            categoryId: activeCategoryId || 'in-box',
            createdAt: Date.now()
        };

        memos.push(newMemo);
        saveData();
        render();
        memoForm.reset();
    };

    const handleAddCategory = () => {
        const name = prompt('새 카테고리 이름을 입력하세요:');
        if (name && name.trim()) {
            const newCategory = {
                id: Date.now().toString(),
                name: name.trim(),
                createdAt: Date.now(),
                color: PRETTY_COLORS[categories.length % PRETTY_COLORS.length],
                order: categories.length // Assign order
            };
            categories.push(newCategory);
            saveData();
            render();
        }
    };

    const handleCategoryHeaderClick = (e) => {
        if (e.target.closest('button')) return;
        const categoryItem = e.target.closest('.category-item');
        const categoryId = categoryItem.dataset.id;

        if (expandedCategoryId === categoryId) {
            expandedCategoryId = null;
        } else {
            expandedCategoryId = categoryId;
        }

        if (activeCategoryId === categoryId) {
            activeCategoryId = null;
        } else {
            activeCategoryId = categoryId;
        }

        // Move clicked category to just below IN-BOX
        const clickedCategory = categories.find(c => c.id === categoryId);
        if (clickedCategory && clickedCategory.id !== 'in-box') {
            // Temporarily set its order to a very low value to bring it to the front (after in-box)
            clickedCategory.order = -0.5; // A value between in-box (-1) and other categories (>=0)

            // Re-sort categories based on the new temporary order and then re-assign sequential orders
            let currentOrder = 0;
            categories.sort((a, b) => {
                if (a.id === 'in-box') return -1;
                if (b.id === 'in-box') return 1;
                return a.order - b.order;
            }).forEach(cat => {
                if (cat.id !== 'in-box') {
                    cat.order = currentOrder++;
                }
            });
        }

        saveData(); // Save the new order
        render();
    };

    const handleMemoItemClick = (e) => {
        const memoId = e.currentTarget.dataset.memoId;
        const memo = memos.find(m => m.id === memoId);
        if (memo) openViewModal(memo);
    };

    const handleEditCategory = (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        const newName = prompt('카테고리 새 이름을 입력하세요:', category.name);
        if (newName && newName.trim()) {
            category.name = newName.trim();
            saveData();
            render();
        }
    };

    const handleDeleteCategory = (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        if (categoryId === 'in-box') return;

        const category = categories.find(c => c.id === categoryId);
        if (confirm(`정말 '${category.name}' 카테고리를 삭제하시겠습니까?\n\n경고: 이 카테고리에 포함된 모든 메모가 영구적으로 삭제됩니다.`)) {
            // 카테고리에 속한 메모들을 삭제
            memos = memos.filter(memo => memo.categoryId !== categoryId);
            // 카테고리 삭제
            categories = categories.filter(c => c.id !== categoryId);
            
            if (activeCategoryId === categoryId) activeCategoryId = null;
            if (expandedCategoryId === categoryId) expandedCategoryId = null;

            saveData();
            render();
        }
    };

    const moveCategory = (categoryId, direction) => {
        const categoryToMove = categories.find(c => c.id === categoryId);
        if (!categoryToMove || categoryToMove.id === 'in-box') return;

        // Get current sorted list to find actual neighbors
        const currentSortedCategories = [...categories].sort((a, b) => {
            if (a.id === 'in-box') return -1;
            if (b.id === 'in-box') return 1;
            return a.order - b.order;
        });

        const currentIndex = currentSortedCategories.findIndex(c => c.id === categoryId);
        let targetIndex = currentIndex + direction;

        if (targetIndex < 0 || targetIndex >= currentSortedCategories.length) return;
        if (currentSortedCategories[targetIndex].id === 'in-box') return; // Cannot swap with in-box

        const categoryToSwapWith = currentSortedCategories[targetIndex];

        // Swap orders in the original categories array
        const originalIndexToMove = categories.findIndex(c => c.id === categoryId);
        const originalIndexToSwap = categories.findIndex(c => c.id === categoryToSwapWith.id);

        [categories[originalIndexToMove].order, categories[originalIndexToSwap].order] = 
        [categories[originalIndexToSwap].order, categories[originalIndexToMove].order];

        saveData();
        render();
    };

    const moveCategoryUp = (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        moveCategory(categoryId, -1);
    };

    const moveCategoryDown = (e) => {
        e.stopPropagation();
        const categoryId = e.target.closest('.category-item').dataset.id;
        moveCategory(categoryId, 1);
    };

    // --- 모달 관리 ---
    const openViewModal = (memo) => {
        const viewModalContent = viewModal.querySelector('.modal-content');
        const modalBody = viewModal.querySelector('.modal-body');
        const viewContent = document.getElementById('view-content');
        const modalFooter = document.getElementById('view-modal-footer');

        // 상태 초기화
        viewModalContent.style.top = '8%';
        viewModalContent.style.transform = 'translateX(-50%)';
        modalBody.style.position = 'relative'; // 책갈피 마커를 위한 기준점

        const renderBookmarkUI = () => {
            // 기존 UI 초기화
            modalFooter.innerHTML = '';
            const existingMarker = modalBody.querySelector('.bookmark-marker');
            if (existingMarker) existingMarker.remove();

            document.getElementById('view-title').textContent = memo.title;
            
            // URL을 하이퍼링크로 변환하는 함수
            const convertUrlsToLinks = (text) => {
                const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
                return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            };

            // 마크다운 렌더링 제거: 입력된 그대로 표시
            const textWithLinks = convertUrlsToLinks(memo.content);
            viewContent.innerHTML = textWithLinks.replace(/\n/g, '<br>');

            // 책갈피 마커 렌더링
            if (memo.bookmarkPosition > 0) {
                const marker = document.createElement('div');
                marker.className = 'bookmark-marker';
                marker.innerHTML = '🔖';
                marker.style.top = `${memo.bookmarkPosition}px`; 
                modalBody.appendChild(marker);
            }

            // 버튼 렌더링
            const setBookmarkBtn = document.createElement('button');
            setBookmarkBtn.id = 'set-bookmark-btn';
            setBookmarkBtn.className = 'modal-btn';
            setBookmarkBtn.textContent = '책갈피';
            setBookmarkBtn.onclick = () => {
                if (memo.bookmarkPosition > 0) {
                    // 이미 책갈피가 설정되어 있으면 초기화
                    memo.bookmarkPosition = 0;
                } else {
                    // 책갈피 설정
                    memo.bookmarkPosition = modalBody.scrollTop;
                }
                saveData();
                renderBookmarkUI(); // UI 즉시 업데이트
            };

            const gotoBookmarkBtn = document.createElement('button');
            gotoBookmarkBtn.id = 'goto-bookmark-btn';
            gotoBookmarkBtn.className = 'modal-btn';
            gotoBookmarkBtn.textContent = '이동';
            gotoBookmarkBtn.style.display = memo.bookmarkPosition > 0 ? 'inline-block' : 'none';
            gotoBookmarkBtn.onclick = () => {
                modalBody.scrollTo({ top: memo.bookmarkPosition, behavior: 'smooth' });
            };
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '복사';
            copyBtn.className = 'modal-btn';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(memo.content).then(() => {});
            };

            const editBtn = document.createElement('button');
            editBtn.textContent = '수정';
            editBtn.className = 'modal-btn';
            editBtn.onclick = () => {
                viewModal.style.display = 'none';
                openEditModal(memo);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'modal-btn';
            deleteBtn.onclick = () => {
                if (confirm('정말 이 메모를 삭제하시겠습니까?')) {
                    memos = memos.filter(m => m.id !== memo.id);
                    saveData();
                    render();
                    closeModal();
                }
            };

            modalFooter.append(setBookmarkBtn, gotoBookmarkBtn, copyBtn, editBtn, deleteBtn);
        }

        renderBookmarkUI();
        viewModal.style.display = 'flex';
        // 모달이 열린 직후 스크롤 위치를 0으로 초기화
        setTimeout(() => { modalBody.scrollTop = 0; }, 0);
    };

    const openEditModal = (memo) => {
        document.getElementById('edit-id').value = memo.id;
        document.getElementById('edit-input').value = memo.content;
        
        const categorySelect = document.getElementById('edit-category');
        categorySelect.innerHTML = categories.map(c => 
            `<option value="${c.id}" ${c.id === memo.categoryId ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const editModalContent = editModal.querySelector('.modal-content');
        editModalContent.style.top = '5%';
        editModalContent.style.left = '50%';
        editModalContent.style.transform = 'translateX(-50%)';

        setTimeout(() => {
            document.getElementById('edit-input').focus();
            document.getElementById('edit-input').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        editModal.style.display = 'flex';
    };

    const handleEditFormSubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const content = document.getElementById('edit-input').value.trim();
        const categoryId = document.getElementById('edit-category').value;

        if (!content) return;

        const memo = memos.find(m => m.id === id);
        if (memo) {
            memo.content = content;
            memo.title = content.split('\n')[0];
            memo.categoryId = categoryId;
        }

        saveData();
        render();
        editModal.style.display = 'none';
    };

    const closeModal = () => {
        viewModal.style.display = 'none';
        editModal.style.display = 'none';
    };

    // --- 시간 업데이트 ---
    const updateTime = () => {
        if (!datetimeElement) return;
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: 'numeric' };
        datetimeElement.textContent = now.toLocaleString('ko-KR', options);
    };

    // --- 초기화 ---
    const initialize = () => {
        loadData();
        render();

        memoForm.addEventListener('submit', handleQuickMemoSubmit);
        addCategoryBtn.addEventListener('click', handleAddCategory);
        editForm.addEventListener('submit', handleEditFormSubmit);
        closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
        window.addEventListener('click', (e) => {
            if (e.target == viewModal || e.target == editModal) {
                closeModal();
            }
        });

        updateTime();
        setInterval(updateTime, 1000);
    };

    initialize();
});
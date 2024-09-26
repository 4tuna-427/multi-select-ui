export default class MultiSelectUI {

    /**
     * 指定されたselect要素をマルチセレクト要素に置き換えます。
     *
     * @param {(HTMLElement|string)} target - HTMLElementまたはセレクタ文字列
     * @throws {Error} 要素が見つからない場合にスローされます。
     */
    static initialize(target) {
        let targetElement = null;

        if (target instanceof Element) {
            targetElement = target;
        } else if (typeof target === 'string') {
            targetElement = document.querySelector(target);
        }

        if (!targetElement) {
            throw new Error('要素が見つかりません。');
        }

        const multiSelectInstance = new MultiSelectUI(targetElement);
        multiSelectInstance.convertToMultiSelect();
        multiSelectInstance.setupEventListeners();
    }

    /**
     * コンストラクタ
     *
     * @param {HTMLElement} targetElement
     */
    constructor(targetElement) {
        this.originalElement = targetElement;
        this.selectedItems = [];
        this.isDropdownMenuVisible = false;
        this.documentClickHandler = null;
        this.adjustDropdownSizeHandler = null;
    }

    /**
     * 指定した既存のselect要素をマルチセレクト要素に変形する
     */
    convertToMultiSelect() {
        // オリジナルのoption要素からマルチセレクト要素の項目を生成する
        const optionLabels = Array.from(this.originalElement.options).map((option, index) => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option.value;
            checkbox.dataset.index = index;

            const label = document.createElement('label');
            label.classList.add('item');
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(option.text));

            return label;
        });

        // マルチセレクト要素Elementを生成する
        this.multiSelectElement = this.createMultiSelectElement();

        // マルチセレクト要素の項目を追加する
        const dropdownList = this.multiSelectElement.querySelector(`[data-id="dropdown-list"]`);
        optionLabels.forEach(label => dropdownList.appendChild(label));

        // オリジナルのselect要素の位置にマルチセレクト要素を生成し、オリジナル要素を削除する
        this.originalElement.insertAdjacentElement('afterend', this.multiSelectElement);
        this.originalElement.remove();
    }

    /**
     * マルチセレクト要素Elementを生成
     */
    createMultiSelectElement() {
        // マルチセレクト要素
        const multiSelect = document.createElement('div');
        multiSelect.id = this.originalElement.id;
        multiSelect.classList.add('multi-select');
        this.originalElement.classList.forEach(className => {
            multiSelect.classList.add(className);
        });

        // マルチセレクトボックス
        this.multiSelectBox = document.createElement('div');
        this.multiSelectBox.className = 'multi-select-box';
        this.multiSelectBox.tabIndex = 0;
        this.multiSelectBox.dataset.id = 'multi-select-box';
        multiSelect.appendChild(this.multiSelectBox);

        // ボックス左
        const boxLeft = document.createElement('div');
        boxLeft.className = 'box-left';
        boxLeft.dataset.id = 'box-left';
        this.multiSelectBox.appendChild(boxLeft);

        // ボックス右
        const boxRight = document.createElement('div');
        boxRight.className = 'box-right';
        boxRight.dataset.id = 'multi-right';
        this.multiSelectBox.appendChild(boxRight);

        // プレースホルダー
        this.placeholderElement = document.createElement('div');
        this.placeholderElement.className = 'placeholder';
        this.placeholderElement.innerText = this.originalElement.dataset.placeholder;
        boxLeft.appendChild(this.placeholderElement);

        // 選択中項目のタグを表示するコンテナ
        this.selectedItemsContainer = document.createElement('div');
        this.selectedItemsContainer.className = 'selected-items-container';
        this.selectedItemsContainer.dataset.id = 'selected-items-container';
        boxLeft.appendChild(this.selectedItemsContainer);

        // ドロップダウンアイコン
        this.dropdownIcon = document.createElement('div');
        this.dropdownIcon.className = 'dropdown-icon';
        this.dropdownIcon.tabIndex = 0;
        boxRight.appendChild(this.dropdownIcon);

        // ドロップダウンメニュー
        this.dropdownMenu = document.createElement('div');
        this.dropdownMenu.className = 'dropdown-menu';
        this.dropdownMenu.style.display = 'none';
        this.dropdownMenu.dataset.id = 'dropdown-menu';
        multiSelect.appendChild(this.dropdownMenu);

        // 検索ボックスのコンテナ
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        this.dropdownMenu.appendChild(searchContainer);

        // 検索ボックス
        this.searchInput = document.createElement('input');
        this.searchInput.className = 'search-input';
        this.searchInput.type = 'search';
        this.searchInput.placeholder = '絞り込み';
        this.searchInput.dataset.id = 'search-input';
        searchContainer.appendChild(this.searchInput);

        // ドロップダウンメニューを閉じるアイコン
        this.menuCloser = document.createElement('div');
        this.menuCloser.tabIndex = 0;
        this.menuCloser.className = 'menu-closer';
        searchContainer.appendChild(this.menuCloser);

        // 選択項目のコンテナ
        this.dropdownList = document.createElement('div');
        this.dropdownList.className = 'dropdown-list';
        this.dropdownList.dataset.id = 'dropdown-list';
        this.dropdownMenu.appendChild(this.dropdownList);

        return multiSelect;
    }

    /**
     * ドロップダウンが画面からはみ出さないように調整
     */
    adjustDropdownSizeToFitViewport() {
        const rect = this.dropdownList.getBoundingClientRect();
        const documentScrollbarSize = this.getDocumentScrollbarSize();

        const maxWidth = window.innerWidth - Math.ceil(rect.left) - documentScrollbarSize.width - 2;
        this.dropdownList.style.maxWidth = `${maxWidth}px`;

        const newHeight = window.innerHeight - Math.ceil(rect.top) - documentScrollbarSize.height - 2;
        this.dropdownList.style.maxHeight = `${newHeight}px`;
    }

    /**
     * ブラウザのスクロールバーのサイズを取得
     */
    getDocumentScrollbarSize() {
        // 仮の要素を作成
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll'; // スクロールバーを強制表示
        outer.style.width = '100px';
        outer.style.height = '100px';
        document.body.appendChild(outer);

        // 内部要素を作成して幅を計測
        const inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        outer.appendChild(inner);

        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        const scrollbarHeight = outer.offsetHeight - inner.offsetHeight;

        // 仮の要素を削除
        document.body.removeChild(outer);

        return {
            width: scrollbarWidth,
            height: scrollbarHeight
        };
    }

    /**
     * イベントリスナを設定する
     */
    setupEventListeners() {
        // マルチセレクトボックス
        this.multiSelectBox.addEventListener('click', this.handleMultiSelectBoxPointerDown.bind(this));
        this.multiSelectBox.addEventListener('focus', this.handleMultiSelectBoxPointerDown.bind(this));

        // ドロップダウンアイコン
        this.dropdownIcon.addEventListener('click', this.handleDropdownIconPointerDown.bind(this));
        this.dropdownIcon.addEventListener('keydown', (e) => {
            if ([' ', 'Enter', ''].includes(e.key)) {
                e.preventDefault();
                e.target.click();
            }
        });

        // 絞り込みinputボックス
        this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));

        // ドロップダウンメニューのバツアイコン
        this.menuCloser.addEventListener('click', this.handleMenuCloserPointerDown.bind(this));
        this.menuCloser.addEventListener('keydown', (e) => {
            if ([' ', 'Enter', ''].includes(e.key)) {
                e.preventDefault();
                e.target.click();
            }
        });

        // リストアイテム
        const checkboxes = this.multiSelectElement.querySelectorAll(`input[type="checkbox"]`);
        for (const checkbox of checkboxes) {
            checkbox.addEventListener('change', this.handleCheckboxToggle.bind(this));
        }
    }

    /**
     * マルチセレクトボックス押下時、ドロップダウンメニューを表示する
     */
    handleMultiSelectBoxPointerDown(e) {
        e.stopPropagation();

        if (!this.isDropdownMenuVisible) {
            this.showDropdownMenu();
        }
    }

    /**
     * ドロップダウンアイコン押下時、ドロップダウンメニューを表示/非表示する
     */
    handleDropdownIconPointerDown(e) {
        e.stopPropagation();

        if (this.isDropdownMenuVisible) {
            this.hideDropdownMenu();
        } else {
            this.showDropdownMenu();
        }
    }

    /**
     * ドロップダウンメニューを表示する
     */
    showDropdownMenu() {
        // ドロップダウンメニューを表示
        const dropdownMenu = this.multiSelectElement.querySelector(`[data-id="dropdown-menu"]`);
        dropdownMenu.style.display = '';

        // focusクラスを有効にする
        this.multiSelectBox.classList.add('focus');

        // ドロップダウンメニューが画面からはみ出さないように調整
        this.adjustDropdownSizeToFitViewport();

        // ドロップダウンメニューを非表示にするイベントリスナを設定
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.documentClickHandler);

        // ブラウザサイズ変更時
        this.adjustDropdownSizeHandler = this.adjustDropdownSizeToFitViewport.bind(this);
        window.addEventListener('resize', this.adjustDropdownSizeHandler);
        window.addEventListener('scroll', this.adjustDropdownSizeHandler);

        this.isDropdownMenuVisible = true;
    }

    /**
     * ドロップダウンメニューを非表示にする
     */
    hideDropdownMenu() {
        // ドロップダウンメニューを非表示にする
        const dropdownMenu = this.multiSelectElement.querySelector(`[data-id="dropdown-menu"]`);
        dropdownMenu.style.display = 'none';

        // focusクラスを無効にする
        this.multiSelectBox.classList.remove('focus');

        // イベントリスナを解除
        document.removeEventListener('click', this.documentClickHandler);
        window.removeEventListener('resize', this.adjustDropdownSizeHandler);
        window.removeEventListener('scroll', this.adjustDropdownSizeHandler);

        this.isDropdownMenuVisible = false;
    }

    /**
     * ドロップダウン要素以外を押下時、ドロップダウンメニューを非表示にする
     */
    handleDocumentClick(e) {
        // ドロップダウンメニューを非表示にする条件
        const shouldHideMenu = (
            // !e.target.closest('#' + this.multiSelectElement.id)
            !e.target.closest(`[data-id="dropdown-menu"]`)
            && !e.target.closest(`[data-id="selected-items-container"]`)
        );

        if (shouldHideMenu) {
            this.hideDropdownMenu();
        }
    }

    /**
     * 絞り込みinput要素に文字を入力時、フィルタリング結果を反映する
     */
    handleSearchInput(e) {
        const filterQuery = e.target.value.toLowerCase().trim();
        const filterKeywords = filterQuery.split(/\s+/);

        const optionItems = Array.from(this.multiSelectElement.querySelectorAll(`.item`));
        optionItems.forEach(item => {
            const itemValue = item.textContent.toLowerCase().replace(/\s+/g, '');
            const containsKeyword = filterKeywords.some(keyword => itemValue.includes(keyword));
            item.style.display = containsKeyword ? '' : 'none';
        });
    }

    /**
     * ドロップダウンメニューのバツアイコンを押下時、ドロップダウンメニューを非表示にする
     */
    handleMenuCloserPointerDown() {
        this.hideDropdownMenu();
    }

    /**
     * 項目のチェックボックスの状態を変更時、その値の表示を切り替える
     */
    handleCheckboxToggle(e) {
        const itemIndex = e.target.dataset.index;
        const selectedItem = this.selectedItemsContainer.querySelector(`[data-index="${itemIndex}"]`);

        if (e.target.checked && !selectedItem) {
            this.addTagElement(e.target.value, itemIndex);
        } else if (!e.target.checked && selectedItem) {
            this.removeTagElement(itemIndex);
        }

        // ドロップダウンをリサイズ
        this.adjustDropdownSizeToFitViewport();
    }

    /**
     * タグ要素を追加する
     */
    addTagElement(text, index) {
        this.placeholderElement.style.display = 'none';

        const tagElement = this.createTagElement(text, index);
        this.selectedItems.push({
            index: index,
            element: tagElement,
        });
        this.selectedItemsContainer.appendChild(tagElement);
    }

    /**
     * タグ要素を削除する
     */
    removeTagElement(index) {
        const tag = this.selectedItems.find(item => item.index === index);
        tag.element.remove();

        this.selectedItems = this.selectedItems.filter(item => item.index !== index);

        if (this.selectedItems.length === 0) {
            this.placeholderElement.style.display = '';
        }
    }

    /**
     * タグ要素を生成する
     */
    createTagElement(text, index) {
        const tagElement = document.createElement('div');
        tagElement.dataset.index = index;
        tagElement.classList.add('tag');
        tagElement.innerHTML = `<span>${text}</span><span data-id="close-btn" class="close-btn" tabindex="0">&times;</span>`;

        const closeButton = tagElement.querySelector(`[data-id="close-btn"]`);

        // 閉じるボタンクリック時、対応するチェックボックスをトグル（タグ要素削除イベントが発火する）
        closeButton.addEventListener('click', () => {
            const checkbox = this.multiSelectElement.querySelector(`input[data-index="${index}"]`);
            checkbox.checked = false;
            this.handleCheckboxToggle({ target: checkbox });
        });

        closeButton.addEventListener('keydown', (e) => {
            if ([' ', 'Enter', ''].includes(e.key)) {
                e.preventDefault();
                e.target.click();
            }
        });

        // タグをダブルクリック時、〃
        tagElement.addEventListener('dblclick', () => {
            closeButton.click();
        });

        return tagElement;
    }
}

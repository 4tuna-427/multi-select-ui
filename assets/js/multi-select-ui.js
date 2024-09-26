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
        multiSelectInstance.initializeElementSize();
    }

    /**
     * コンストラクタ
     *
     * @param {HTMLElement} targetElement
     */
    constructor(targetElement) {
        this.originalElement = targetElement;

        // イベントハンドラー
        this.documentClickHandler = null;
        this.adjustDropdownSizeHandler = null;

        // ドロップダウンの表示状態フラグ
        this.isDropdownMenuVisible = false;
        // 選択中のドロップダウンリスト項目
        this.selectedItems = [];

        this.dropDownListMinWidth = null;
    }

    /**
     * 指定した既存のselect要素をマルチセレクト要素に変形する
     */
    convertToMultiSelect() {
        this.multiSelectElement = this.createMultiSelectElement();

        let itemIndex = 0;
        const selectedOptions = [];

        const createCheckbox = (node, itemIndex) => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = node.dataset.name;
            checkbox.value = node.value;
            checkbox.dataset.index = itemIndex;
            if ('selected' in node.dataset) {
                checkbox.checked = true;
                selectedOptions.push({
                    index: itemIndex,
                    text: node.textContent
                });
            }
            return checkbox;
        };

        const createItemElement = (checkbox, text) => {
            const itemElement = document.createElement('label');
            itemElement.classList.add('item');
            itemElement.appendChild(checkbox);
            itemElement.appendChild(document.createTextNode(text));
            return itemElement;
        };

        const toggleCheckboxes = (groupContainer) => {
            const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
            checkboxes.forEach(checkbox => {
                if (allChecked || !checkbox.checked) {
                    checkbox.click();
                }
            });
        };

        const processNode = (node, parentList) => {
            switch (node.nodeName) {
                case 'OPTION':
                    const checkbox = createCheckbox(node, itemIndex);
                    const itemElement = createItemElement(checkbox, node.textContent);
                    parentList.appendChild(itemElement);
                    itemIndex++;
                    break;
                case 'OPTGROUP':
                    const groupContainer = document.createElement('div');
                    groupContainer.classList.add('optgroup-container');

                    const groupLabel = document.createElement('div');
                    groupLabel.dataset.type = 'optgroup-label';
                    groupLabel.classList.add('optgroup-label');
                    groupLabel.textContent = node.label;
                    groupLabel.addEventListener('click', () => toggleCheckboxes(groupContainer));

                    groupContainer.appendChild(groupLabel);
                    Array.from(node.children).forEach(child => processNode(child, groupContainer));
                    parentList.appendChild(groupContainer);
                    break;
                case 'HR':
                    parentList.appendChild(document.createElement('hr'));
                    break;
            }
        };

        Array.from(this.originalElement.childNodes).forEach(node => {
            processNode(node, this.dropdownList);
        });

        this.originalElement.insertAdjacentElement('afterend', this.multiSelectElement);
        this.originalElement.remove();

        // 選択中リストアイテムのタグを追加
        selectedOptions.forEach(item => {
            this.addTagElement(item.text, item.index);
        });
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
     * マルチセレクト要素の初期サイズを設定
     */
    initializeElementSize() {
        // ドロップダウンメニューを透明で表示
        this.dropdownMenu.style.display = '';
        this.dropdownMenu.style.visibility = 'hidden';
        this.dropdownMenu.style.position = 'absolute';

        // ドロップダウンリストに最小横幅を設定
        if (this.dropDownListMinWidth === null) {
            this.dropDownListMinWidth = this.getRequiredWidth(this.dropdownList);
            this.dropdownList.style.minWidth = this.dropDownListMinWidth + 'px';
        }

        // ドロップダウンメニューを非表示に戻す
        this.dropdownMenu.style.display = 'none';
        this.dropdownMenu.style.visibility = '';
        this.dropdownMenu.style.position = '';
    }

    /**
     * ドロップダウンが画面からはみ出さないように調整
     */
    adjustDropdownSizeToFitViewport() {
        const rect = this.dropdownList.getBoundingClientRect();
        const documentScrollbarSize = this.getDocumentScrollbarSize();

        const maxWidth = window.innerWidth - Math.ceil(rect.left) - documentScrollbarSize.width - 2;
        this.dropdownList.style.maxWidth = maxWidth + 'px';

        const height = window.innerHeight - Math.ceil(rect.top) - documentScrollbarSize.height - 2;
        this.dropdownList.style.height = height + 'px';
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
     * 引数で指定した要素のスクロールバーが出ない程度の横幅を取得する
     *
     * @param {*} element
     * @returns
     */
    getRequiredWidth(element) {
        // コンテンツの総幅を取得
        const scrollWidth = element.scrollWidth;

        // パディングとボーダーを考慮
        const style = window.getComputedStyle(element);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        const borderLeft = parseFloat(style.borderLeftWidth);
        const borderRight = parseFloat(style.borderRightWidth);

        // ブラウザのスクロールバーのサイズを取得
        const documentScrollbarSize = this.getDocumentScrollbarSize();

        // スクロールバーがでない程度の横幅
        const requiredWidth = scrollWidth + paddingLeft + paddingRight + borderLeft + borderRight + documentScrollbarSize.width;

        return requiredWidth;
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
        const itemIndex = parseInt(e.target.dataset.index);
        const text = e.target.parentElement.textContent;

        if (e.target.checked) {
            this.addTagElement(text, itemIndex);
        } else if (!e.target.checked) {
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
            index: parseInt(index),
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

        const checkbox = this.multiSelectElement.querySelector(`input[data-index="${index}"]`);
        const closeButton = tagElement.querySelector(`[data-id="close-btn"]`);

        // 閉じるボタンクリック時、対応するチェックボックスをトグル（タグ要素削除イベントが発火する）
        closeButton.addEventListener('click', () => {
            checkbox.click();
        });

        closeButton.addEventListener('keydown', (e) => {
            if ([' ', 'Enter', ''].includes(e.key)) {
                e.preventDefault();
                checkbox.click();
            }
        });

        return tagElement;
    }
}

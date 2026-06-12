function CustomDropdown(config) {
    const { container, options, value, placeholder, onChange, accessory } = config;

    let _options = options ? [...options] : [];
    let _value = value || '';
    let _isOpen = false;

    const wrapper = document.createElement('div');
    wrapper.className = 'cdrop';

    const trigger = document.createElement('button');
    trigger.className = 'cdrop-trigger';
    trigger.type = 'button';

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'cdrop-label';

    const triggerIcons = document.createElement('span');
    triggerIcons.className = 'cdrop-icons';

    trigger.appendChild(triggerLabel);
    if (accessory) {
        const acc = document.createElement('span');
        acc.className = 'cdrop-accessory';
        acc.innerHTML = accessory;
        triggerIcons.appendChild(acc);
    }
    const arrow = document.createElement('span');
    arrow.className = 'cdrop-arrow';
    arrow.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    triggerIcons.appendChild(arrow);
    trigger.appendChild(triggerIcons);

    const panel = document.createElement('div');
    panel.className = 'cdrop-panel';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'cdrop-search-wrap';
    const searchIcon = document.createElement('span');
    searchIcon.className = 'cdrop-search-icon';
    searchIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const searchInput = document.createElement('input');
    searchInput.className = 'cdrop-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search channels...';
    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);

    const list = document.createElement('div');
    list.className = 'cdrop-list';

    panel.appendChild(searchWrap);
    panel.appendChild(list);
    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);
    container.appendChild(wrapper);

    function renderList(filter) {
        const q = (filter || '').toLowerCase();
        const filtered = _options.filter(o => !q || o.label.toLowerCase().includes(q));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="cdrop-empty">No results</div>';
            return;
        }

        list.innerHTML = filtered.map(o => {
            const sel = o.value === _value;
            return '<div class="cdrop-opt' + (sel ? ' sel' : '') + '" data-value="' + o.value + '" data-label="' + escHtml(o.label) + '">' +
                (o.icon ? '<span class="cdrop-opt-icon">' + o.icon + '</span>' : '') +
                '<span class="cdrop-opt-label">' + escHtml(o.label) + '</span>' +
                (sel ? '<span class="cdrop-opt-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' : '') +
            '</div>';
        }).join('');
    }

    function updateTrigger() {
        const sel = _options.find(o => o.value === _value);
        if (sel) {
            triggerLabel.innerHTML = (sel.icon ? '<span class="cdrop-trigger-icon">' + sel.icon + '</span>' : '') +
                '<span>' + escHtml(sel.label) + '</span>';
            triggerLabel.style.color = 'var(--ink)';
        } else {
            triggerLabel.textContent = placeholder || 'Select...';
            triggerLabel.style.color = 'var(--ink-muted)';
        }
    }

    function open() {
        if (_isOpen) return;
        _isOpen = true;
        wrapper.classList.add('open');
        renderList('');
        searchInput.value = '';
        panel.style.display = 'flex';
        requestAnimationFrame(() => searchInput.focus());
    }

    function close() {
        if (!_isOpen) return;
        _isOpen = false;
        wrapper.classList.remove('open');
        panel.style.display = 'none';
    }

    function select(val) {
        _value = val;
        updateTrigger();
        if (onChange) onChange(val);
        close();
    }

    function setValue(val) {
        _value = val;
        updateTrigger();
    }

    function setOptions(opts) {
        _options = opts;
        if (_value && !_options.find(o => o.value === _value)) {
            _value = _options.length > 0 ? _options[0].value : '';
        }
        updateTrigger();
        if (_isOpen) renderList(searchInput.value);
    }

    function getValue() { return _value; }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        _isOpen ? close() : open();
    });

    searchInput.addEventListener('input', () => renderList(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Enter') {
            const first = list.querySelector('.cdrop-opt:not(.sel)');
            if (first) select(first.dataset.value);
        }
    });

    list.addEventListener('click', (e) => {
        const opt = e.target.closest('.cdrop-opt');
        if (opt) select(opt.dataset.value);
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) close();
    });

    panel.style.display = 'none';
    updateTrigger();

    return { setValue, setOptions, getValue, open, close, wrapper };
}

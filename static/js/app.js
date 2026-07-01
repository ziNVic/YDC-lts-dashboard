// ========== 长护险监测平台 - 动态交互逻辑（API版） ==========

const API_BASE = ''; // 空字符串表示同域

const state = {
    currentView: 'overview',
    cityFilter: { batch: 'all', region: 'all' },
    citySort: 'default',
    policyFilter: 'all',
    policySearch: '',
    supervisionTab: 'inspection',
    newsTag: 'all',
    cachedCities: []
};

const categoryMap = {
    implementation: '实施方案',
    assessment: '评估标准',
    provider: '定点机构',
    fund: '基金管理',
    service: '服务规范'
};

const tagMap = {
    policy: '政策发布',
    pilot: '试点进展',
    industry: '行业动态',
    data: '数据发布'
};

const tagClassMap = {
    policy: 'tag-policy',
    news: 'tag-news',
    alert: 'tag-alert'
};

// 通用 fetch 封装
async function apiGet(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

async function apiPost(path, body) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initUpdateTime();
    initNavigation();
    initSidebarFilters();
    initCitySort();
    initPolicyFilters();
    initSupervisionTabs();
    initNewsFilters();
    initGlobalSearch();
    initModal();
    renderAll();
});

function initUpdateTime() {
    const el = document.getElementById('updateTime');
    if (el) el.textContent = '2025-06-22';
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('active');
    renderAll();
}

function initSidebarFilters() {
    document.querySelectorAll('.filter-checkbox input').forEach(cb => {
        cb.addEventListener('change', () => renderAll());
    });
}

function getFilteredCities() {
    let cities = [...state.cachedCities];
    const batchAll = document.querySelector('[data-batch="all"]')?.checked ?? true;
    const batch1 = document.querySelector('[data-batch="1"]')?.checked ?? true;
    const batch2 = document.querySelector('[data-batch="2"]')?.checked ?? true;
    if (!batchAll) {
        cities = cities.filter(c => {
            if (c.batch === 1 && batch1) return true;
            if (c.batch === 2 && batch2) return true;
            return false;
        });
    }
    const regionChecks = {};
    document.querySelectorAll('#regionFilter input[type="checkbox"]').forEach(cb => {
        regionChecks[cb.dataset.region] = cb.checked;
    });
    if (!regionChecks['all']) {
        cities = cities.filter(c => regionChecks[c.region]);
    }
    return cities;
}

function initCitySort() {
    const sel = document.getElementById('citySortSelect');
    if (sel) sel.addEventListener('change', e => { state.citySort = e.target.value; renderCityGrid(); });
}

function sortCities(cities) {
    switch (state.citySort) {
        case 'policyDesc': return [...cities].sort((a, b) => b.policyCount - a.policyCount);
        case 'progressDesc': return [...cities].sort((a, b) => b.collectProgress - a.collectProgress);
        case 'updateDesc': return [...cities].sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
        default: return cities;
    }
}

function initPolicyFilters() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.policyFilter = btn.dataset.cat;
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderPolicyList();
        });
    });
    const ps = document.getElementById('policySearch');
    if (ps) ps.addEventListener('input', e => { state.policySearch = e.target.value.trim().toLowerCase(); renderPolicyList(); });
}

function initSupervisionTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.supervisionTab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSupervision();
        });
    });
}

function initNewsFilters() {
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.newsTag = btn.dataset.tag;
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderNewsList();
        });
    });
}

function initGlobalSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;
    input.addEventListener('keydown', async e => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (!query) return;
            const res = await apiPost('/api/search', { query });
            if (res) showSearchResults(res, query);
        }
    });
}

function showSearchResults(data, query) {
    alert(`搜索 "${query}" 找到 ${data.total} 条结果：\n政策: ${data.policies.length} 条\n新闻: ${data.news.length} 条\n监管: ${data.supervision.length} 条`);
}

function initModal() {
    const close = document.getElementById('modalClose');
    const overlay = document.querySelector('.modal-overlay');
    if (close) close.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
}

function openModal() {
    document.getElementById('cityModal')?.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('cityModal')?.classList.remove('show');
    document.body.style.overflow = '';
}

// ========== 渲染 ==========

async function renderAll() {
    if (state.currentView === 'overview') await renderOverview();
    if (state.currentView === 'cities') await renderCityGrid();
    if (state.currentView === 'policies') await renderPolicyList();
    if (state.currentView === 'supervision') await renderSupervision();
    if (state.currentView === 'news') await renderNewsList();
}

async function renderOverview() {
    if (!state.cachedCities.length) {
        const data = await apiGet('/api/cities');
        if (data) state.cachedCities = data.cities || [];
    }
    const cities = getFilteredCities();
    
    const overview = await apiGet('/api/overview');
    if (overview) {
        const s = overview.stats;
        document.getElementById('statCityCount').textContent = s.cityCount;
        document.getElementById('statPolicyCount').textContent = s.policyCount;
        document.getElementById('statNoticeCount').textContent = s.noticeCount;
        document.getElementById('statNewsCount').textContent = s.newsCount;
    }
    
    renderRegionGrid(cities);
    await renderTimeline();
    await renderAlertList();
    renderRankTable(cities);
}

function renderRegionGrid(cities) {
    const regions = {};
    cities.forEach(c => {
        if (!regions[c.region]) regions[c.region] = [];
        regions[c.region].push(c);
    });
    const regionNames = ['华东','华北','华南','华中','西南','西北','东北'];
    const html = regionNames.map(r => {
        const list = regions[r] || [];
        const cityTags = list.slice(0, 8).map(c => `<span class="city-tag">${c.name}</span>`).join('');
        const more = list.length > 8 ? `<span class="city-tag">+${list.length - 8}</span>` : '';
        return `
            <div class="region-card" data-region="${r}">
                <div class="region-name">${r}</div>
                <div class="region-count">${list.length} 个城市</div>
                <div class="region-cities">${cityTags}${more}</div>
            </div>`;
    }).join('');
    const el = document.getElementById('regionGrid');
    if (el) el.innerHTML = html;
}

async function renderTimeline() {
    const data = await apiGet('/api/timeline');
    if (!data || !data.timeline) return;
    const html = data.timeline.map(item => `
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-title">${item.title}</div>
                <div class="timeline-meta">${item.city} · ${item.date}</div>
                <span class="timeline-tag ${tagClassMap[item.tag] || ''}">${item.tag === 'policy' ? '政策' : item.tag === 'alert' ? '监管' : '动态'}</span>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('timelineLatest');
    if (el) el.innerHTML = html;
}

async function renderAlertList() {
    const data = await apiGet('/api/alerts');
    if (!data || !data.alerts) return;
    const html = data.alerts.map(item => `
        <div class="alert-item">
            <div class="alert-icon">⚠️</div>
            <div>
                <div class="alert-text">${item.text}</div>
                <div class="alert-date">${item.date}</div>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('alertList');
    if (el) el.innerHTML = html;
}

function renderRankTable(cities) {
    const sorted = [...cities].sort((a, b) => b.collectProgress - a.collectProgress).slice(0, 10);
    const html = `
        <div class="rank-row header">
            <div>排名</div><div>城市</div><div>收集进度</div><div>政策数</div><div>完成率</div>
        </div>
        ${sorted.map((c, i) => `
            <div class="rank-row">
                <div class="rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</div>
                <div class="rank-city">${c.name}</div>
                <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${c.collectProgress}%"></div></div>
                <div class="rank-value">${c.policyCount}</div>
                <div class="rank-value">${c.collectProgress}%</div>
            </div>
        `).join('')}`;
    const el = document.getElementById('rankTable');
    if (el) el.innerHTML = html;
}

async function renderCityGrid() {
    if (!state.cachedCities.length) {
        const data = await apiGet('/api/cities');
        if (data) state.cachedCities = data.cities || [];
    }
    let cities = getFilteredCities();
    cities = sortCities(cities);
    
    const html = cities.map(city => `
        <div class="city-card" data-city-id="${city.id}">
            <div class="city-card-header">
                <div class="city-card-name">${city.name}</div>
                <div class="city-card-batch">第${city.batch}批</div>
            </div>
            <div class="city-card-body">
                <div class="city-card-stats">
                    <div class="city-card-stat">
                        <div class="city-card-stat-num">${city.policyCount}</div>
                        <div class="city-card-stat-label">政策文件</div>
                    </div>
                    <div class="city-card-stat">
                        <div class="city-card-stat-num">${city.collectProgress}%</div>
                        <div class="city-card-stat-label">收集率</div>
                    </div>
                    <div class="city-card-stat">
                        <div class="city-card-stat-num">${city.publishProgress}%</div>
                        <div class="city-card-stat-label">公示率</div>
                    </div>
                </div>
                <div class="city-card-progress">
                    <div class="city-card-progress-item">
                        <span class="city-card-progress-label">政策收集</span>
                        <div class="city-card-progress-bar"><div class="city-card-progress-fill fill-collect" style="width:${city.collectProgress}%"></div></div>
                        <span class="city-card-progress-value">${city.collectProgress}%</span>
                    </div>
                    <div class="city-card-progress-item">
                        <span class="city-card-progress-label">政策梳理</span>
                        <div class="city-card-progress-bar"><div class="city-card-progress-fill fill-sort" style="width:${city.sortProgress}%"></div></div>
                        <span class="city-card-progress-value">${city.sortProgress}%</span>
                    </div>
                    <div class="city-card-progress-item">
                        <span class="city-card-progress-label">公示完成</span>
                        <div class="city-card-progress-bar"><div class="city-card-progress-fill fill-publish" style="width:${city.publishProgress}%"></div></div>
                        <span class="city-card-progress-value">${city.publishProgress}%</span>
                    </div>
                </div>
            </div>
            <div class="city-card-footer">
                <div class="city-card-update">更新: ${city.lastUpdate}</div>
                <div class="city-card-status ${city.status === 'active' ? 'status-active' : 'status-pending'}">${city.status === 'active' ? '正常推进' : '进度滞后'}</div>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('cityGrid');
    if (el) el.innerHTML = html || emptyState('暂无城市数据');
    
    document.querySelectorAll('.city-card').forEach(card => {
        card.addEventListener('click', () => showCityDetail(card.dataset.cityId));
    });
}

async function showCityDetail(cityId) {
    const data = await apiGet(`/api/cities/${cityId}`);
    if (!data || !data.city) return;
    const city = data.city;
    const cityPolicies = data.policies || [];
    
    document.getElementById('modalCityTitle').textContent = `${city.name} 长护险监测详情`;
    document.getElementById('modalCityBody').innerHTML = `
        <div class="city-detail-header">
            <div class="city-detail-icon">🏙️</div>
            <div class="city-detail-info">
                <h4>${city.name}</h4>
                <div class="city-detail-meta">
                    <span>${city.region}</span>
                    <span>第${city.batch}批试点</span>
                    <span>${city.status === 'active' ? '正常推进' : '进度滞后'}</span>
                </div>
            </div>
        </div>
        <div class="city-detail-section">
            <h5>📊 进度概览</h5>
            <table class="detail-table">
                <tr><th>指标</th><th>进度</th><th>状态</th></tr>
                <tr><td>政策收集</td><td>${city.collectProgress}%</td><td>${city.collectProgress >= 90 ? '已完成' : '进行中'}</td></tr>
                <tr><td>政策梳理</td><td>${city.sortProgress}%</td><td>${city.sortProgress >= 90 ? '已完成' : '进行中'}</td></tr>
                <tr><td>公示完成</td><td>${city.publishProgress}%</td><td>${city.publishProgress >= 90 ? '已完成' : '进行中'}</td></tr>
            </table>
        </div>
        <div class="city-detail-section">
            <h5>📋 已收集政策 (${cityPolicies.length}项)</h5>
            ${cityPolicies.length > 0 ? `
                <table class="detail-table">
                    <tr><th>政策名称</th><th>类别</th><th>发布日期</th></tr>
                    ${cityPolicies.map(p => `
                        <tr><td>${p.important ? '🔴 ' : ''}${p.title}</td><td>${categoryMap[p.category] || p.category}</td><td>${p.date}</td></tr>
                    `).join('')}
                </table>
            ` : '<p>暂无已收集政策数据</p>'}
        </div>
        <div class="city-detail-section">
            <h5>🔍 监管信息</h5>
            <p>该城市暂无重大监管通报记录。日常监督检查运行正常。</p>
        </div>
    `;
    openModal();
}

async function renderPolicyList() {
    const data = await apiGet('/api/policies', { category: state.policyFilter, search: state.policySearch });
    if (!data || !data.policies) return;
    const policies = data.policies;
    const html = policies.map(p => `
        <div class="policy-item">
            <div class="policy-info">
                <div class="policy-title">${p.important ? '🔴 ' : ''}${p.title}</div>
                <div class="policy-meta">
                    <span>📍 ${p.city}</span>
                    <span>📅 ${p.date}</span>
                    <span>🏷️ ${categoryMap[p.category] || p.category}</span>
                </div>
            </div>
            <div class="policy-tags">
                <span class="policy-tag ${p.important ? 'important' : ''}">${p.important ? '重要' : '一般'}</span>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('policyList');
    if (el) el.innerHTML = html || emptyState('暂无匹配政策');
}

async function renderSupervision() {
    const data = await apiGet('/api/supervision', { tab: state.supervisionTab });
    if (!data || !data.supervision) return;
    const items = data.supervision;
    const html = items.map(s => `
        <div class="supervision-item">
            <div class="supervision-header">
                <div class="supervision-title">${s.title}</div>
                <div class="supervision-level level-${s.level}">${s.level === 'high' ? '高' : s.level === 'medium' ? '中' : '低'}风险</div>
            </div>
            <div class="supervision-desc">${s.desc}</div>
            <div class="supervision-footer">
                <div class="supervision-source">📍 ${s.source}</div>
                <div class="supervision-date">📅 ${s.date}</div>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('supervisionContent');
    if (el) el.innerHTML = html || emptyState('暂无监管信息');
}

async function renderNewsList() {
    const data = await apiGet('/api/news', { tag: state.newsTag });
    if (!data || !data.news) return;
    const news = data.news;
    const html = news.map(n => `
        <div class="news-item">
            <div class="news-thumb">📰</div>
            <div class="news-content">
                <div class="news-title">${n.title}</div>
                <div class="news-summary">${n.summary}</div>
                <div class="news-footer">
                    <div class="news-source">📍 ${n.source}</div>
                    <div class="news-date">📅 ${n.date} · ${tagMap[n.tag] || n.tag}</div>
                </div>
            </div>
        </div>
    `).join('');
    const el = document.getElementById('newsList');
    if (el) el.innerHTML = html || emptyState('暂无新闻');
}

function emptyState(text) {
    return `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">${text}</div></div>`;
}

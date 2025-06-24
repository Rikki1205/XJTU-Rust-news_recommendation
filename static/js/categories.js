// 新闻分类功能增强脚本

// 全局变量
// 避免变量冲突，使用更具体的命名
let newsCategoryActive = 'all';
let categoryIcons = {
    '政治': 'fas fa-landmark',
    '经济': 'fas fa-chart-line',
    '科技': 'fas fa-microchip',
    '体育': 'fas fa-futbol',
    '娱乐': 'fas fa-film',
    '健康': 'fas fa-heartbeat',
    '教育': 'fas fa-graduation-cap',
    '环境': 'fas fa-leaf',
    '国际': 'fas fa-globe',
    '社会': 'fas fa-users',
    'all': 'fas fa-th-large'
};

// 初始化分类按钮
function initCategoryButtons() {
    // 为每个分类按钮添加图标
    document.querySelectorAll('.category-btn').forEach(btn => {
        const category = btn.getAttribute('data-category');
        const icon = categoryIcons[category] || 'fas fa-tag';

        // 添加图标到按钮
        if (!btn.querySelector('i')) {
            btn.innerHTML = `<i class="${icon}"></i> ${btn.textContent}`;
        }

        // 绑定点击事件
        btn.addEventListener('click', function () {
            if (!hasInitialCrawl) {
                alert('请先点击"开始爬取"按钮获取新闻');
                return;
            }

            // 更新活动类别
            newsCategoryActive = this.dataset.category;

            // 更新按钮状态
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 筛选显示新闻
            filterNewsByCategory(newsCategoryActive);

            // 记录用户分类选择
            recordCategorySelection(newsCategoryActive);
        });
    });
}

// 根据类别筛选新闻
function filterNewsByCategory(category) {
    // 显示加载动画
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载${category === 'all' ? '所有' : category}类新闻...</p>
        </div>
    `;

    // 如果是"全部"类别，直接从服务器获取推荐新闻
    if (category === 'all') {
        fetchRecommendations();
        return;
    }

    // 否则，从服务器获取特定类别的新闻
    // 修正API路径
    fetch(`/api/v1/articles?category=${category}&page=1&limit=100`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取${category}类新闻失败`);
            }
            return response.json();
        })
        .then(data => {
            newsData = data;
            renderNewsCards(data);
        })
        .catch(error => {
            console.error('Error fetching category news:', error);

            // 如果服务器获取失败，尝试从现有数据中筛选
            if (newsData && newsData.length > 0) {
                const filteredNews = newsData.filter(news => news.category === category);
                if (filteredNews.length > 0) {
                    renderNewsCards(filteredNews);
                } else {
                    newsContainer.innerHTML = `
                        <div class="no-content">
                            <i class="fas fa-newspaper"></i>
                            <p>暂无${category}类新闻</p>
                        </div>
                    `;
                }
            } else {
                newsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>获取${category}类新闻时出错，请稍后再试</p>
                        <button class="btn retry-btn">重试</button>
                    </div>
                `;
                document.querySelector('.retry-btn').addEventListener('click', () => filterNewsByCategory(category));
            }
        });
}

// 记录用户分类选择
function recordCategorySelection(category) {
    // 获取用户分类选择历史
    let categorySelections = JSON.parse(localStorage.getItem('categorySelections') || '[]');

    // 添加新的选择记录
    categorySelections.push({
        category: category,
        timestamp: Date.now()
    });

    // 限制历史记录数量
    if (categorySelections.length > 50) {
        categorySelections = categorySelections.slice(-50);
    }

    // 保存到本地存储
    localStorage.setItem('categorySelections', JSON.stringify(categorySelections));

    // 发送到服务器 - 修正API路径
    fetch('/api/v1/users/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
            user_id: currentUser.id,
            category: category,
            timestamp: Date.now()
        }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('记录分类选择失败');
            }
            return response.json();
        })
        .then(data => {
            console.log('分类选择记录成功:', data);
        })
        .catch(error => {
            console.error('记录分类选择出错:', error);
            // 这里不显示错误，因为本地存储已经更新成功
        });
}

// 增强新闻卡片渲染
function renderNewsCards(news) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';

    if (!news || news.length === 0) {
        container.innerHTML = `
            <div class="no-content">
                <i class="fas fa-newspaper"></i>
                <p>暂无推荐内容</p>
            </div>
        `;
        return;
    }

    // 创建新闻卡片
    news.forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.dataset.id = item.id || '';
        card.dataset.category = item.categories?.[0] || 'unknown';

        // 安全地格式化日期
        let formattedDate = '未知日期';
        try {
            const publishDate = new Date(item.published_at || item.crawled_at || Date.now());
            if (!isNaN(publishDate.getTime())) {
                formattedDate = publishDate.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.warn('日期格式化失败:', error);
        }

        // 检查用户是否已经对此新闻提供反馈
        const hasFeedback = userFeedbackHistory && userFeedbackHistory.hasOwnProperty(item.id);

        // 获取分类图标
        const categoryIcon = categoryIcons[item.category] || 'fas fa-tag';

        // 处理图片URL - 如果没有图片，使用默认图片
        const imageUrl = item.image_url || item.imageUrl || '/static/images/default-news.svg';

        // 安全地获取字段值
        const title = item.title || '无标题';
        const summary = item.summary || item.content ?
            (item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content) :
            '暂无摘要';
        const category = item.category || '未分类';
        const url = item.url || '#';
        const readCount = item.read_count || 0;
        const likeCount = item.like_count || 0;

        card.innerHTML = `
            <div class="news-card-image">
                <img src="/api/v1/images?url=${item.url}" alt="${title}" 
                style="max-width:100%"
                onerror="this.src='/static/images/default-news.svg'">
                ${hasFeedback ? '<div class="feedback-badge">已反馈</div>' : ''}
            </div>
            <div class="news-card-content">
                <span class="category-tag"><i class="${categoryIcon}"></i> ${category}</span>
                <h3 class="news-card-title"><a href="${url}" target="_blank">${title}</a></h3>
                <p class="news-card-summary">${summary}</p>
                <div class="news-card-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                </div>
                <div class="news-card-actions">
                    <button class="news-card-action-btn" data-action="like" data-id="${item.id}">
                        <i class="far fa-thumbs-up"></i> 点赞
                    </button>
                    <button class="news-card-action-btn" data-action="favorite" data-id="${item.id}">
                        <i class="far fa-bookmark"></i> 收藏
                    </button>
                </div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', function (e) {
            // 如果点击的是互动按钮或链接，不打开模态框
            if (e.target.closest('.news-card-action-btn') || e.target.closest('a')) {
                e.stopPropagation();

                // 如果是按钮，处理交互
                if (e.target.closest('.news-card-action-btn')) {
                    const button = e.target.closest('.news-card-action-btn');
                    const action = button.getAttribute('data-action');
                    const newsId = button.getAttribute('data-id');

                    handleCardInteraction(action, newsId, button);
                }
                return;
            }

            openNewsModal(item);
        });

        container.appendChild(card);
    });

    // 应用用户互动状态到卡片
    applyInteractionsToCards();
}

// 处理卡片上的互动
function handleCardInteraction(action, newsId, button) {
    // 确保用户互动对象中有该新闻的记录
    if (!userInteractions[newsId]) {
        userInteractions[newsId] = {
            liked: false,
            favorited: false,
            timestamp: Date.now()
        };
    }

    switch (action) {
        case 'like':
            // 切换点赞状态
            const isLiked = userInteractions[newsId].liked;
            userInteractions[newsId].liked = !isLiked;

            // 更新UI
            if (userInteractions[newsId].liked) {
                button.innerHTML = '<i class="fas fa-thumbs-up"></i> 已点赞';
                button.classList.add('active');
            } else {
                button.innerHTML = '<i class="far fa-thumbs-up"></i> 点赞';
                button.classList.remove('active');
            }

            // 发送到服务器
            sendInteractionToServer(newsId, 'like', userInteractions[newsId].liked);
            break;

        case 'comment':
            // 打开新闻模态框并滚动到评论区
            const article = newsData.find(news => news.id === parseInt(newsId));
            if (article) {
                openNewsModal(article);
                setTimeout(() => {
                    scrollToComments();
                }, 500);
            }
            break;

        case 'favorite':
            // 切换收藏状态
            const isFavorited = userInteractions[newsId].favorited;
            userInteractions[newsId].favorited = !isFavorited;

            // 更新UI
            if (userInteractions[newsId].favorited) {
                button.innerHTML = '<i class="fas fa-bookmark"></i> 已收藏';
                button.classList.add('active');
            } else {
                button.innerHTML = '<i class="far fa-bookmark"></i> 收藏';
                button.classList.remove('active');
            }

            // 发送到服务器
            sendInteractionToServer(newsId, 'favorite', userInteractions[newsId].favorited);
            break;

        default:
            console.error('未知的互动类型:', action);
    }

    // 更新本地存储
    userInteractions[newsId].timestamp = Date.now();
    localStorage.setItem('userInteractions', JSON.stringify(userInteractions));
}

// 应用用户互动状态到卡片
function applyInteractionsToCards() {
    // 遍历所有新闻卡片
    document.querySelectorAll('.news-card').forEach(card => {
        const newsId = card.dataset.id;

        // 如果用户对该新闻有互动记录
        if (userInteractions[newsId]) {
            // 应用点赞状态
            const likeBtn = card.querySelector('[data-action="like"]');
            if (likeBtn && userInteractions[newsId].liked) {
                likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> 已点赞';
                likeBtn.classList.add('active');
            }

            // 应用收藏状态
            const favoriteBtn = card.querySelector('[data-action="favorite"]');
            if (favoriteBtn && userInteractions[newsId].favorited) {
                favoriteBtn.innerHTML = '<i class="fas fa-bookmark"></i> 已收藏';
                favoriteBtn.classList.add('active');
            }
        }
    });
}

// 在页面加载时初始化分类按钮
document.addEventListener('DOMContentLoaded', function () {
    initCategoryButtons();
});

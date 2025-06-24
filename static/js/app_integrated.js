// 整合后的app.js和categories.js文件

// 全局变量
let currentUserId = localStorage.getItem('userId') || generateUUID();
let newsData = [];
let activeCategory = 'all';
let userFeedbackHistory = JSON.parse(localStorage.getItem('userFeedbackHistory') || '{}');
let hasInitialCrawl = false; // 标记是否已经进行过初始爬取
let currentNewsId = null;
let commentsData = [];
let userInteractions = JSON.parse(localStorage.getItem('userInteractions') || '{}');

// 分类相关的图标映射
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

// 将startCrawler函数暴露到全局作用域
window.startCrawler = async function () {
    console.log('开始执行爬虫函数');
    const button = document.getElementById('start-crawler');
    const recrawlButton = document.getElementById('recrawl-button');

    if (!button) {
        console.error('未找到开始爬取按钮');
        return;
    }

    // 防止重复点击
    if (button.disabled) {
        console.log('爬虫正在运行中，忽略重复点击');
        return;
    }

    // 保存原始状态
    const originalButtonText = button.innerHTML;
    const originalRecrawlText = recrawlButton ? recrawlButton.innerHTML : '';
    const originalButtonDisabled = button.disabled;
    const originalRecrawlDisabled = recrawlButton ? recrawlButton.disabled : false;

    console.log('保存原始按钮状态:', {
        buttonText: originalButtonText,
        recrawlText: originalRecrawlText,
        buttonDisabled: originalButtonDisabled,
        recrawlDisabled: originalRecrawlDisabled
    });

    // 创建按钮状态恢复函数
    const restoreButtonStates = () => {
        console.log('恢复按钮状态');

        // 恢复主按钮
        if (button) {
            button.disabled = originalButtonDisabled;
            button.innerHTML = originalButtonText;
            console.log('主按钮已恢复:', button.innerHTML);
        }

        // 恢复重新爬取按钮
        if (recrawlButton) {
            recrawlButton.disabled = originalRecrawlDisabled;
            recrawlButton.innerHTML = originalRecrawlText;
            console.log('重新爬取按钮已恢复:', recrawlButton.innerHTML);
        }
    };

    // 设置按钮为加载状态
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在爬取...';

    if (recrawlButton) {
        recrawlButton.disabled = true;
        recrawlButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在爬取...';
    }

    let progressElement = null;

    try {
        console.log('创建进度条');
        // 模拟爬虫进度
        progressElement = document.createElement('div');
        progressElement.className = 'crawler-progress';
        progressElement.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar"></div>
            </div>
            <div class="progress-text">正在爬取新闻...</div>
        `;

        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            // 移除已有的进度条
            const existingProgress = heroContent.querySelector('.crawler-progress');
            if (existingProgress) {
                existingProgress.remove();
            }

            heroContent.appendChild(progressElement);
            console.log('进度条已添加到页面');
        } else {
            console.error('未找到hero-content元素');
        }

        // 模拟爬虫进度
        const progressBar = progressElement.querySelector('.progress-bar');
        const progressText = progressElement.querySelector('.progress-text');
        const steps = [
            '正在初始化爬虫...',
            '正在连接目标网站...',
            '正在解析页面内容...',
            '正在提取新闻数据...',
            '正在保存到数据库...',
            '正在更新推荐列表...'
        ];

        for (let i = 0; i < steps.length; i++) {
            console.log('执行步骤:', steps[i]);
            if (progressText) {
                progressText.textContent = steps[i];
            }
            if (progressBar) {
                progressBar.style.width = `${((i + 1) / steps.length) * 100}%`;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 爬取完成后刷新推荐列表
        console.log('开始刷新推荐列表');
        await fetchRecommendations();
        hasInitialCrawl = true; // 标记已经完成初始爬取

        // 显示成功消息
        if (progressText) {
            progressText.textContent = '爬取完成！';
            progressText.style.color = 'var(--success-color)';
        }

        console.log('爬取流程完成');

    } catch (error) {
        console.error('爬虫出错:', error);

        // 显示错误消息
        if (progressElement) {
            const progressText = progressElement.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = '爬取失败，请稍后重试';
                progressText.style.color = 'var(--error-color)';
            }
        }

        // 显示用户友好的错误提示
        setTimeout(() => {
            alert('爬虫过程中出现错误，请稍后重试');
        }, 2000);

    } finally {
        // 立即恢复按钮状态
        console.log('在finally块中恢复按钮状态');
        restoreButtonStates();

        // 延迟移除进度条
        if (progressElement && progressElement.parentNode) {
            setTimeout(() => {
                try {
                    progressElement.remove();
                    console.log('进度条已移除');
                } catch (e) {
                    console.warn('移除进度条时出错:', e);
                }
            }, 2000);
        }
    }
};

// 在页面加载时初始化
window.onload = function () {
    console.log('页面加载完成');

    // 保存用户ID到本地存储
    localStorage.setItem('userId', currentUserId);

    // 初始状态不加载新闻，等待用户点击爬取按钮
    document.getElementById('news-container').innerHTML = `
        <div class="no-content">
            <i class="fas fa-newspaper"></i>
            <p>暂无新闻内容，请点击"开始爬取"按钮获取最新新闻</p>
        </div>
    `;

    // 设置刷新按钮事件
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.onclick = function () {
            if (hasInitialCrawl) {
                fetchRecommendations();
            } else {
                alert('请先点击"开始爬取"按钮获取新闻');
            }
        };
    }

    // 设置开始爬取按钮事件
    const startCrawlerBtn = document.getElementById('start-crawler');
    if (startCrawlerBtn) {
        console.log('找到开始爬取按钮');
        startCrawlerBtn.onclick = function () {
            console.log('点击开始爬取按钮');
            startCrawler();
        };
    } else {
        console.error('未找到开始爬取按钮');
    }

    // 设置重新爬取按钮事件
    const recrawlBtn = document.getElementById('recrawl-button');
    if (recrawlBtn) {
        recrawlBtn.onclick = function () {
            console.log('点击重新爬取按钮');
            startCrawler();
        };
    }

    // 初始化分类按钮
    initCategoryButtons();

    // 设置模态框关闭按钮事件
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // 点击模态框外部关闭
    window.onclick = function (event) {
        const modal = document.getElementById('news-modal');
        if (event.target == modal) {
            closeModal();
        }
    };

    // 设置评论表单
    setupCommentForm();
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
            activeCategory = this.dataset.category;

            // 更新按钮状态
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 筛选显示新闻
            filterNewsByCategory(activeCategory);

            // 记录用户分类选择
            recordCategorySelection(activeCategory);
        });
    });
}

// 生成UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 获取推荐新闻
function fetchRecommendations() {
    // 显示加载动画
    document.getElementById('news-container').innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载推荐内容...</p>
        </div>
    `;

    // 获取推荐API
    fetch(`/api/v1/news/articles?page=1&limit=100`)
        .then(response => response.json())
        .then(data => {
            newsData = data;
            renderNewsCards(data);

            // 如果有活动类别筛选，应用筛选
            if (activeCategory !== 'all') {
                filterNewsByCategory(activeCategory);
            }
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            document.getElementById('news-container').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>获取推荐内容时出错，请稍后再试</p>
                    <button class="btn retry-btn">重试</button>
                </div>
            `;
            document.querySelector('.retry-btn').addEventListener('click', fetchRecommendations);
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
    fetch(`/api/v1/articles?category=${category}&page=1&limit=20`)
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
                const filteredNews = newsData.filter(news => {
                    // 检查新闻的分类是否匹配
                    return news.categories && news.categories.includes(category);
                });
                
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

    // 发送到服务器
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id) {
        fetch('/api/v1/users/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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
}

// 渲染新闻卡片
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
        
        // 设置分类，使用第一个分类作为主分类
        const category = item.categories?.[0] || '未分类';
        card.dataset.category = category;

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
        const categoryIcon = categoryIcons[category] || 'fas fa-tag';

        // 处理图片URL - 如果没有图片，使用默认图片
        const imageUrl = item.image_url || item.imageUrl || '/static/images/default-news.svg';

        // 安全地获取字段值
        const title = item.title || '无标题';
        const summary = item.summary || item.content ?
            (item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content) :
            '暂无摘要';
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
                    <button class="news-card-action-btn" data-action="comment" data-id="${item.id}">
                        <i class="far fa-comment"></i> 评论
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

                    handleCardInteraction(newsId, action, button);
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

// 打开新闻详情模态框
function openNewsModal(newsItem) {
    const modal = document.getElementById('news-modal');

    if (!modal) {
        console.error('未找到新闻模态框');
        return;
    }

    // 设置新闻ID
    modal.dataset.newsId = newsItem.id || '';
    currentNewsId = newsItem.id;

    // 安全地获取字段值
    const title = newsItem.title || '无标题';
    const category = newsItem.categories?.[0] || '未分类';
    const content = newsItem.content || '暂无内容';
    const author = newsItem.author || newsItem.source_name || '未知作者';
    const keywords = newsItem.keywords || [];

    // 填充内容
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const modalDate = document.getElementById('modal-date');
    const modalAuthor = document.getElementById('modal-author');
    const modalContent = document.getElementById('modal-content');

    if (modalTitle) modalTitle.textContent = title;
    if (modalCategory) modalCategory.textContent = category;
    if (modalAuthor) modalAuthor.textContent = `来源: ${author}`;

    // 安全地格式化日期
    let formattedDate = '未知日期';
    try {
        const publishDate = new Date(newsItem.published_at || newsItem.published_date || newsItem.crawled_at || Date.now());
        if (!isNaN(publishDate.getTime())) {
            formattedDate = publishDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (error) {
        console.warn('模态框日期格式化失败:', error);
    }

    if (modalDate) modalDate.textContent = formattedDate;

    // 处理内容
    if (modalContent) {
        let contentHtml = `<p>${content.split('\n\n').join('</p><p>')}</p>`;

        // 如果有关键词，添加关键词部分
        if (keywords.length > 0) {
            contentHtml += `
                <div class="news-keywords">
                    <h4>相关关键词:</h4>
                    <div class="keyword-tags">
                        ${keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        modalContent.innerHTML = contentHtml;
    }

    // 检查用户是否已经对这篇文章提供过反馈
    const newsReactions = document.querySelector('.news-reactions');
    if (newsReactions) {
        if (userFeedbackHistory && userFeedbackHistory[newsItem.id] !== undefined) {
            // 用户已经对这篇文章提供了反馈
            let ratingText = '';
            const rating = userFeedbackHistory[newsItem.id];
            if (rating <= 3) {
                ratingText = '不感兴趣';
            } else if (rating <= 7) {
                ratingText = '一般';
            } else {
                ratingText = '很有用';
            }

            newsReactions.innerHTML = `
                <h4>您的反馈</h4>
                <div class="rating-success">
                    <i class="fas fa-check-circle"></i>
                    <p>您已对此文章评价为：${ratingText}</p>
                </div>
            `;
        } else {
            // 重新绑定评分按钮事件
            document.querySelectorAll('.rating-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const rating = parseFloat(this.dataset.rating);
                    const newsId = modal.dataset.newsId;
                    sendRating(newsId, rating);
                });
            });
        }
    }

    // 加载评论
    loadComments(newsItem.id);

    // 显示模态框
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 关闭新闻详情模态框
function closeModal() {
    const modal = document.getElementById('news-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢复背景滚动
}

// 发送用户评分
function sendRating(newsId, rating) {
    const data = {
        user_id: currentUserId,
        news_id: parseInt(newsId),
        rating: rating
    };

    fetch('/api/interaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            // 记录用户对此新闻的反馈
            userFeedbackHistory[newsId] = rating;
            localStorage.setItem('userFeedbackHistory', JSON.stringify(userFeedbackHistory));

            // 显示评分成功
            const ratingButtons = document.querySelector('.rating-buttons');
            ratingButtons.innerHTML = `
            <div class="rating-success">
                <i class="fas fa-check-circle"></i>
                <p>感谢您的反馈！</p>
            </div>
        `;

            // 2秒后关闭模态框
            setTimeout(closeModal, 2000);

            // 3秒后刷新推荐
            setTimeout(fetchRecommendations, 3000);
        })
        .catch(error => {
            console.error('Error sending rating:', error);
        });
}

// 处理新闻卡片互动（点赞、评论、收藏）
async function handleCardInteraction(articleId, action, element) {
    console.log(`处理互动: ${action} for article ${articleId}`);

    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    const currentUser = getCurrentUser();

    if (!token || !currentUser || !currentUser.username) {
        showNotification('请先登录后再进行操作', 'warning');
        // 跳转到登录页面
        setTimeout(() => {
            window.location.href = '/auth.html';
        }, 1500);
        return;
    }

    try {
        let response;

        switch (action) {
            case 'like':
                // 切换点赞状态
                const isLiked = element.classList.contains('active');
                response = await fetch('/api/v1/interactions/interactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        article_id: articleId,
                        interaction_type: 'like',
                        is_active: !isLiked
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    element.classList.toggle('active');

                    // 更新点赞数和图标
                    const icon = element.querySelector('i');
                    const countElement = element.querySelector('.interaction-count');

                    if (element.classList.contains('active')) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        if (countElement) {
                            let count = parseInt(countElement.textContent) || 0;
                            countElement.textContent = count + 1;
                        }
                        showNotification('点赞成功', 'success');
                    } else {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                        if (countElement) {
                            let count = parseInt(countElement.textContent) || 0;
                            countElement.textContent = Math.max(0, count - 1);
                        }
                        showNotification('取消点赞', 'info');
                    }
                } else {
                    throw new Error('点赞操作失败');
                }
                break;

            case 'comment':
                // 打开评论模态框
                openCommentModal(articleId);
                break;

            case 'favorite':
                // 切换收藏状态
                const isFavorited = element.classList.contains('active');

                if (isFavorited) {
                    // 取消收藏
                    response = await fetch(`/api/v1/interactions/favorites/${articleId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                } else {
                    // 添加收藏
                    response = await fetch('/api/v1/interactions/favorites', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            article_id: articleId,
                            folder_name: 'default'
                        })
                    });
                }

                if (response.ok) {
                    element.classList.toggle('active');

                    // 更新收藏图标和计数
                    const icon = element.querySelector('i');
                    const countElement = element.querySelector('.interaction-count');

                    if (element.classList.contains('active')) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        if (countElement) {
                            let count = parseInt(countElement.textContent) || 0;
                            countElement.textContent = count + 1;
                        }
                        showNotification('收藏成功', 'success');
                    } else {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                        if (countElement) {
                            let count = parseInt(countElement.textContent) || 0;
                            countElement.textContent = Math.max(0, count - 1);
                        }
                        showNotification('取消收藏', 'info');
                    }
                } else {
                    throw new Error('收藏操作失败');
                }
                break;

            default:
                console.warn('未知的互动类型:', action);
        }

        // 保存互动状态到本地存储
        saveInteractionState(articleId, action, element.classList.contains('active'));

    } catch (error) {
        console.error('互动操作失败:', error);
        showNotification('操作失败，请稍后重试', 'error');
    }
}

// 保存互动状态到本地存储
function saveInteractionState(articleId, action, isActive) {
    const interactions = JSON.parse(localStorage.getItem('userInteractions') || '{}');
    if (!interactions[articleId]) {
        interactions[articleId] = {};
    }
    interactions[articleId][action] = isActive;
    localStorage.setItem('userInteractions', JSON.stringify(interactions));
}

// 从本地存储恢复互动状态
function restoreInteractionStates() {
    const interactions = JSON.parse(localStorage.getItem('userInteractions') || '{}');

    Object.keys(interactions).forEach(articleId => {
        const articleInteractions = interactions[articleId];

        Object.keys(articleInteractions).forEach(action => {
            const isActive = articleInteractions[action];

            // 查找对应的按钮
            const button = document.querySelector(`[data-id="${articleId}"][data-action="${action}"]`);

            if (button && isActive) {
                button.classList.add('active');

                // 更新图标
                const icon = button.querySelector('i');
                if (icon) {
                    if (action === 'like' || action === 'favorite') {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                }
            }
        });
    });

    // 从服务器获取用户的交互状态（如果已登录）
    const token = localStorage.getItem('auth_token');
    if (token) {
        loadUserInteractionsFromServer();
    }
}

// 从服务器加载用户交互状态
async function loadUserInteractionsFromServer() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        // 获取用户的点赞记录
        const likesResponse = await fetch('/api/v1/interactions/users/interactions?interaction_type=like', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (likesResponse.ok) {
            const likes = await likesResponse.json();
            likes.forEach(interaction => {
                if (interaction.is_active) {
                    const button = document.querySelector(`[data-id="${interaction.article_id}"][data-action="like"]`);
                    if (button) {
                        button.classList.add('active');
                        const icon = button.querySelector('i');
                        if (icon) {
                            icon.classList.remove('far');
                            icon.classList.add('fas');
                        }
                    }
                }
            });
        }

        // 获取用户的收藏记录
        const favoritesResponse = await fetch('/api/v1/interactions/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (favoritesResponse.ok) {
            const favorites = await favoritesResponse.json();
            favorites.forEach(favorite => {
                const button = document.querySelector(`[data-id="${favorite.article_id}"][data-action="favorite"]`);
                if (button) {
                    button.classList.add('active');
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                }
            });
        }

    } catch (error) {
        console.error('加载用户交互状态失败:', error);
    }
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

// 打开评论模态框
function openCommentModal(articleId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    const currentUser = getCurrentUser();

    if (!token || !currentUser || !currentUser.username) {
        showNotification('请先登录后再进行操作', 'warning');
        setTimeout(() => {
            window.location.href = '/auth.html';
        }, 1500);
        return;
    }

    // 查找对应的新闻项
    const newsItem = newsData.find(item => item.id == articleId);
    if (newsItem) {
        // 使用openNewsModal打开模态框
        openNewsModal(newsItem);
        
        // 滚动到评论区
        setTimeout(() => {
            const commentsSection = document.querySelector('.news-comments');
            if (commentsSection) {
                commentsSection.scrollIntoView({ behavior: 'smooth' });
            }

            // 聚焦到评论输入框
            const commentTextarea = document.getElementById('comment-text');
            if (commentTextarea) {
                commentTextarea.focus();
            }
        }, 300);
    } else {
        console.error('未找到对应的新闻项:', articleId);
        showNotification('无法打开评论，请稍后重试', 'error');
    }
}

// 加载文章评论
function loadComments(newsId) {
    currentNewsId = newsId;
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) {
        // 如果不存在评论容器，创建一个
        const commentsSection = document.querySelector('.news-comments');
        if (commentsSection) {
            const container = document.createElement('div');
            container.id = 'comments-container';
            commentsSection.appendChild(container);
        } else {
            console.error('未找到评论区域');
            return;
        }
    }
    
    // 显示加载中
    commentsContainer.innerHTML = `
        <div class="loading-comments">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载评论...</p>
        </div>
    `;
    
    try {
        // 从本地存储获取评论数据
        const allComments = JSON.parse(localStorage.getItem('comments') || '[]');
        // 筛选当前文章的评论
        const articleComments = allComments.filter(comment => comment.article_id == newsId);
        
        // 更新全局评论数据
        commentsData = articleComments;
        
        // 渲染评论
        renderComments(articleComments);
    } catch (error) {
        console.error('获取评论出错:', error);
        commentsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>获取评论时出错，请稍后再试</p>
                <button class="btn retry-btn">重试</button>
            </div>
        `;
        document.querySelector('.retry-btn').addEventListener('click', () => loadComments(newsId));
    }
}

// 渲染评论列表
function renderComments(comments) {
    const commentsContainer = document.getElementById('comments-container');
    
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = `
            <div class="no-comments">
                <i class="far fa-comment-alt"></i>
                <p>暂无评论，快来发表第一条评论吧</p>
            </div>
        `;
        return;
    }
    
    // 清空容器
    commentsContainer.innerHTML = '';
    
    // 创建评论列表
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    
    // 添加评论
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        
        // 格式化日期
        const commentDate = new Date(comment.created_at);
        const formattedDate = commentDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 检查是否是当前用户的评论
        const currentUser = getCurrentUser();
        const isCurrentUser = currentUser && comment.user_id === currentUser.id;
        const deleteButton = isCurrentUser ? `<button class="delete-comment" data-id="${comment.id}"><i class="fas fa-trash-alt"></i></button>` : '';
        
        commentItem.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <i class="fas fa-user-circle"></i>
                    <span>${comment.username || '匿名用户'}</span>
                </div>
                <div class="comment-actions">
                    <span class="comment-date">${formattedDate}</span>
                    ${deleteButton}
                </div>
            </div>
            <div class="comment-content">
                <p>${escapeHtml(comment.content)}</p>
            </div>
        `;
        
        // 添加删除评论事件
        if (isCurrentUser) {
            commentItem.querySelector('.delete-comment').addEventListener('click', function() {
                const commentId = this.getAttribute('data-id');
                deleteComment(commentId);
            });
        }
        
        commentsList.appendChild(commentItem);
    });
    
    commentsContainer.appendChild(commentsList);
    
    // 绑定提交评论事件
    setupCommentForm();
}

// 设置评论表单
function setupCommentForm() {
    const submitButton = document.getElementById('submit-comment');
    const commentTextarea = document.getElementById('comment-text');
    
    if (!submitButton || !commentTextarea) {
        return;
    }
    
    // 移除之前的事件监听器
    submitButton.replaceWith(submitButton.cloneNode(true));
    const newSubmitButton = document.getElementById('submit-comment');
    
    // 允许所有用户发表评论，无论是否登录
    commentTextarea.placeholder = '请输入您的评论...';
    commentTextarea.disabled = false;
    newSubmitButton.textContent = '提交评论';
    newSubmitButton.disabled = false;
    newSubmitButton.addEventListener('click', submitComment);
    
    // 添加键盘快捷键支持
    commentTextarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            submitComment();
        }
    });
}

// 提交评论
function submitComment() {
    const commentText = document.getElementById('comment-text').value.trim();
    
    if (!commentText) {
        alert('评论内容不能为空');
        return;
    }
    
    if (commentText.length > 500) {
        alert('评论内容不能超过500个字符');
        return;
    }
    
    // 禁用提交按钮
    const submitButton = document.getElementById('submit-comment');
    const commentTextarea = document.getElementById('comment-text');
    submitButton.disabled = true;
    commentTextarea.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    
    // 获取当前用户信息
    const currentUser = getCurrentUser();
    const username = currentUser ? currentUser.username : '匿名用户';
    const userId = currentUser ? currentUser.id : generateUUID();
    
    // 准备评论数据
    const commentData = {
        article_id: currentNewsId,
        content: commentText,
        created_at: new Date().toISOString(),
        type: 'comment',
        article_title: document.querySelector('#modal-title')?.textContent || `文章 #${currentNewsId}`,
        id: crypto.randomUUID(),
        username: username,
        user_id: userId
    };

    // 获取现有评论并添加新评论
    const comments = JSON.parse(localStorage.getItem('comments') || '[]');
    comments.push(commentData);
    localStorage.setItem('comments', JSON.stringify(comments));
    
    // 清空评论框
    commentTextarea.value = '';
    // 显示成功消息
    showCommentFeedback('评论发表成功');
    
    // 恢复提交按钮
    submitButton.disabled = false;
    commentTextarea.disabled = false;
    submitButton.innerHTML = '提交评论';
    
    // 重新加载评论
    loadComments(currentNewsId);
}

// 删除评论
function deleteComment(commentId) {
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }
    
    try {
        // 从本地存储获取所有评论
        const allComments = JSON.parse(localStorage.getItem('comments') || '[]');
        
        // 找到要删除的评论索引
        const commentIndex = allComments.findIndex(comment => comment.id === commentId);
        
        if (commentIndex === -1) {
            throw new Error('未找到要删除的评论');
        }
        
        // 检查是否是当前用户的评论
        const currentUser = getCurrentUser();
        const userId = currentUser ? currentUser.id : null;
        
        if (allComments[commentIndex].user_id !== userId) {
            throw new Error('您没有权限删除此评论');
        }
        
        // 删除评论
        allComments.splice(commentIndex, 1);
        
        // 保存更新后的评论列表
        localStorage.setItem('comments', JSON.stringify(allComments));
        
        // 重新加载评论
        loadComments(currentNewsId);
        
        // 显示成功消息
        showCommentFeedback('评论已删除');
    } catch (error) {
        console.error('删除评论出错:', error);
        alert(error.message);
    }
}

// 更新评论数量
function updateCommentCount() {
    const commentCountElement = document.querySelector('.comment-count');
    if (commentCountElement && currentNewsId) {
        try {
            // 从本地存储获取所有评论
            const allComments = JSON.parse(localStorage.getItem('comments') || '[]');
            
            // 计算当前文章的评论数量
            const commentCount = allComments.filter(comment => comment.article_id == currentNewsId).length;
            
            // 更新评论数量显示
            commentCountElement.textContent = commentCount;
        } catch (error) {
            console.error('更新评论数量失败:', error);
            commentCountElement.textContent = '0';
        }
    }
}

// 显示评论反馈
function showCommentFeedback(message) {
    // 创建反馈元素
    const feedback = document.createElement('div');
    feedback.className = 'comment-feedback';
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #3498db;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideInDown 0.3s ease-out;
    `;
    
    // 添加动画样式
    if (!document.querySelector('#comment-feedback-styles')) {
        const style = document.createElement('style');
        style.id = 'comment-feedback-styles';
        style.textContent = `
            @keyframes slideInDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideOutUp {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(feedback);
    
    // 3秒后自动移除
    setTimeout(() => {
        feedback.style.animation = 'slideOutUp 0.3s ease-out';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 3000);
}

// HTML转义函数
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 检查用户是否已登录
function isLoggedIn() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    return token && token.trim() !== '';
}

// 获取当前用户信息
function getCurrentUser() {
    if (!isLoggedIn()) {
        // 如果用户未登录，返回一个默认的匿名用户
        return {
            id: generateUUID(),
            username: '匿名用户'
        };
    }
    
    try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            return JSON.parse(userInfo);
        } else {
            // 如果没有用户信息但有token，创建一个基本用户
            return {
                id: generateUUID(),
                username: '用户' + Math.floor(Math.random() * 1000)
            };
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return {
            id: generateUUID(),
            username: '匿名用户'
        };
    }
}

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (token) {
        return {
            'Authorization': `Bearer ${token}`
        };
    }
    return {};
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // 设置图标
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'error') icon = 'times-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    // 根据类型设置颜色
    if (type === 'success') {
        notification.style.borderLeft = '4px solid #2ecc71';
    } else if (type === 'warning') {
        notification.style.borderLeft = '4px solid #f39c12';
    } else if (type === 'error') {
        notification.style.borderLeft = '4px solid #e74c3c';
    } else {
        notification.style.borderLeft = '4px solid #3498db';
    }
    
    // 添加动画样式
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 导出函数供其他脚本使用
window.loadComments = loadComments;
window.setupCommentForm = setupCommentForm;
window.filterNewsByCategory = filterNewsByCategory;
window.initCategoryButtons = initCategoryButtons;



// 生成UUID
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    
    // 如果浏览器不支持crypto.randomUUID，使用备用方法
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


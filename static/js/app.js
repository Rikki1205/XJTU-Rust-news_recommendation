// 全局变量
let currentUserId = localStorage.getItem('userId') || generateUUID();
let newsData = [];
let activeCategory = 'all';
let userFeedbackHistory = JSON.parse(localStorage.getItem('userFeedbackHistory') || '{}');
let hasInitialCrawl = false; // 标记是否已经进行过初始爬取

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

    // 设置个性化推荐按钮事件
    const personalizedBtn = document.getElementById('personalized-btn');
    if (personalizedBtn) {
        personalizedBtn.onclick = function () {
            fetchPersonalizedRecommendations();
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

    // 设置类别筛选按钮事件
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = function () {
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
        };
    });

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
};

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
    // if (!hasInitialCrawl) {
    //     return;
    // }

    // 显示加载动画
    document.getElementById('news-container').innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载推荐内容...</p>
        </div>
    `;

    // 获取推荐API
    //fetch(`/api/recommendations?user_id=${currentUserId}`)   
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
        // card.dataset.category = item.category || 'unknown';
        card.dataset.category = item.categories?.[0] ?? "Undefined_cate";

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

        // 处理图片URL - 如果没有图片，使用默认图片
        const imageUrl = item.image_url || item.imageUrl || '/static/images/default-news.svg';

        // 安全地获取字段值
        const title = item.title || '无标题';
        const summary = item.summary || item.content ?
            (item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content) :
            '暂无摘要';
        const category = item.categories?.[0] || '未分类';
        const url = item.url || '#';
        const readCount = item.read_count || 0;

        card.innerHTML = `
            <div class="news-card-image">
                <img src="/api/v1/images?url=${item.url}" alt="${title}" 
                style="max-width:100%"
                onerror="this.src='/static/images/default-news.svg'">
                ${hasFeedback ? '<div class="feedback-badge">已反馈</div>' : ''}
            </div>
            <div class="news-card-content">
                ${category ? `<span class="category-tag">${category}</span>` : ''}
                <h3 class="news-card-title"><a href="${url}" target="_blank">${title}</a></h3>
                <p class="news-card-summary">${summary}</p>
                <div class="news-card-meta">
                    <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                </div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', function (e) {
            // 如果点击的是链接或按钮，不打开模态框
            if (e.target.closest('a') || e.target.closest('.news-card-action-btn')) {
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

    // 应用用户互动状态到卡片（如果有相关函数）
    if (typeof applyInteractionsToCards === 'function') {
        applyInteractionsToCards();
    }

    // 恢复用户的交互状态
    restoreInteractionStates();
}

// 根据类别筛选新闻
function filterNewsByCategory(category) {
    if (category === 'all') {
        document.querySelectorAll('.news-card').forEach(card => {
            card.style.display = 'flex';
        });
    } else {
        document.querySelectorAll('.news-card').forEach(card => {
            if (card.dataset.category === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
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

    // 安全地获取字段值
    const title = newsItem.title || '无标题';
    const category = item.categories?.[0] || '未分类';
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

    // 记录阅读历史
    if (typeof recordReadingHistory === 'function') {
        recordReadingHistory(newsItem);
    }

    // 初始化交互按钮
    if (typeof initInteractionButtons === 'function') {
        initInteractionButtons();
    }

    // 加载交互状态
    if (typeof loadNewsInteractions === 'function') {
        loadNewsInteractions(newsItem.id);
    }

    // 加载评论
    if (typeof loadComments === 'function') {
        loadComments(newsItem.id);
    }

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

            case 'comment':
                // 打开评论模态框
                openCommentModal(articleId);
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

    // 使用HTML中已有的评论模态框
    const modal = document.getElementById('news-modal');
    if (!modal) {
        console.error('未找到新闻模态框');
        return;
    }

    // 设置当前文章ID
    modal.dataset.newsId = articleId;
    currentNewsId = articleId;

    // 显示模态框
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // 加载评论
    if (typeof loadComments === 'function') {
        loadComments(articleId);
    }

    // 滚动到评论区
    setTimeout(() => {
        const commentsSection = modal.querySelector('.news-comments');
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth' });
        }

        // 聚焦到评论输入框
        const commentTextarea = document.getElementById('comment-text');
        if (commentTextarea) {
            commentTextarea.focus();
        }
    }, 300);
}



// 关闭评论模态框
function closeCommentModal() {
    const modal = document.getElementById('news-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 提交评论 - 使用comments.js中的函数
async function submitComment(articleId) {
    // 如果comments.js中有submitComment函数，使用它
    if (typeof window.submitComment === 'function' && window.submitComment !== submitComment) {
        return window.submitComment();
    }

    // 否则使用简化版本
    const commentText = document.getElementById('comment-text').value.trim();

    if (!commentText) {
        showNotification('请输入评论内容', 'warning');
        return;
    }

    const token = localStorage.getItem('auth_token');
    const currentUser = getCurrentUser();

    if (!token || !currentUser || !currentUser.username) {
        showNotification('请先登录', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/v1/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                article_id: articleId,
                content: commentText
            })
        });

        if (response.ok) {
            showNotification('评论发表成功', 'success');

            // 清空评论框
            document.getElementById('comment-text').value = '';

            // 重新加载评论列表
            if (typeof loadComments === 'function') {
                loadComments(articleId);
            }

            // 更新文章卡片上的评论计数
            updateCommentCountOnCard(articleId, 1);

        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '评论发表失败');
        }

    } catch (error) {
        console.error('提交评论失败:', error);
        showNotification('评论发表失败，请稍后重试', 'error');
    } finally {
        // 恢复提交按钮
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

// 从模态框删除评论
async function deleteCommentFromModal(commentId, articleId) {
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }

    const token = localStorage.getItem('auth_token');

    try {
        const response = await fetch(`/api/v1/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showNotification('评论已删除', 'success');

            // 重新加载评论列表
            loadCommentsForModal(articleId);

            // 更新文章卡片上的评论计数
            updateCommentCountOnCard(articleId, -1);

        } else {
            throw new Error('删除评论失败');
        }

    } catch (error) {
        console.error('删除评论失败:', error);
        showNotification('删除评论失败，请稍后重试', 'error');
    }
}

// 更新卡片上的评论计数
function updateCommentCountOnCard(articleId, delta) {
    const card = document.querySelector(`[data-id="${articleId}"]`);
    if (card) {
        const commentBtn = card.querySelector('.comment-btn .interaction-count');
        if (commentBtn) {
            let count = parseInt(commentBtn.textContent) || 0;
            commentBtn.textContent = Math.max(0, count + delta);
        }
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 创建新通知
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    // 根据类型设置背景色
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 在页面加载完成后恢复互动状态
document.addEventListener('DOMContentLoaded', function () {
    // 延迟恢复状态，确保新闻卡片已经渲染
    setTimeout(restoreInteractionStates, 1000);
});

// 应用用户互动状态到卡片
function applyInteractionsToCards() {
    if (!window.userInteractions) {
        window.userInteractions = JSON.parse(localStorage.getItem('userInteractions') || '{}');
    }

    // 遍历所有新闻卡片
    document.querySelectorAll('.news-card').forEach(card => {
        const newsId = card.dataset.id;

        // 如果用户对该新闻有互动记录
        if (window.userInteractions[newsId]) {
            // 应用点赞状态
            const likeBtn = card.querySelector('[data-action="like"]');
            if (likeBtn && window.userInteractions[newsId].liked) {
                likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> 已点赞';
                likeBtn.classList.add('active');
            }

            // 应用收藏状态
            const favoriteBtn = card.querySelector('[data-action="favorite"]');
            if (favoriteBtn && window.userInteractions[newsId].favorited) {
                favoriteBtn.innerHTML = '<i class="fas fa-bookmark"></i> 已收藏';
                favoriteBtn.classList.add('active');
            }
        }
    });
}

// 滚动到评论区
function scrollToComments() {
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// 获取个性化推荐新闻
function fetchPersonalizedRecommendations() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        alert('请先登录以获取个性化推荐');
        return;
    }

    // 显示加载动画
    document.getElementById('news-container').innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载个性化推荐...</p>
        </div>
    `;

    // 获取个性化推荐API
    fetch('/api/v1/recommendations', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('获取个性化推荐失败');
            }
            return response.json();
        })
        .then(data => {
            newsData = data;
            renderNewsCards(data);

            // 显示个性化推荐标识
            const container = document.getElementById('news-container');
            const personalizedBanner = document.createElement('div');
            personalizedBanner.className = 'personalized-banner';
            personalizedBanner.innerHTML = `
                <i class="fas fa-user-cog"></i>
                <span>基于您的兴趣标签和浏览历史的个性化推荐</span>
            `;
            container.insertBefore(personalizedBanner, container.firstChild);

            // 如果有活动类别筛选，应用筛选
            if (activeCategory !== 'all') {
                filterNewsByCategory(activeCategory);
            }
        })
        .catch(error => {
            console.error('Error fetching personalized recommendations:', error);
            document.getElementById('news-container').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>获取个性化推荐时出错，请稍后再试</p>
                    <button class="btn retry-btn">重试</button>
                </div>
            `;
            document.querySelector('.retry-btn').addEventListener('click', fetchPersonalizedRecommendations);
        });
}

// 检查用户登录状态并显示相应按钮
function checkAuthStatus() {
    const token = localStorage.getItem('auth_token');
    const personalizedBtn = document.getElementById('personalized-btn');
    const authControls = document.getElementById('auth-controls');
    const userControls = document.getElementById('user-controls');
    
    if (token) {
        // 用户已登录，显示个性化推荐按钮
        if (personalizedBtn) {
            personalizedBtn.style.display = 'inline-block';
        }
        if (authControls) {
            authControls.style.display = 'none';
        }
        if (userControls) {
            userControls.style.display = 'flex';
        }
    } else {
        // 用户未登录，隐藏个性化推荐按钮
        if (personalizedBtn) {
            personalizedBtn.style.display = 'none';
        }
        if (authControls) {
            authControls.style.display = 'flex';
        }
        if (userControls) {
            userControls.style.display = 'none';
        }
    }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});


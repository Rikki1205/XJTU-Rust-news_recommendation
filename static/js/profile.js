// 全局变量
let currentPage = 1;
let currentSection = 'overview';
const itemsPerPage = 10;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // 初始化页面
    initializePage();
    
    // 绑定退出登录事件
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// 初始化页面
function initializePage() {
    loadOverviewData();
}

// 显示指定部分
function showSection(sectionName) {
    // 隐藏所有内容部分
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 移除所有导航项的活动状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 显示选中的部分
    document.getElementById(sectionName).classList.add('active');
    
    // 激活对应的导航项
    event.target.classList.add('active');
    
    currentSection = sectionName;
    currentPage = 1;
    
    // 根据选中的部分加载数据
    switch(sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'feedback-history':
            loadFeedbackHistory();
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'interactions':
            loadInteractions();
            break;
    }
}

// 加载概览数据
async function loadOverviewData() {
    const token = localStorage.getItem('auth_token');
    
    try {
        // 获取用户反馈历史统计
        const feedbackResponse = await fetch('/api/v1/users/feedback-history?limit=1000', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json();
            
            // 统计数据
            const totalInteractions = feedbackData.interactions.length;
            const totalLikes = feedbackData.interactions.filter(i => i.interaction.interaction_type === 'like').length;
            const totalFavorites = feedbackData.interactions.filter(i => i.interaction.interaction_type === 'favorite').length;
            const totalComments = feedbackData.comments.length;
            
            // 更新统计显示
            document.getElementById('total-interactions').textContent = totalInteractions;
            document.getElementById('total-likes').textContent = totalLikes;
            document.getElementById('total-favorites').textContent = totalFavorites;
            document.getElementById('total-comments').textContent = totalComments;
        }
    } catch (error) {
        console.error('加载概览数据失败:', error);
    }
}

// 加载反馈历史
async function loadFeedbackHistory() {
    const token = localStorage.getItem('auth_token');
    const loadingEl = document.getElementById('feedback-loading');
    const contentEl = document.getElementById('feedback-content');
    const emptyEl = document.getElementById('feedback-empty');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    emptyEl.style.display = 'none';
    
    try {
        const response = await fetch(`/api/v1/users/feedback-history?page=${currentPage}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // 隐藏加载状态
            loadingEl.style.display = 'none';
            
            if (data.total_count === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            
            // 显示内容
            contentEl.style.display = 'block';
            renderFeedbackHistory(data);
            renderPagination('feedback', data.total_count);
        } else {
            throw new Error('获取反馈历史失败');
        }
    } catch (error) {
        console.error('加载反馈历史失败:', error);
        loadingEl.style.display = 'none';
        showNotification('加载反馈历史失败', 'error');
    }
}

// 渲染反馈历史
function renderFeedbackHistory(data) {
    const listEl = document.getElementById('feedback-list');
    listEl.innerHTML = '';
    
    // 合并所有反馈数据并按时间排序
    const allFeedback = [
        ...data.feedbacks.map(item => ({
            type: 'feedback',
            data: item,
            date: new Date(item.feedback.created_at)
        })),
        ...data.comments.map(item => ({
            type: 'comment',
            data: item,
            date: new Date(item.comment.created_at)
        })),
        ...data.interactions.map(item => ({
            type: 'interaction',
            data: item,
            date: new Date(item.interaction.created_at)
        }))
    ].sort((a, b) => b.date - a.date);
    
    allFeedback.forEach(item => {
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'feedback-item';
        
        let typeLabel, typeClass, content;
        
        switch(item.type) {
            case 'feedback':
                typeLabel = getFeedbackTypeLabel(item.data.feedback.feedback_type);
                typeClass = item.data.feedback.feedback_type.toLowerCase();
                content = `
                    <div class="feedback-header">
                        <span class="feedback-type ${typeClass}">${typeLabel}</span>
                        <span class="feedback-date">${formatDate(item.date)}</span>
                    </div>
                    <div class="article-title">${item.data.article_title}</div>
                    <a href="${item.data.article_url}" class="article-link" target="_blank">查看原文</a>
                `;
                break;
                
            case 'comment':
                typeLabel = '评论';
                typeClass = 'comment';
                content = `
                    <div class="feedback-header">
                        <span class="feedback-type ${typeClass}">${typeLabel}</span>
                        <span class="feedback-date">${formatDate(item.date)}</span>
                    </div>
                    <div class="article-title">${item.data.article_title}</div>
                    <div class="comment-content">${item.data.comment.content}</div>
                    <a href="${item.data.article_url}" class="article-link" target="_blank">查看原文</a>
                `;
                break;
                
            case 'interaction':
                typeLabel = getInteractionTypeLabel(item.data.interaction.interaction_type);
                typeClass = item.data.interaction.interaction_type;
                content = `
                    <div class="feedback-header">
                        <span class="feedback-type ${typeClass}">${typeLabel}</span>
                        <span class="feedback-date">${formatDate(item.date)}</span>
                    </div>
                    <div class="article-title">${item.data.article_title}</div>
                    <a href="${item.data.article_url}" class="article-link" target="_blank">查看原文</a>
                `;
                break;
        }
        
        feedbackEl.innerHTML = content;
        listEl.appendChild(feedbackEl);
    });
}

// 加载收藏夹
async function loadFavorites() {
    const token = localStorage.getItem('auth_token');
    const loadingEl = document.getElementById('favorites-loading');
    const contentEl = document.getElementById('favorites-content');
    const emptyEl = document.getElementById('favorites-empty');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    emptyEl.style.display = 'none';
    
    try {
        const response = await fetch(`/api/v1/favorites?page=${currentPage}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            
            // 隐藏加载状态
            loadingEl.style.display = 'none';
            
            if (favorites.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            
            // 显示内容
            contentEl.style.display = 'block';
            renderFavorites(favorites);
            // 注意：这里需要总数来渲染分页，但API可能没有返回总数
            // 暂时使用favorites.length作为近似值
            renderPagination('favorites', favorites.length);
        } else {
            throw new Error('获取收藏夹失败');
        }
    } catch (error) {
        console.error('加载收藏夹失败:', error);
        loadingEl.style.display = 'none';
        showNotification('加载收藏夹失败', 'error');
    }
}

// 渲染收藏夹
function renderFavorites(favorites) {
    const listEl = document.getElementById('favorites-list');
    listEl.innerHTML = '';
    
    favorites.forEach(favorite => {
        const favoriteEl = document.createElement('div');
        favoriteEl.className = 'feedback-item';
        favoriteEl.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-type favorite">收藏</span>
                <span class="feedback-date">${formatDate(new Date(favorite.created_at))}</span>
            </div>
            <div class="article-title">文章ID: ${favorite.article_id}</div>
            <div style="margin-top: 10px;">
                <span style="background-color: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                    ${favorite.folder_name}
                </span>
                <button onclick="removeFavorite('${favorite.article_id}')" 
                        style="margin-left: 10px; background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    取消收藏
                </button>
            </div>
        `;
        listEl.appendChild(favoriteEl);
    });
}

// 加载互动记录
async function loadInteractions() {
    const token = localStorage.getItem('auth_token');
    const loadingEl = document.getElementById('interactions-loading');
    const contentEl = document.getElementById('interactions-content');
    const emptyEl = document.getElementById('interactions-empty');
    
    // 显示加载状态
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    emptyEl.style.display = 'none';
    
    try {
        const response = await fetch(`/api/v1/users/interactions?page=${currentPage}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const interactions = await response.json();
            
            // 隐藏加载状态
            loadingEl.style.display = 'none';
            
            if (interactions.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            
            // 显示内容
            contentEl.style.display = 'block';
            renderInteractions(interactions);
            renderPagination('interactions', interactions.length);
        } else {
            throw new Error('获取互动记录失败');
        }
    } catch (error) {
        console.error('加载互动记录失败:', error);
        loadingEl.style.display = 'none';
        showNotification('加载互动记录失败', 'error');
    }
}

// 渲染互动记录
function renderInteractions(interactions) {
    const listEl = document.getElementById('interactions-list');
    listEl.innerHTML = '';
    
    interactions.forEach(interaction => {
        const interactionEl = document.createElement('div');
        interactionEl.className = 'feedback-item';
        
        const typeLabel = getInteractionTypeLabel(interaction.interaction_type);
        const typeClass = interaction.interaction_type;
        
        interactionEl.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-type ${typeClass}">${typeLabel}</span>
                <span class="feedback-date">${formatDate(new Date(interaction.updated_at))}</span>
            </div>
            <div class="article-title">文章ID: ${interaction.article_id}</div>
            <div style="margin-top: 5px; color: #6c757d; font-size: 14px;">
                状态: ${interaction.is_active ? '活跃' : '已取消'}
            </div>
        `;
        listEl.appendChild(interactionEl);
    });
}

// 渲染分页
function renderPagination(type, totalCount) {
    const paginationEl = document.getElementById(`${type}-pagination`);
    paginationEl.innerHTML = '';
    
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    if (totalPages <= 1) return;
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationEl.appendChild(prevBtn);
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === currentPage ? 'active' : '';
            pageBtn.onclick = () => changePage(i);
            paginationEl.appendChild(pageBtn);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px';
            paginationEl.appendChild(ellipsis);
        }
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationEl.appendChild(nextBtn);
}

// 切换页面
function changePage(page) {
    currentPage = page;
    
    switch(currentSection) {
        case 'feedback-history':
            loadFeedbackHistory();
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'interactions':
            loadInteractions();
            break;
    }
}

// 取消收藏
async function removeFavorite(articleId) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`/api/v1/favorites/${articleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('取消收藏成功', 'success');
            loadFavorites(); // 重新加载收藏夹
        } else {
            throw new Error('取消收藏失败');
        }
    } catch (error) {
        console.error('取消收藏失败:', error);
        showNotification('取消收藏失败', 'error');
    }
}

// 工具函数
function getFeedbackTypeLabel(type) {
    switch(type) {
        case 'Interested': return '感兴趣';
        case 'NotInterested': return '不感兴趣';
        case 'Neutral': return '中性';
        default: return type;
    }
}

function getInteractionTypeLabel(type) {
    switch(type) {
        case 'like': return '点赞';
        case 'favorite': return '收藏';
        case 'comment': return '评论';
        default: return type;
    }
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes === 0 ? '刚刚' : `${minutes}分钟前`;
        }
        return `${hours}小时前`;
    } else if (days === 1) {
        return '昨天';
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

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

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userInteractions');
    window.location.href = 'index.html';
} 
// 标签管理相关函数
let userTags = [];
const suggestedTagsList = ['科技', '体育', '娱乐', '财经', '政治', '健康', '教育', '旅游', '美食', '时尚', '汽车', '房产'];

// 加载用户标签
async function loadUserTags() {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch('/api/v1/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            userTags = userData.tags || [];
            renderCurrentTags();
            renderSuggestedTags();
        }
    } catch (error) {
        console.error('加载用户标签失败:', error);
    }
}

// 渲染当前标签
function renderCurrentTags() {
    const container = document.getElementById('current-tags');
    
    if (userTags.length === 0) {
        container.innerHTML = '<div class="tags-empty">暂无标签，请添加您感兴趣的标签</div>';
        return;
    }
    
    container.innerHTML = userTags.map(tag => `
        <span class="tag">
            ${tag}
            <span class="remove-tag" onclick="removeTag('${tag}')">×</span>
        </span>
    `).join('');
}

// 渲染推荐标签
function renderSuggestedTags() {
    const container = document.getElementById('suggested-tags');
    const availableTags = suggestedTagsList.filter(tag => !userTags.includes(tag));
    
    if (availableTags.length === 0) {
        container.innerHTML = '<div class="tags-empty">所有推荐标签都已添加</div>';
        return;
    }
    
    container.innerHTML = availableTags.map(tag => `
        <span class="tag suggested" onclick="addSuggestedTag('${tag}')">
            ${tag}
        </span>
    `).join('');
}

// 添加标签
async function addTag() {
    const input = document.getElementById('new-tag-input');
    const tag = input.value.trim();
    
    if (!tag) {
        showNotification('请输入标签内容', 'warning');
        return;
    }
    
    if (userTags.includes(tag)) {
        showNotification('标签已存在', 'warning');
        return;
    }
    
    if (userTags.length >= 10) {
        showNotification('最多只能添加10个标签', 'warning');
        return;
    }
    
    userTags.push(tag);
    await updateUserTags();
    input.value = '';
    renderCurrentTags();
    renderSuggestedTags();
}

// 添加推荐标签
async function addSuggestedTag(tag) {
    if (userTags.includes(tag)) {
        return;
    }
    
    if (userTags.length >= 10) {
        showNotification('最多只能添加10个标签', 'warning');
        return;
    }
    
    userTags.push(tag);
    await updateUserTags();
    renderCurrentTags();
    renderSuggestedTags();
}

// 移除标签
async function removeTag(tag) {
    userTags = userTags.filter(t => t !== tag);
    await updateUserTags();
    renderCurrentTags();
    renderSuggestedTags();
}

// 更新用户标签到服务器
async function updateUserTags() {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch('/api/v1/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tags: userTags
            })
        });
        
        if (response.ok) {
            showNotification('标签更新成功', 'success');
        } else {
            throw new Error('更新标签失败');
        }
    } catch (error) {
        console.error('更新标签失败:', error);
        showNotification('更新标签失败', 'error');
    }
}

// 监听回车键添加标签
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('new-tag-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTag();
            }
        });
    }
});

// 修改showSection函数以支持标签页面
const originalShowSection = showSection;
function showSection(sectionName) {
    originalShowSection(sectionName);
    
    if (sectionName === 'tags') {
        loadUserTags();
    }
}


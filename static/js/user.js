// 用户相关功能脚本

// 全局变量
let currentUser = {
    id: localStorage.getItem('userId') || generateUUID(),
    username: localStorage.getItem('username') || '',
    email: localStorage.getItem('email') || '',
    interests: JSON.parse(localStorage.getItem('interests') || '[]')
};

// 初始化用户信息
function initUserInfo() {
    // 保存用户ID到本地存储
    localStorage.setItem('userId', currentUser.id);
    
    // 如果有用户名，显示在界面上
    if (currentUser.username) {
        const userProfileBtn = document.getElementById('user-profile-btn');
        if (userProfileBtn) {
            userProfileBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
        }
    }
}

// 加载用户个人资料
function loadUserProfile() {
    // 填充表单
    document.getElementById('username').value = currentUser.username;
    document.getElementById('email').value = currentUser.email;
    
    // 清空并重新添加兴趣标签
    const interestTags = document.querySelector('.interest-tags');
    // 保留输入框
    const inputField = interestTags.querySelector('input');
    interestTags.innerHTML = '';
    interestTags.appendChild(inputField);
    
    // 添加兴趣标签
    currentUser.interests.forEach(interest => {
        addInterestTag(interest);
    });
    
    // 绑定添加新标签的事件
    const newInterestInput = document.getElementById('new-interest');
    newInterestInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
            const newInterest = this.value.trim();
            if (!currentUser.interests.includes(newInterest)) {
                currentUser.interests.push(newInterest);
                addInterestTag(newInterest);
                this.value = '';
            }
        }
    });
    
    // 绑定保存按钮事件
    document.getElementById('save-profile').addEventListener('click', saveUserProfile);
    
    // 加载阅读历史和反馈历史
    loadReadingHistory();
    loadFeedbackHistory();
}

// 添加兴趣标签
function addInterestTag(interest) {
    const interestTags = document.querySelector('.interest-tags');
    const inputField = interestTags.querySelector('input');
    
    const tag = document.createElement('span');
    tag.className = 'interest-tag';
    tag.innerHTML = `${interest} <i class="fas fa-times"></i>`;
    
    // 添加删除标签事件
    tag.querySelector('i').addEventListener('click', function() {
        const index = currentUser.interests.indexOf(interest);
        if (index !== -1) {
            currentUser.interests.splice(index, 1);
            tag.remove();
        }
    });
    
    interestTags.insertBefore(tag, inputField);
}

// 保存用户个人资料
function saveUserProfile() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    
    // 简单验证
    if (!username) {
        alert('用户名不能为空');
        return;
    }
    
    if (email && !isValidEmail(email)) {
        alert('请输入有效的邮箱地址');
        return;
    }
    
    // 更新用户信息
    currentUser.username = username;
    currentUser.email = email;
    
    // 保存到本地存储
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    localStorage.setItem('interests', JSON.stringify(currentUser.interests));
    
    // 更新界面
    const userProfileBtn = document.getElementById('user-profile-btn');
    if (userProfileBtn) {
        userProfileBtn.innerHTML = `<i class="fas fa-user"></i> ${username}`;
    }
    
    // 发送到服务器（如果有API）
    updateUserProfileOnServer();
    
    // 显示成功消息
    alert('个人资料保存成功');
}

// 验证邮箱格式
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 更新服务器上的用户资料
function updateUserProfileOnServer() {
    // 如果有用户API，可以发送请求更新服务器上的用户资料
    fetch('/api/v1/users/profile/me', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.id}` // 使用用户ID作为简单的授权令牌
        },
        body: JSON.stringify({
            email: currentUser.email,
            interests: currentUser.interests
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('更新用户资料失败');
        }
        return response.json();
    })
    .then(data => {
        console.log('用户资料更新成功:', data);
    })
    .catch(error => {
        console.error('更新用户资料出错:', error);
        // 这里不显示错误，因为本地存储已经更新成功
    });
}

// 加载阅读历史
function loadReadingHistory() {
    const historyContainer = document.querySelector('#reading-history .history-list');
    
    // 显示加载中
    historyContainer.innerHTML = `
        <div class="loading-history">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载阅读历史...</p>
        </div>
    `;
    
    // 尝试从服务器获取阅读历史
    fetch(`/api/v1/users/reading-history?user_id=${currentUser.id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取阅读历史失败');
            }
            return response.json();
        })
        .then(data => {
            renderReadingHistory(data);
        })
        .catch(error => {
            console.error('获取阅读历史出错:', error);
            // 如果服务器获取失败，回退到本地存储
            const readingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
            renderReadingHistory(readingHistory);
        });
}

// 渲染阅读历史
function renderReadingHistory(readingHistory) {
    const historyContainer = document.querySelector('#reading-history .history-list');
    
    if (readingHistory.length === 0) {
        historyContainer.innerHTML = '<div class="no-content"><i class="fas fa-history"></i><p>暂无阅读历史</p></div>';
        return;
    }
    
    // 清空容器
    historyContainer.innerHTML = '';
    
    // 添加历史记录
    readingHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // 格式化日期
        const readDate = new Date(item.timestamp);
        const formattedDate = readDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        historyItem.innerHTML = `
            <div class="history-content">
                <h4>${item.title}</h4>
                <div class="history-meta">
                    ${item.category ? `<span class="category-tag">${item.category}</span>` : ''}
                    <span class="history-date">${formattedDate}</span>
                </div>
            </div>
            <div class="history-actions">
                <!-- <button class="btn-small view-article" data-id="${item.id}">查看</button> -->
                <!-- <button class="btn-small delete-history" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button> -->
            </div>
        `;
        
        // 添加查看文章事件
        const viewArticleButton = historyItem.querySelector('.view-article');
        if (viewArticleButton) {
            viewArticleButton.addEventListener('click', function() {
                const articleId = this.getAttribute('data-id');
                // 查找对应的文章并打开模态框
                const article = newsData.find(news => news.id === parseInt(articleId));
                if (article) {
                    openNewsModal(article);
                    closeUserProfileModal();
                }
            });
        }
        
        // 添加删除历史记录事件
        const deleteHistoryButton = historyItem.querySelector('.delete-history');
        if (deleteHistoryButton) {
            deleteHistoryButton.addEventListener('click', function() {
                const articleId = this.getAttribute('data-id');
                deleteReadingHistory(articleId);
            });
        }
        
        historyContainer.appendChild(historyItem);
    });
}

// 删除阅读历史
function deleteReadingHistory(articleId) {
    if (!confirm('确定要删除这条阅读记录吗？')) {
        return;
    }
    
    // 从本地存储中删除
    let readingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    readingHistory = readingHistory.filter(item => item.id !== parseInt(articleId));
    localStorage.setItem('readingHistory', JSON.stringify(readingHistory));
    
    // 从服务器删除
    fetch(`/api/v1/users/reading-history/${articleId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${currentUser.id}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除阅读历史失败');
        }
        return response.json();
    })
    .then(data => {
        console.log('阅读历史删除成功:', data);
    })
    .catch(error => {
        console.error('删除阅读历史出错:', error);
        // 这里不显示错误，因为本地存储已经更新成功
    });
    
    // 重新加载阅读历史
    loadReadingHistory();
}

// 加载反馈历史
function loadFeedbackHistory() {
    const feedbackContainer = document.querySelector('#feedback-history .feedback-list');
    
    // 显示加载中
    feedbackContainer.innerHTML = `
        <div class="loading-feedback">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载反馈历史...</p>
        </div>
    `;
    
    // 检查用户是否已登录
    const token = localStorage.getItem('authToken');
    if (!token) {
        feedbackContainer.innerHTML = `
            <div class="no-content">
                <i class="fas fa-comment-dots"></i>
                <p>请先登录查看反馈历史</p>
            </div>
        `;
        return;
    }
    
    // 从服务器获取用户的评论历史
    Promise.all([
        // 获取用户评论
        fetch('/api/v1/comments/users/comments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }),
        // 获取用户点赞记录
        fetch('/api/v1/interactions/users/interactions?interaction_type=like', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }),
        // 获取用户收藏记录
        fetch('/api/v1/interactions/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
    ])
    .then(async responses => {
        const [commentsResponse, likesResponse, favoritesResponse] = responses;
        
        const feedbackData = {
            comments: [],
            likes: [],
            favorites: []
        };
        
        // 处理评论数据
        if (commentsResponse.ok) {
            feedbackData.comments = await commentsResponse.json();
        }
        
        // 处理点赞数据
        if (likesResponse.ok) {
            const likes = await likesResponse.json();
            feedbackData.likes = likes.filter(like => like.is_active);
        }
        
        // 处理收藏数据
        if (favoritesResponse.ok) {
            feedbackData.favorites = await favoritesResponse.json();
        }
        
        renderFeedbackHistory(feedbackData);
    })
    .catch(error => {
        console.error('获取反馈历史出错:', error);
        feedbackContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>获取反馈历史失败，请稍后重试</p>
                <button class="btn retry-btn" onclick="loadFeedbackHistory()">重试</button>
            </div>
        `;
    });
}

// 渲染反馈历史
function renderFeedbackHistory(feedbackData) {
    const feedbackContainer = document.querySelector('#feedback-history .feedback-list');
    
    // 合并所有反馈数据并按时间排序
    const allFeedback = JSON.parse(localStorage.getItem('comments') || '[]');
    
    // 添加评论
    if (feedbackData.comments && feedbackData.comments.length > 0) {
        feedbackData.comments.forEach(comment => {
            allFeedback.push({
                type: 'comment',
                id: comment.id,
                article_id: comment.article_id,
                content: comment.content,
                created_at: comment.created_at,
                article_title: comment.article_title || `文章 #${comment.article_id}`
            });
        });
    }
    
    // 按时间排序（最新的在前）
    // allFeedback.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (allFeedback.length === 0) {
        feedbackContainer.innerHTML = `
            <div class="no-content">
                <i class="fas fa-comment-alt"></i>
                <p>暂无反馈历史</p>
            </div>
        `;
        return;
    }
    
    // 清空容器
    feedbackContainer.innerHTML = '';
    
    // 添加反馈记录
    allFeedback.forEach(item => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = 'feedback-item';
        
        // 格式化日期
        const feedbackDate = new Date(item.created_at);
        const formattedDate = feedbackDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 根据类型设置图标和文本
        let typeIcon = '';
        let typeText = '';
        let contentText = '';
        
        switch (item.type) {
            case 'comment':
                typeIcon = '<i class="fas fa-comment"></i>';
                typeText = '评论';
                contentText = `<div class="feedback-content-text">"${item.content}"</div>`;
                break;
        }
        
        feedbackItem.innerHTML = `
            <div class="feedback-content">
                <div class="feedback-header">
                    <div class="feedback-type">
                        ${typeIcon}
                        <span>${typeText}</span>
                    </div>
                    <span class="feedback-date">${formattedDate}</span>
                </div>
                <h4 class="feedback-article-title">${item.article_title}</h4>
                ${contentText}
            </div>
            <div class="feedback-actions">
                <!-- <button class="btn-small view-article" data-id="${item.article_id}">查看文章</button> -->
                <!-- ${item.type === 'comment' ? `<button class="btn-small delete-feedback" data-type="comment" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>` : ''} -->
            </div>
        `;
        
        // 绑定事件
        const viewButton = feedbackItem.querySelector('.view-article');
        if (viewButton) {
            viewButton.addEventListener('click', function() {
                const articleId = this.getAttribute('data-id');
                // 这里可以添加查看文章的逻辑
                console.log('查看文章:', articleId);
                // 可以跳转到文章详情或者在模态框中显示
            });
        }
        
        const deleteButton = feedbackItem.querySelector('.delete-feedback');
        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                const feedbackId = this.getAttribute('data-id');
                const feedbackType = this.getAttribute('data-type');
                deleteFeedbackItem(feedbackId, feedbackType);
            });
        }
        
        feedbackContainer.appendChild(feedbackItem);
    });
}

// 渲染单个反馈项
function renderFeedbackItem(container, feedbackItem, article) {
    const feedbackItemElement = document.createElement('div');
    feedbackItemElement.className = 'feedback-item';
    
    // 确定反馈类型
    let feedbackType = '';
    let feedbackIcon = '';
    if (feedbackItem.rating <= 3) {
        feedbackType = '不感兴趣';
        feedbackIcon = '<i class="far fa-thumbs-down"></i>';
    } else if (feedbackItem.rating <= 7) {
        feedbackType = '一般';
        feedbackIcon = '<i class="far fa-meh"></i>';
    } else {
        feedbackType = '很有用';
        feedbackIcon = '<i class="far fa-thumbs-up"></i>';
    }
    
    // 格式化日期
    const feedbackDate = new Date(feedbackItem.timestamp);
    const formattedDate = feedbackDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    feedbackItemElement.innerHTML = `
        <div class="feedback-content">
            <h4>${article.title}</h4>
            <div class="feedback-meta">
                <span class="category-tag">${article.category}</span>
                <span class="feedback-type">${feedbackIcon} ${feedbackType}</span>
                <span class="feedback-date">${formattedDate}</span>
            </div>
        </div>
        <div class="feedback-actions">
            <button class="btn-small view-article" data-id="${article.id}">查看</button>
            <button class="btn-small delete-feedback" data-id="${article.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    
    // 添加查看文章事件
    feedbackItemElement.querySelector('.view-article').addEventListener('click', function() {
        const articleId = this.getAttribute('data-id');
        // 查找对应的文章并打开模态框
        const article = newsData.find(news => news.id === parseInt(articleId));
        if (article) {
            openNewsModal(article);
            closeUserProfileModal();
        }
    });
    
    // 添加删除反馈事件
    feedbackItemElement.querySelector('.delete-feedback').addEventListener('click', function() {
        const articleId = this.getAttribute('data-id');
        deleteFeedbackHistory(articleId);
    });
    
    container.appendChild(feedbackItemElement);
}

// 删除反馈历史
function deleteFeedbackHistory(articleId) {
    if (!confirm('确定要删除这条反馈记录吗？')) {
        return;
    }
    
    // 从本地存储中删除
    let feedbackHistory = JSON.parse(localStorage.getItem('userFeedbackHistory') || '{}');
    delete feedbackHistory[articleId];
    localStorage.setItem('userFeedbackHistory', JSON.stringify(feedbackHistory));
    
    // 从服务器删除
    fetch(`/api/v1/users/feedback-history/${articleId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${currentUser.id}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除反馈历史失败');
        }
        return response.json();
    })
    .then(data => {
        console.log('反馈历史删除成功:', data);
    })
    .catch(error => {
        console.error('删除反馈历史出错:', error);
        // 这里不显示错误，因为本地存储已经更新成功
    });
    
    // 重新加载反馈历史
    loadFeedbackHistory();
}

// 加载系统状态
function loadSystemStatus() {
    const statusContainer = document.getElementById('system-status-container');
    
    // 显示加载中
    statusContainer.innerHTML = `
        <div class="loading-status">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在检查系统状态...</p>
        </div>
    `;
    
    // 获取系统状态
    fetch('/api/v1/system/status')
        .then(response => response.json())
        .then(data => {
            // 更新状态显示
            let statusClass = data.status === 'OK' ? 'status-ok' : 'status-error';
            let statusIcon = data.status === 'OK' ? 'fa-check-circle' : 'fa-exclamation-circle';
            
            statusContainer.innerHTML = `
                <div class="system-status ${statusClass}">
                    <div class="status-icon">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div class="status-details">
                        <h4>系统状态: ${data.status}</h4>
                        <p>${data.message}</p>
                        <div class="status-items">
                            <div class="status-item">
                                <span class="status-label">数据库连接:</span>
                                <span class="status-value ${data.database_connected ? 'status-ok' : 'status-error'}">
                                    ${data.database_connected ? '正常' : '异常'}
                                </span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">API服务:</span>
                                <span class="status-value status-ok">正常</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">推荐引擎:</span>
                                <span class="status-value status-ok">正常</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="system-actions">
                    <button id="refresh-status" class="btn">刷新状态</button>
                </div>
            `;
            
            // 添加刷新按钮事件
            document.getElementById('refresh-status').addEventListener('click', loadSystemStatus);
        })
        .catch(error => {
            console.error('获取系统状态出错:', error);
            statusContainer.innerHTML = `
                <div class="system-status status-error">
                    <div class="status-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="status-details">
                        <h4>系统状态: 错误</h4>
                        <p>无法获取系统状态信息</p>
                    </div>
                </div>
                <div class="system-actions">
                    <button id="refresh-status" class="btn">重试</button>
                </div>
            `;
            
            // 添加重试按钮事件
            document.getElementById('refresh-status').addEventListener('click', loadSystemStatus);
        });
}

// 记录阅读历史
function recordReadingHistory(article) {
    // 从本地存储获取阅读历史
    let readingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
    
    // 检查是否已存在该文章
    const existingIndex = readingHistory.findIndex(item => item.id === article.id);
    
    // 如果已存在，移除旧记录
    if (existingIndex !== -1) {
        readingHistory.splice(existingIndex, 1);
    }
    
    // 添加新记录到开头
    const historyItem = {
        id: article.id,
        title: article.title,
        category: article.category,
        timestamp: Date.now()
    };
    
    readingHistory.unshift(historyItem);
    
    // 限制历史记录数量
    if (readingHistory.length > 50) {
        readingHistory = readingHistory.slice(0, 50);
    }
    
    // 保存到本地存储
    localStorage.setItem('readingHistory', JSON.stringify(readingHistory));
    
    // 发送到服务器
    fetch('/api/v1/users/reading-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
            user_id: currentUser.id,
            article_id: article.id,
            timestamp: historyItem.timestamp
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('记录阅读历史失败');
        }
        return response.json();
    })
    .then(data => {
        console.log('阅读历史记录成功:', data);
    })
    .catch(error => {
        console.error('记录阅读历史出错:', error);
        // 这里不显示错误，因为本地存储已经更新成功
    });
}

// 在页面加载时初始化用户信息
document.addEventListener('DOMContentLoaded', function() {
    initUserInfo();
});

// 用户状态管理
class UserManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.bindEvents();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const username = localStorage.getItem('username');

        if (token && username) {
            this.showLoggedInState(username);
            // 如果没有邮箱信息，尝试从服务器获取
            const email = localStorage.getItem('email');
            if (!email) {
                this.fetchUserProfileSilently(token);
            }
        } else {
            this.showLoggedOutState();
        }
    }

    async fetchUserProfileSilently(token) {
        try {
            const response = await fetch('/api/v1/users/profile/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                localStorage.setItem('email', userData.email);
                localStorage.setItem('username', userData.username);
                console.log('用户信息已静默更新:', userData);
            }
        } catch (error) {
            console.error('静默获取用户信息失败:', error);
        }
    }

    showLoggedInState(username) {
        // 隐藏登录注册按钮
        const authControls = document.getElementById('auth-controls');
        if (authControls) {
            authControls.style.display = 'none';
        }

        // 显示用户控制区域
        const userControls = document.getElementById('user-controls');
        if (userControls) {
            userControls.style.display = 'flex';
        }

        // 设置用户名
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = username;
        }
    }

    showLoggedOutState() {
        // 显示登录注册按钮
        const authControls = document.getElementById('auth-controls');
        if (authControls) {
            authControls.style.display = 'flex';
        }

        // 隐藏用户控制区域
        const userControls = document.getElementById('user-controls');
        if (userControls) {
            userControls.style.display = 'none';
        }
    }

    bindEvents() {
        // 退出登录按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // 个人中心按钮
        const userProfileBtn = document.getElementById('user-profile-btn');
        if (userProfileBtn) {
            userProfileBtn.addEventListener('click', () => {
                this.openUserProfile();
            });
        }
    }

    logout() {
        // 清除本地存储
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');

        // 显示消息
        this.showMessage('已成功退出登录', 'info');

        // 更新UI状态
        this.showLoggedOutState();

        // 可选：刷新页面或重新加载推荐内容
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    openUserProfile() {
        // 这里可以打开用户个人中心模态框
        // 或者跳转到用户个人中心页面
        console.log('打开用户个人中心');
        
        // 如果有个人中心模态框，可以在这里打开
        const modal = document.getElementById('user-profile-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滚动
            this.loadUserProfileData();
        }
    }

    async loadUserProfileData() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            // 调用API获取用户详细信息
            const response = await fetch('/api/v1/users/profile/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                // 更新localStorage中的用户信息
                localStorage.setItem('email', userData.email);
                localStorage.setItem('username', userData.username);
                
                // 更新个人中心的数据显示
                this.updateProfileForm(userData);
                console.log('用户个人资料数据已加载:', userData);
            } else {
                console.warn('获取用户信息失败:', response.status);
                // 如果API调用失败，使用localStorage中的数据
                this.loadProfileFromLocalStorage();
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            // 如果网络错误，使用localStorage中的数据
            this.loadProfileFromLocalStorage();
        }
    }

    updateProfileForm(userData) {
        // 更新表单字段
        const usernameField = document.getElementById('username');
        const emailField = document.getElementById('email');
        
        if (usernameField) {
            usernameField.value = userData.username || '';
        }
        if (emailField) {
            emailField.value = userData.email || '';
        }
    }

    loadProfileFromLocalStorage() {
        // 从localStorage加载数据作为备选方案
        const username = localStorage.getItem('username') || '';
        const email = localStorage.getItem('email') || '';
        
        this.updateProfileForm({ username, email });
    }

    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-toast';
        messageContainer.innerHTML = `
            <div class="toast toast-${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageContainer);

        // 自动移除消息
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 3000);
    }

    // 获取当前用户信息
    getCurrentUser() {
        return {
            token: localStorage.getItem('auth_token'),
            username: localStorage.getItem('username')
        };
    }

    // 检查是否已登录
    isLoggedIn() {
        return localStorage.getItem('auth_token') !== null;
    }

    // 获取认证头
    getAuthHeaders() {
        const token = localStorage.getItem('auth_token');
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }
}

// 页面加载完成后初始化用户管理器
document.addEventListener('DOMContentLoaded', () => {
    window.userManager = new UserManager();
});

// 全局函数，供其他脚本使用
function isLoggedIn() {
    return localStorage.getItem('auth_token') !== null;
}

function getCurrentUser() {
    return {
        token: localStorage.getItem('auth_token'),
        username: localStorage.getItem('username')
    };
}

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

// 删除反馈项
async function deleteFeedbackItem(feedbackId, feedbackType) {
    if (!confirm('确定要删除这条反馈记录吗？')) {
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showNotification('请先登录', 'warning');
        return;
    }
    
    try {
        let response;
        
        switch (feedbackType) {
            case 'comment':
                response = await fetch(`/api/v1/comments/${feedbackId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                break;
            default:
                showNotification('不支持删除此类型的反馈', 'warning');
                return;
        }
        
        if (response.ok) {
            showNotification('反馈记录已删除', 'success');
            // 重新加载反馈历史
            loadFeedbackHistory();
        } else {
            throw new Error('删除反馈记录失败');
        }
        
    } catch (error) {
        console.error('删除反馈记录失败:', error);
        showNotification('删除反馈记录失败，请稍后重试', 'error');
    }
}

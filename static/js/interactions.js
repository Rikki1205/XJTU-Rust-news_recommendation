// 新闻互动功能脚本

// 全局变量
let currentArticleId = null;
let userInteractions = JSON.parse(localStorage.getItem('userInteractions') || '{}');

// 初始化互动按钮
function initInteractionButtons() {
    document.querySelectorAll('.interaction-btn').forEach(btn => {
        btn.addEventListener('click', handleInteraction);
    });
}

// 处理互动事件
function handleInteraction(event) {
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const newsId = document.getElementById('news-modal').dataset.newsId;
    
    if (!newsId) {
        console.error('无法获取新闻ID');
        return;
    }
    
    // 检查用户是否已登录
    if (!isLoggedIn()) {
        alert('请先登录后再进行操作');
        // 跳转到登录页面
        window.location.href = '/auth.html';
        return;
    }
    
    currentArticleId = newsId;
    
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
            toggleLike(button, newsId);
            break;
        case 'comment':
            scrollToComments();
            break;
        case 'favorite':
            toggleFavorite(button, newsId);
            break;
        default:
            console.error('未知的互动类型:', action);
    }
}

// 切换点赞状态
function toggleLike(button, newsId) {
    if (!isLoggedIn()) {
        alert('请先登录后再进行点赞操作');
        return;
    }
    
    const isLiked = userInteractions[newsId].liked;
    const newState = !isLiked;
    
    // 禁用按钮防止重复点击
    button.disabled = true;
    
    // 发送到服务器
    sendInteractionToServer(newsId, 'like', newState)
        .then(() => {
            // 更新UI
            const icon = button.querySelector('i');
            const countElement = button.querySelector('.like-count');
            let count = parseInt(countElement.textContent);
            
            if (newState) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#e74c3c';
                count++;
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
                count--;
            }
            
            countElement.textContent = count;
            
            // 更新状态
            userInteractions[newsId].liked = newState;
            userInteractions[newsId].timestamp = Date.now();
            localStorage.setItem('userInteractions', JSON.stringify(userInteractions));
            
            // 显示反馈
            showInteractionFeedback(newState ? '点赞成功' : '取消点赞');
        })
        .catch(error => {
            console.error('点赞操作失败:', error);
            alert('点赞操作失败，请稍后再试');
        })
        .finally(() => {
            button.disabled = false;
        });
}

// 切换收藏状态
function toggleFavorite(button, newsId) {
    if (!isLoggedIn()) {
        alert('请先登录后再进行收藏操作');
        return;
    }
    
    const isFavorited = userInteractions[newsId].favorited;
    const newState = !isFavorited;
    
    // 禁用按钮防止重复点击
    button.disabled = true;
    
    // 发送到服务器
    sendFavoriteToServer(newsId, newState)
        .then(() => {
            // 更新UI
            const icon = button.querySelector('i');
            const textElement = button.querySelector('.favorite-text');
            
            if (newState) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#f39c12';
                textElement.textContent = '已收藏';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
                textElement.textContent = '收藏';
            }
            
            // 更新状态
            userInteractions[newsId].favorited = newState;
            userInteractions[newsId].timestamp = Date.now();
            localStorage.setItem('userInteractions', JSON.stringify(userInteractions));
            
            // 显示反馈
            showInteractionFeedback(newState ? '收藏成功' : '取消收藏');
        })
        .catch(error => {
            console.error('收藏操作失败:', error);
            alert('收藏操作失败，请稍后再试');
        })
        .finally(() => {
            button.disabled = false;
        });
}

// 滚动到评论区
function scrollToComments() {
    const commentsSection = document.querySelector('.news-comments');
    if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
        
        // 聚焦到评论输入框
        const commentTextarea = document.getElementById('comment-text');
        if (commentTextarea) {
            setTimeout(() => {
                commentTextarea.focus();
            }, 500);
        }
    }
}

// 发送互动数据到服务器
function sendInteractionToServer(newsId, type, state) {
    const data = {
        article_id: newsId,
        interaction_type: type,
        is_active: state
    };
    
    return fetch('/api/v1/interactions/interactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('用户未登录或登录已过期');
            }
            throw new Error(`发送${type}互动失败`);
        }
        return response.json();
    });
}

// 发送收藏数据到服务器
function sendFavoriteToServer(newsId, state) {
    if (state) {
        // 添加收藏
        const data = {
            article_id: newsId,
            folder_name: 'default'
        };
        
        return fetch('/api/v1/interactions/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('用户未登录或登录已过期');
                }
                throw new Error('添加收藏失败');
            }
            return response.json();
        });
    } else {
        // 取消收藏
        return fetch(`/api/v1/interactions/favorites/${newsId}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders()
            },
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('用户未登录或登录已过期');
                }
                throw new Error('取消收藏失败');
            }
            return response.json();
        });
    }
}

// 加载新闻互动状态
function loadNewsInteractions(newsId) {
    // 重置互动按钮状态
    resetInteractionButtons();
    
    // 如果本地有该新闻的互动记录，应用到UI
    if (userInteractions[newsId]) {
        applyInteractionState(newsId);
    }
    
    // 从服务器获取互动数据
    fetch(`/api/v1/interactions/articles/${newsId}/interactions`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取新闻互动数据失败');
            }
            return response.json();
        })
        .then(data => {
            // 更新点赞数
            const likeCount = document.querySelector('.like-count');
            if (likeCount) {
                likeCount.textContent = data.like_count || 0;
            }
            
            // 更新评论数
            const commentCount = document.querySelector('.comment-count');
            if (commentCount) {
                commentCount.textContent = data.comment_count || 0;
            }
            
            // 如果用户已登录且服务器有用户的互动记录，更新本地状态
            if (isLoggedIn() && data.user_interaction) {
                if (!userInteractions[newsId]) {
                    userInteractions[newsId] = {
                        liked: false,
                        favorited: false,
                        timestamp: Date.now()
                    };
                }
                
                userInteractions[newsId].liked = data.user_interaction.liked || false;
                userInteractions[newsId].favorited = data.user_interaction.favorited || false;
                localStorage.setItem('userInteractions', JSON.stringify(userInteractions));
                
                // 应用到UI
                applyInteractionState(newsId);
            }
        })
        .catch(error => {
            console.error('获取新闻互动数据出错:', error);
            // 如果服务器获取失败，使用本地数据
            if (userInteractions[newsId]) {
                applyInteractionState(newsId);
            }
        });
}

// 重置互动按钮状态
function resetInteractionButtons() {
    // 重置点赞按钮
    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn) {
        const likeIcon = likeBtn.querySelector('i');
        likeIcon.classList.remove('fas');
        likeIcon.classList.add('far');
        likeIcon.style.color = '';
        
        const likeCount = likeBtn.querySelector('.like-count');
        likeCount.textContent = '0';
    }
    
    // 重置收藏按钮
    const favoriteBtn = document.querySelector('.favorite-btn');
    if (favoriteBtn) {
        const favoriteIcon = favoriteBtn.querySelector('i');
        favoriteIcon.classList.remove('fas');
        favoriteIcon.classList.add('far');
        favoriteIcon.style.color = '';
        
        const favoriteText = favoriteBtn.querySelector('.favorite-text');
        favoriteText.textContent = '收藏';
    }
}

// 应用互动状态到UI
function applyInteractionState(newsId) {
    const interaction = userInteractions[newsId];
    
    // 应用点赞状态
    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn && interaction.liked) {
        const likeIcon = likeBtn.querySelector('i');
        likeIcon.classList.remove('far');
        likeIcon.classList.add('fas');
        likeIcon.style.color = '#e74c3c';
    }
    
    // 应用收藏状态
    const favoriteBtn = document.querySelector('.favorite-btn');
    if (favoriteBtn && interaction.favorited) {
        const favoriteIcon = favoriteBtn.querySelector('i');
        favoriteIcon.classList.remove('far');
        favoriteIcon.classList.add('fas');
        favoriteIcon.style.color = '#f39c12';
        
        const favoriteText = favoriteBtn.querySelector('.favorite-text');
        favoriteText.textContent = '已收藏';
    }
}

// 显示互动反馈
function showInteractionFeedback(message) {
    // 创建反馈元素
    const feedback = document.createElement('div');
    feedback.className = 'interaction-feedback';
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease-out;
    `;
    
    // 添加动画样式
    if (!document.querySelector('#interaction-feedback-styles')) {
        const style = document.createElement('style');
        style.id = 'interaction-feedback-styles';
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
    
    document.body.appendChild(feedback);
    
    // 3秒后自动移除
    setTimeout(() => {
        feedback.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 3000);
}

// 检查用户是否已登录
function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    return token && token.trim() !== '';
}

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    if (token) {
        return {
            'Authorization': `Bearer ${token}`
        };
    }
    return {};
}

// 初始化互动功能
document.addEventListener('DOMContentLoaded', function() {
    initInteractionButtons();
});

// 导出函数供其他脚本使用
window.loadNewsInteractions = loadNewsInteractions;
window.initInteractionButtons = initInteractionButtons;

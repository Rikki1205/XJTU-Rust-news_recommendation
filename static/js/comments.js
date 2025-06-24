// 评论功能相关脚本

// 全局变量
let currentNewsId = null;
let commentsData = [];

// 加载文章评论
function loadComments(newsId) {
    currentNewsId = newsId;
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) {
        return;
    }
    
    // 显示加载中
    commentsContainer.innerHTML = `
        <div class="loading-comments">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载评论...</p>
        </div>
    `;
    
    // 获取评论数据
    fetch(`/api/v1/comments/article/${newsId}`)
        .then(response => response.json())
        .then(data => {
            commentsData = data;
            renderComments(data);
        })
        .catch(error => {
            console.error('获取评论出错:', error);
            commentsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>获取评论时出错，请稍后再试</p>
                    <button class="btn retry-btn">重试</button>
                </div>
            `;
            document.querySelector('.retry-btn').addEventListener('click', () => loadComments(newsId));
        });
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
    
    // 检查登录状态并更新UI
    if (!isLoggedIn()) {
        commentTextarea.placeholder = '请先登录后再发表评论...';
        commentTextarea.disabled = true;
        newSubmitButton.textContent = '请先登录';
        newSubmitButton.disabled = true;
        newSubmitButton.addEventListener('click', function() {
            alert('请先登录后再发表评论');
            window.location.href = '/auth.html';
        });
    } else {
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
}

// 提交评论
function submitComment() {
    if (!isLoggedIn()) {
        alert('请先登录后再发表评论');
        window.location.href = '/auth.html';
        return;
    }
    
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
    
    // 准备评论数据
    const commentData = {
        article_id: currentNewsId,
        content: commentText,
        created_at: new Date().toISOString(),
        type: 'comment',
        article_title: document.querySelector('.news-modal-title')?.textContent || `文章 #${currentNewsId}`,
        id: crypto.randomUUID()
    };

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
}

// 删除评论
function deleteComment(commentId) {
    if (!isLoggedIn()) {
        alert('请先登录');
        return;
    }
    
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }
    
    // 发送删除请求
    fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeaders()
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('用户未登录或登录已过期');
            } else if (response.status === 403) {
                throw new Error('您没有权限删除此评论');
            }
            throw new Error('删除评论失败');
        }
        return response.text(); // 删除成功返回空内容
    })
    .then(() => {
        // 重新加载评论
        loadComments(currentNewsId);
        
        // 显示成功消息
        showCommentFeedback('评论已删除');
        
        // 更新评论数量
        updateCommentCount();
    })
    .catch(error => {
        console.error('删除评论出错:', error);
        if (error.message.includes('登录')) {
            alert(error.message);
            window.location.href = '/auth.html';
        } else {
            alert(error.message);
        }
    });
}

// 更新评论数量
function updateCommentCount() {
    const commentCountElement = document.querySelector('.comment-count');
    if (commentCountElement && currentNewsId) {
        // 重新获取文章统计信息
        fetch(`/api/v1/interactions/articles/${currentNewsId}/interactions`)
            .then(response => response.json())
            .then(data => {
                commentCountElement.textContent = data.comment_count || 0;
            })
            .catch(error => {
                console.error('更新评论数量失败:', error);
            });
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
    const token = localStorage.getItem('authToken');
    return token && token.trim() !== '';
}

// 获取当前用户信息
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
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

// 在打开新闻详情模态框时加载评论
document.addEventListener('DOMContentLoaded', function() {
    // 监听新闻模态框打开事件
    const originalOpenNewsModal = window.openNewsModal;
    if (typeof originalOpenNewsModal === 'function') {
        window.openNewsModal = function(newsItem) {
            // 调用原始函数
            originalOpenNewsModal(newsItem);
            
            // 加载评论
            loadComments(newsItem.id);
        };
    }

    setupCommentForm();
});

// 导出函数供其他脚本使用
window.loadComments = loadComments;
window.setupCommentForm = setupCommentForm;

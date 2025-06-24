// 认证页面JavaScript
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
    }

    bindEvents() {
        // 表单切换
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // 表单提交
        document.getElementById('login-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    setupFormValidation() {
        // 密码确认验证
        const confirmPassword = document.getElementById('register-confirm-password');
        const password = document.getElementById('register-password');

        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.value !== password.value) {
                confirmPassword.setCustomValidity('密码不匹配');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });

        password.addEventListener('input', () => {
            if (confirmPassword.value && confirmPassword.value !== password.value) {
                confirmPassword.setCustomValidity('密码不匹配');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.add('active');
    }

    showLoginForm() {
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
    }

    async handleLogin() {
        const form = document.getElementById('login-form-element');
        const formData = new FormData(form);
        
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        if (!this.validateLoginData(loginData)) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('登录成功！正在跳转...', 'success');
                
                // 保存token（使用两种key以兼容不同的脚本）
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('username', loginData.username);
                
                // 获取用户完整信息
                this.fetchUserProfile(result.token);
                
                // 跳转到首页
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showMessage(result.message || '登录失败，请检查用户名和密码', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister() {
        const form = document.getElementById('register-form-element');
        const formData = new FormData(form);
        
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        const confirmPassword = formData.get('confirmPassword');

        if (!this.validateRegisterData(registerData, confirmPassword)) {
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('注册成功！正在跳转...', 'success');
                
                // 保存token（使用两种key以兼容不同的脚本）
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('username', registerData.username);
                localStorage.setItem('email', registerData.email); // 注册时我们知道邮箱
                
                // 获取用户完整信息
                this.fetchUserProfile(result.token);
                
                // 跳转到首页
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showMessage(result.message || '注册失败，请检查输入信息', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    validateLoginData(data) {
        if (!data.username || data.username.trim().length < 3) {
            this.showMessage('用户名至少需要3个字符', 'error');
            return false;
        }

        if (!data.password || data.password.length < 6) {
            this.showMessage('密码至少需要6个字符', 'error');
            return false;
        }

        return true;
    }

    validateRegisterData(data, confirmPassword) {
        if (!data.username || data.username.trim().length < 3) {
            this.showMessage('用户名至少需要3个字符', 'error');
            return false;
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            this.showMessage('请输入有效的邮箱地址', 'error');
            return false;
        }

        if (!data.password || data.password.length < 6) {
            this.showMessage('密码至少需要6个字符', 'error');
            return false;
        }

        if (data.password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致', 'error');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async fetchUserProfile(token) {
        try {
            const response = await fetch('/api/v1/users/profile/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userProfile = await response.json();
                // 保存用户完整信息
                localStorage.setItem('email', userProfile.email);
                localStorage.setItem('username', userProfile.username);
                console.log('用户信息已更新:', userProfile);
            } else {
                console.warn('获取用户信息失败:', response.status);
            }
        } catch (error) {
            console.error('获取用户信息出错:', error);
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        container.appendChild(messageElement);
        
        // 自动移除消息
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已经登录
    const token = localStorage.getItem('auth_token');
    if (token) {
        // 如果已经登录，跳转到首页
        window.location.href = '/';
        return;
    }

    // 初始化认证管理器
    new AuthManager();
});

// 工具函数：检查用户是否已登录
function isLoggedIn() {
    return localStorage.getItem('auth_token') !== null;
}

// 工具函数：获取当前用户信息
function getCurrentUser() {
    return {
        token: localStorage.getItem('auth_token'),
        username: localStorage.getItem('username')
    };
}

// 工具函数：登出
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    window.location.href = '/auth.html';
} 
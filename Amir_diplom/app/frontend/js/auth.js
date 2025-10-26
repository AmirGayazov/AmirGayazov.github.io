class Auth {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
    }

    async login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');

    if (loginText) loginText.style.display = 'none';
    if (loginSpinner) loginSpinner.style.display = 'block';

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const response = await fetch('/token', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('authToken', this.token);
            
            // Get user info
            try {
                const userResponse = await this.makeAuthenticatedRequest('/users/me/');
                if (userResponse.ok) {
                    this.user = await userResponse.json();
                    localStorage.setItem('user', JSON.stringify(this.user));
                    this.showNotification('Успешный вход!', 'success');
                    
                    // Redirect based on user role
                    setTimeout(() => {
                        if (window.location.pathname.includes('login')) {
                            window.location.href = this.user.is_admin ? '/admin' : '/';
                        }
                    }, 1000);
                } else {
                    throw new Error('Failed to get user info');
                }
            } catch (error) {
                console.error('Error getting user info:', error);
                // Если не удалось получить информацию о пользователе, используем базовую
                this.user = { username: username, is_admin: false };
                localStorage.setItem('user', JSON.stringify(this.user));
                this.showNotification('Успешный вход!', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        } else {
            let errorMessage = 'Неверное имя пользователя или пароль';
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                // Если не удалось распарсить JSON, используем стандартное сообщение
            }
            this.showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        this.showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        if (loginText) loginText.style.display = 'block';
        if (loginSpinner) loginSpinner.style.display = 'none';
    }
}

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        window.location.href = '/login';
    }

    checkAuth() {
        // Разрешаем доступ к страницам логина и регистрации без аутентификации
        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
            return true;
        }
        
        if (!this.token && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Authentication failed');
        }

        return response;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});
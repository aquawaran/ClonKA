// Глобальные переменные
let currentUser = null;
let currentToken = null;
let isLoading = false;

// DOM элементы
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const emailVerificationForm = document.getElementById('emailVerificationForm');

// API URL
const API_URL = window.location.origin + '/api';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuth();
    initializeAnimations();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение форм авторизации
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('register');
    });

    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('login');
    });

    document.getElementById('backToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('register');
    });

    // Формы
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('verificationFormElement').addEventListener('submit', handleEmailVerification);
    document.getElementById('resendCode').addEventListener('click', handleResendCode);

    // Навигация
    document.querySelectorAll('.nav-link[data-screen]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = e.currentTarget.dataset.screen;
            showScreen(screen);
        });
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Модальное окно создания поста
    document.getElementById('createPostBtn').addEventListener('click', showCreatePostModal);
    document.getElementById('closeModalBtn').addEventListener('click', hideCreatePostModal);
    document.getElementById('createPostForm').addEventListener('submit', handleCreatePost);

    // Счетчик символов
    document.getElementById('postContent').addEventListener('input', updateCharCount);

    // Закрытие модального окна по клику вне его
    document.getElementById('createPostModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            hideCreatePostModal();
        }
    });

    // Анимация при наведении на посты
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('.post')) {
            e.target.closest('.post').style.transform = 'translateX(2px)';
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.post')) {
            e.target.closest('.post').style.transform = 'translateX(0)';
        }
    });
}

// Инициализация анимаций
function initializeAnimations() {
    // Анимация появления элементов при загрузке
    const elements = document.querySelectorAll('.fade-in');
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Переключение форм с анимацией
function switchForm(formType) {
    const forms = [loginForm, registerForm, emailVerificationForm];
    
    forms.forEach(form => {
        form.classList.remove('active');
        form.style.opacity = '0';
        form.style.transform = 'translateY(20px)';
    });

    setTimeout(() => {
        switch (formType) {
            case 'login':
                loginForm.classList.add('active');
                break;
            case 'register':
                registerForm.classList.add('active');
                break;
            case 'verification':
                emailVerificationForm.classList.add('active');
                break;
        }

        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            activeForm.style.opacity = '1';
            activeForm.style.transform = 'translateY(0)';
        }
    }, 150);
}

// Показ формы подтверждения email
function showEmailVerificationForm(email) {
    document.getElementById('verificationEmail').textContent = email;
    switchForm('verification');
}

// Обработчики форм с анимацией загрузки
async function handleRegister(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Анимация загрузки
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner">⏳</span> Регистрация...';
    
    const formData = {
        name: document.getElementById('registerName').value,
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Регистрация успешна! Проверьте email ✅', 'success');
            showEmailVerificationForm(data.email);
        } else {
            showNotification(data.error || 'Ошибка регистрации ❌', 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
    } finally {
        // Восстановление кнопки
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Анимация загрузки
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner">⏳</span> Вход...';
    
    const formData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            currentToken = data.token;
            localStorage.setItem('clone_token', currentToken);
            
            showNotification('Вход выполнен успешно! 🎉', 'success');
            showMainApp();
            loadPosts();
        } else {
            if (data.needsVerification) {
                showNotification('Email не подтвержден. Проверьте почту 📧', 'warning');
                showEmailVerificationForm(data.email);
            } else {
                showNotification(data.error || 'Ошибка входа 🔐', 'error');
            }
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
    } finally {
        // Восстановление кнопки
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleEmailVerification(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner">⏳</span> Проверка...';
    
    const email = document.getElementById('verificationEmail').textContent;
    const code = document.getElementById('verificationCode').value;

    try {
        const response = await fetch(`${API_URL}/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Email подтвержден! Теперь можно войти 🎉', 'success');
            switchForm('login');
        } else {
            showNotification(data.error || 'Неверный код ❌', 'error');
        }
    } catch (error) {
        console.error('Ошибка подтверждения:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleResendCode(e) {
    e.preventDefault();
    
    const email = document.getElementById('verificationEmail').textContent;
    const link = e.target;
    const originalText = link.textContent;

    link.style.opacity = '0.5';
    link.style.pointerEvents = 'none';
    link.textContent = 'Отправка...';

    try {
        const response = await fetch(`${API_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Код отправлен повторно 📧', 'success');
        } else {
            showNotification(data.error || 'Ошибка отправки ❌', 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки кода:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
    } finally {
        link.style.opacity = '1';
        link.style.pointerEvents = 'auto';
        link.textContent = originalText;
    }
}

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('clone_token');
    if (token) {
        currentToken = token;
        showMainApp();
        loadPosts();
    }
}

// Показ основного приложения с анимацией
function showMainApp() {
    authScreen.classList.remove('active');
    
    setTimeout(() => {
        mainApp.classList.add('active');
        
        // Анимация появления элементов
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const rightSidebar = document.querySelector('.right-sidebar');
        
        sidebar.style.animation = 'slideIn 0.3s ease forwards';
        mainContent.style.animation = 'fadeIn 0.5s ease forwards';
        rightSidebar.style.animation = 'slideIn 0.3s ease forwards';
        
        // Обновление информации о пользователе
        if (currentUser) {
            document.getElementById('profileName').textContent = currentUser.name;
            document.getElementById('profileUsername').textContent = `@${currentUser.username}`;
            document.getElementById('profileStatus').textContent = 'Email подтвержден ✅';
        }
    }, 300);
}

// Показ экранов приложения с анимацией
function showScreen(screenName) {
    // Обновление активной навигации
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-screen="${screenName}"]`).classList.add('active');

    // Обновление заголовка
    const titles = {
        feed: 'Главная',
        profile: 'Профиль',
        admin: 'Настройки'
    };
    document.getElementById('screenTitle').textContent = titles[screenName];

    // Переключение экранов с анимацией
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.opacity = '0';
        screen.style.transform = 'translateY(20px)';
    });

    setTimeout(() => {
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.style.opacity = '1';
            targetScreen.style.transform = 'translateY(0)';
        }
    }, 150);
}

// Загрузка постов с анимацией
async function loadPosts() {
    const postsContainer = document.getElementById('postsContainer');
    
    // Показываем скелетон
    postsContainer.innerHTML = generateSkeletonPosts(3);
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const posts = await response.json();
            
            // Анимация загрузки
            setTimeout(() => {
                renderPosts(posts);
            }, 500);
        } else {
            showNotification('Ошибка загрузки постов ❌', 'error');
            postsContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Не удалось загрузить посты</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
        postsContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Ошибка соединения</p>';
    }
}

// Генерация скелетонов для постов
function generateSkeletonPosts(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="post skeleton-post">
                <div class="post-header">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="post-author-info">
                        <div class="skeleton skeleton-text" style="width: 120px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80px;"></div>
                    </div>
                </div>
                <div class="post-content">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 80%;"></div>
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                </div>
            </div>
        `;
    }
    return html;
}

// Рендеринг постов с анимацией
function renderPosts(posts) {
    const postsContainer = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🌟</div>
                <h3>Пока нет постов</h3>
                <p>Будьте первым, кто создаст пост!</p>
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = posts.map((post, index) => `
        <div class="post fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="post-header">
                <div class="post-avatar">${post.name.charAt(0).toUpperCase()}</div>
                <div class="post-author-info">
                    <div class="post-author">${post.name}</div>
                    <div class="post-time">${formatTime(post.created_at)}</div>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
                <button class="action-btn" onclick="handleLike(this)">
                    ❤️ <span>0</span>
                </button>
                <button class="action-btn" onclick="handleComment(this)">
                    💬 <span>0</span>
                </button>
                <button class="action-btn" onclick="handleShare(this)">
                    🔄 <span>0</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Модальное окно создания поста
function showCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    modal.classList.add('active');
    document.getElementById('postContent').focus();
    updateCharCount();
}

function hideCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    modal.classList.remove('active');
    document.getElementById('postContent').value = '';
    updateCharCount();
}

function updateCharCount() {
    const textarea = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitPostBtn');
    
    const count = textarea.value.length;
    charCount.textContent = count;
    
    // Изменение цвета при приближении к лимиту
    if (count > 250) {
        charCount.style.color = 'var(--warning)';
    } else if (count > 270) {
        charCount.style.color = 'var(--danger)';
    } else {
        charCount.style.color = 'var(--text-secondary)';
    }
    
    // Блокировка кнопки при превышении лимита
    submitBtn.disabled = count === 0 || count > 280;
}

async function handleCreatePost(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value.trim();
    const submitBtn = document.getElementById('submitPostBtn');
    
    if (!content) return;
    
    // Анимация загрузки
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner">⏳</span> Публикация...';
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            showNotification('Пост опубликован! 🎉', 'success');
            hideCreatePostModal();
            loadPosts(); // Перезагрузка постов
        } else {
            showNotification('Ошибка создания поста ❌', 'error');
        }
    } catch (error) {
        console.error('Ошибка создания поста:', error);
        showNotification('Ошибка соединения с сервером 🌐', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Опубликовать';
    }
}

// Обработчики действий с постами
function handleLike(btn) {
    btn.classList.toggle('liked');
    const count = btn.querySelector('span');
    const currentCount = parseInt(count.textContent);
    count.textContent = btn.classList.contains('liked') ? currentCount + 1 : currentCount - 1;
    
    // Анимация
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
    }, 200);
}

function handleComment(btn) {
    showNotification('Комментарии в разработке 💬', 'info');
}

function handleShare(btn) {
    showNotification('Поделиться в разработке 🔄', 'info');
}

// Выход с анимацией
function handleLogout() {
    if (confirm('Точно хотите выйти? 🚪')) {
        localStorage.removeItem('clone_token');
        currentUser = null;
        currentToken = null;
        
        // Анимация выхода
        mainApp.classList.remove('active');
        
        setTimeout(() => {
            authScreen.classList.add('active');
            switchForm('login');
            showNotification('Вы вышли из аккаунта 👋', 'info');
        }, 300);
    }
}

// Вспомогательные функции
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days < 7) return `${days} д`;
    
    return date.toLocaleDateString('ru-RU');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    notification.style.animation = 'slideIn 0.3s ease';
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Добавление стилей для загрузки
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: inline-block;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
    
    .skeleton-post {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    
    .skeleton-text {
        height: 1rem;
        margin-bottom: 0.5rem;
        border-radius: var(--radius-sm);
    }
    
    .skeleton-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        margin-right: 0.75rem;
    }
`;
document.head.appendChild(style);

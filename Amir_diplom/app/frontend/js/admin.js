class AdminApp {
    constructor() {
        this.appointments = [];
        this.historyAppointments = [];
        this.clients = [];
        this.services = [];
        this.statistics = {};
        this.settings = {};
        this.init();
    }
    
    async init() {
        if (!window.auth.checkAuth()) return;
        
        if (!window.auth.user?.is_admin) {
            window.auth.showNotification('Недостаточно прав для доступа к админке', 'error');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }
        
        this.bindEvents();
        this.setupHeader();
        await this.loadInitialData();
    }
    
    setupHeader() {
        const user = window.auth.user;
        if (user && document.querySelector('.user-menu')) {
            const userAvatar = document.querySelector('.user-avatar');
            const userName = document.querySelector('.user-name');
            if (userAvatar) {
                userAvatar.textContent = user.username.charAt(0).toUpperCase();
            }
            if (userName) {
                userName.textContent = user.username;
            }
        }
    }
    
    bindEvents() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.showSection(e.target.dataset.section);
            });
        });
        
        const serviceForm = document.getElementById('service-form');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createService();
            });
        }
        
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSettings();
            });
        }

        const historyFiltersForm = document.getElementById('history-filters-form');
        if (historyFiltersForm) {
            historyFiltersForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.loadHistoryAppointments();
            });
        }

        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetHistoryFilters();
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.auth.logout();
            });
        }
    }
    
    async loadInitialData() {
        await Promise.all([
            this.loadAppointments(),
            this.loadClients(),
            this.loadServices(),
            this.loadStatistics(),
            this.loadSettings()
        ]);
    }
    
    async loadAppointments() {
        try {
            const response = await window.auth.makeAuthenticatedRequest('/appointments-with-details/');
            this.appointments = await response.json();
            this.renderAppointments();
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showNotification('Ошибка загрузки записей', 'error');
        }
    }

    async loadHistoryAppointments() {
        const status = document.getElementById('filter-status').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;

        try {
            const params = new URLSearchParams();
            if (status && status !== 'all') params.append('status', status);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await window.auth.makeAuthenticatedRequest(`/admin/all-appointments/?${params}`);
            this.historyAppointments = await response.json();
            this.renderHistoryAppointments();
            
            this.showNotification(`Найдено записей: ${this.historyAppointments.length}`, 'success');
        } catch (error) {
            console.error('Error loading history appointments:', error);
            this.showNotification('Ошибка загрузки истории записей', 'error');
        }
    }

    resetHistoryFilters() {
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        this.loadHistoryAppointments();
    }
    
    async loadClients() {
        try {
            const response = await window.auth.makeAuthenticatedRequest('/clients/');
            this.clients = await response.json();
            this.renderClients();
        } catch (error) {
            console.error('Error loading clients:', error);
            this.showNotification('Ошибка загрузки клиентов', 'error');
        }
    }
    
    async loadServices() {
        try {
            const response = await window.auth.makeAuthenticatedRequest('/services/');
            this.services = await response.json();
            this.renderServicesManagement();
        } catch (error) {
            console.error('Error loading services:', error);
            this.showNotification('Ошибка загрузки услуг', 'error');
        }
    }
    
    async loadStatistics() {
        try {
            const response = await window.auth.makeAuthenticatedRequest('/statistics/');
            this.statistics = await response.json();
            this.renderStatistics();
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showNotification('Ошибка загрузки статистики', 'error');
        }
    }
    
    async loadSettings() {
        try {
            const response = await window.auth.makeAuthenticatedRequest('/admin/settings/');
            this.settings = await response.json();
            this.renderSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    renderAppointments() {
        const container = document.getElementById('pending-appointments');
        if (!container) return;
        
        const pendingAppointments = this.appointments.filter(apt => apt.status === 'pending');
        
        if (pendingAppointments.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-light);">Нет ожидающих записей</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        pendingAppointments.forEach(appointment => {
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'card';
            appointmentElement.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="margin-bottom: 0.5rem;">${appointment.client_name}</h3>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;">📞 ${appointment.client_phone}</p>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;">🛠️ ${appointment.service_name}</p>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;">💰 ${appointment.service_price} руб.</p>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;">📅 ${new Date(appointment.appointment_date).toLocaleString('ru-RU')}</p>
                        ${appointment.notes ? `<p style="color: var(--text-light);"><strong>Примечание:</strong> ${appointment.notes}</p>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                        <button class="btn btn-success btn-confirm" data-id="${appointment.id}">Подтвердить</button>
                        <button class="btn btn-danger btn-cancel" data-id="${appointment.id}">Отклонить</button>
                    </div>
                </div>
            `;
            container.appendChild(appointmentElement);
        });
        
        container.querySelectorAll('.btn-confirm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateAppointmentStatus(e.target.dataset.id, 'confirmed');
            });
        });
        
        container.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateAppointmentStatus(e.target.dataset.id, 'cancelled');
            });
        });
    }

    renderHistoryAppointments() {
        const container = document.getElementById('history-appointments-list');
        if (!container) return;

        if (this.historyAppointments.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-light);">Записей не найдено</p></div>';
            return;
        }

        // Группируем записи по дате
        const groupedAppointments = this.groupAppointmentsByDate(this.historyAppointments);

        let html = '';
        
        for (const [date, appointments] of Object.entries(groupedAppointments)) {
            html += `
                <div class="card" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-color); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                        ${date}
                    </h3>
                    ${appointments.map(appointment => `
                        <div style="padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; background: var(--secondary-color);">
                            <div style="display: flex; justify-content: between; align-items: start;">
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                                        <div>
                                            <h4 style="margin-bottom: 0.5rem;">${appointment.client_name}</h4>
                                            <p style="color: var(--text-light); margin-bottom: 0.5rem;">📞 ${appointment.client_phone}</p>
                                        </div>
                                        <div>
                                            <span class="status-badge ${this.getStatusClass(appointment.status)}">
                                                ${this.getStatusText(appointment.status)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                        <div>
                                            <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                                                <strong>Услуга:</strong> ${appointment.service_name}
                                            </p>
                                            <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                                                <strong>Цена:</strong> ${appointment.service_price} руб.
                                            </p>
                                        </div>
                                        <div>
                                            <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                                                <strong>Время:</strong> ${new Date(appointment.appointment_date).toLocaleTimeString('ru-RU')}
                                            </p>
                                            <p style="color: var(--text-light); margin-bottom: 0;">
                                                <strong>Создана:</strong> ${new Date(appointment.created_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    ${appointment.notes ? `
                                        <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.05); border-radius: 4px;">
                                            <p style="color: var(--text-light); margin: 0;">
                                                <strong>Примечание:</strong> ${appointment.notes}
                                            </p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    groupAppointmentsByDate(appointments) {
        const grouped = {};
        
        appointments.forEach(appointment => {
            const date = new Date(appointment.appointment_date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!grouped[date]) {
                grouped[date] = [];
            }
            
            grouped[date].push(appointment);
        });

        // Сортируем даты в обратном порядке (новые сверху)
        const sortedGrouped = {};
        Object.keys(grouped)
            .sort((a, b) => new Date(b) - new Date(a))
            .forEach(date => {
                sortedGrouped[date] = grouped[date];
            });

        return sortedGrouped;
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'confirmed': 'status-confirmed',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает',
            'confirmed': 'Подтверждено',
            'completed': 'Выполнено',
            'cancelled': 'Отменено'
        };
        return statusMap[status] || status;
    }
    
    renderClients() {
        const container = document.getElementById('clients-list');
        if (!container) return;
        
        if (this.clients.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-light);">Нет клиентов</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.clients.forEach(client => {
            const clientElement = document.createElement('div');
            clientElement.className = 'card';
            clientElement.innerHTML = `
                <div>
                    <h3 style="margin-bottom: 0.5rem;">${client.name}</h3>
                    <p style="color: var(--text-light); margin-bottom: 0.5rem;">📞 ${client.phone}</p>
                    ${client.email ? `<p style="color: var(--text-light); margin-bottom: 0.5rem;">📧 ${client.email}</p>` : ''}
                    ${client.notes ? `<p style="color: var(--text-light);"><strong>Заметки:</strong> ${client.notes}</p>` : ''}
                    <p style="color: var(--text-light); font-size: 0.875rem;">Зарегистрирован: ${new Date(client.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
            `;
            container.appendChild(clientElement);
        });
    }
    
    renderServicesManagement() {
        const container = document.getElementById('services-management-list');
        if (!container) return;
        
        if (this.services.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align: center; color: var(--text-light);">Нет услуг</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.services.forEach(service => {
            const serviceElement = document.createElement('div');
            serviceElement.className = 'card';
            serviceElement.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin-bottom: 0.5rem;">${service.name}</h3>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;">${service.description || 'Описание не указано'}</p>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <span style="font-weight: 600; color: var(--primary-color);">${service.price} руб.</span>
                            <span style="color: var(--text-light);">${service.duration} мин.</span>
                            <span class="status-badge ${service.is_active ? 'status-completed' : 'status-cancelled'}">
                                ${service.is_active ? 'Активна' : 'Неактивна'}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline btn-edit" data-id="${service.id}">Изменить</button>
                        <button class="btn btn-danger btn-delete" data-id="${service.id}">Удалить</button>
                    </div>
                </div>
            `;
            container.appendChild(serviceElement);
        });
    }
    
    renderStatistics() {
        const container = document.getElementById('stats-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.total_appointments || 0}</div>
                    <div class="stat-label">Всего записей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.completed_appointments || 0}</div>
                    <div class="stat-label">Выполнено</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.statistics.pending_appointments || 0}</div>
                    <div class="stat-label">Ожидают</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(this.statistics.total_revenue || 0).toFixed(2)}</div>
                    <div class="stat-label">Общий доход (руб.)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(this.statistics.monthly_revenue || 0).toFixed(2)}</div>
                    <div class="stat-label">Доход за месяц</div>
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1rem;">Популярные услуги</h3>
                ${this.renderPopularServices()}
            </div>
        `;
    }
    
    renderPopularServices() {
        if (!this.statistics.popular_services || this.statistics.popular_services.length === 0) {
            return '<p style="text-align: center; color: var(--text-light);">Нет данных</p>';
        }
        
        return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${this.statistics.popular_services.map(service => `
                    <div style="display: flex; justify-content: between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                        <span>${service.name}</span>
                        <span style="font-weight: 600; color: var(--primary-color);">${service.count} зап.</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderSettings() {
        const form = document.getElementById('settings-form');
        if (!form) return;
        
        form.querySelector('#business-name').value = this.settings.business_name || '';
        form.querySelector('#business-address').value = this.settings.business_address || '';
        form.querySelector('#business-phone').value = this.settings.business_phone || '';
        form.querySelector('#business-email').value = this.settings.business_email || '';
        form.querySelector('#working-hours').value = this.settings.working_hours || '';
        form.querySelector('#notification-hours').value = this.settings.notification_reminder_hours || 24;
    }
    
    async createService() {
        const formData = {
            name: document.getElementById('service-name').value,
            price: parseFloat(document.getElementById('service-price').value),
            duration: parseInt(document.getElementById('service-duration').value),
            description: document.getElementById('service-description').value
        };
        
        try {
            const response = await window.auth.makeAuthenticatedRequest('/services/', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                this.showNotification('Услуга успешно создана!', 'success');
                document.getElementById('service-form').reset();
                await this.loadServices();
            } else {
                this.showNotification('Ошибка при создании услуги', 'error');
            }
        } catch (error) {
            console.error('Error creating service:', error);
            this.showNotification('Ошибка при создании услуги', 'error');
        }
    }
    
    async updateAppointmentStatus(appointmentId, status) {
        try {
            const response = await window.auth.makeAuthenticatedRequest(`/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: status })
            });

            console.log('Update status response:', response);

            if (response.ok) {
                const result = await response.json();
                console.log('Update status success:', result);
                this.showNotification(`Статус записи обновлен на "${status}"`, 'success');
                await this.loadAppointments();
                await this.loadStatistics();
            } else {
                let errorMessage = 'Ошибка при обновлении статуса';
                try {
                    const errorData = await response.json();
                    console.error('Error response:', errorData);
                    
                    if (errorData.detail) {
                        if (typeof errorData.detail === 'string') {
                            errorMessage = errorData.detail;
                        } else if (Array.isArray(errorData.detail)) {
                            errorMessage = errorData.detail.map(err => {
                                if (err.loc && err.msg) {
                                    return `${err.loc[1]}: ${err.msg}`;
                                }
                                return err.msg || err.message;
                            }).join(', ');
                        } else if (typeof errorData.detail === 'object') {
                            errorMessage = JSON.stringify(errorData.detail);
                        }
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    errorMessage = `HTTP Error: ${response.status}`;
                }
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Network error updating status:', error);
            this.showNotification('Ошибка подключения к серверу: ' + error.message, 'error');
        }
    }
    
    async updateSettings() {
        const formData = {
            business_name: document.getElementById('business-name').value,
            business_address: document.getElementById('business-address').value,
            business_phone: document.getElementById('business-phone').value,
            business_email: document.getElementById('business-email').value,
            working_hours: document.getElementById('working-hours').value,
            notification_reminder_hours: parseInt(document.getElementById('notification-hours').value)
        };
        
        try {
            const response = await window.auth.makeAuthenticatedRequest('/admin/settings/', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                this.showNotification('Настройки успешно обновлены!', 'success');
                await this.loadSettings();
            } else {
                this.showNotification('Ошибка при обновлении настроек', 'error');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            this.showNotification('Ошибка при обновлении настроек', 'error');
        }
    }
    
    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            
            if (sectionName === 'pending') {
                this.loadAppointments();
            } else if (sectionName === 'history') {
                this.loadHistoryAppointments();
            } else if (sectionName === 'statistics') {
                this.loadStatistics();
            }
        }
        
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }
    }
    
    showNotification(message, type = 'info') {
        window.auth.showNotification(message, type);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
});
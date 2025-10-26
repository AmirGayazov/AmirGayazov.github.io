class ClientApp {
    constructor() {
        this.services = [];
        this.settings = {};
        this.clientAppointments = [];
        this.init();
    }
    
    init() {
        if (!window.auth.checkAuth()) return;
        
        this.bindEvents();
        this.loadServices();
        this.loadSettings();
        this.setupHeader();
    }
    
    setupHeader() {
        const user = window.auth.user;
        if (user && document.querySelector('.user-menu')) {
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar) {
                userAvatar.textContent = user.username.charAt(0).toUpperCase();
            }
        }
    }
    
    bindEvents() {
        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.showSection(e.target.dataset.section);
            });
        });
        
        // Appointment form
        const appointmentForm = document.getElementById('appointment-form');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createAppointment();
            });
        }

        // Search appointments form
        const searchForm = document.getElementById('search-appointments-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchAppointments();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.auth.logout();
            });
        }
        
        // Setup date time input
        this.setupDateTimeInput();
    }
    
    setupDateTimeInput() {
        const dateInput = document.getElementById('appointment-date');
        if (!dateInput) return;
        
        // Установка минимальной даты (текущий день и время)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        dateInput.min = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Установка значения по умолчанию (завтра в 10:00)
        this.setDefaultDateTime();
    }
    
    setDefaultDateTime() {
        const dateInput = document.getElementById('appointment-date');
        if (!dateInput) return;
        
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        
        dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    async loadServices() {
        try {
            const response = await fetch('/services/');
            this.services = await response.json();
            this.renderServices();
            this.populateServiceSelect();
        } catch (error) {
            console.error('Error loading services:', error);
            this.showNotification('Ошибка загрузки услуг', 'error');
        }
    }

    async loadSettings() {
        try {
            const response = await fetch('/settings/');
            this.settings = await response.json();
            this.renderDirections();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    renderServices() {
        const servicesList = document.getElementById('services-list');
        if (!servicesList) return;
        
        servicesList.innerHTML = '';
        
        if (this.services.length === 0) {
            servicesList.innerHTML = '<p style="text-align: center; color: var(--text-light);">Услуги пока не добавлены</p>';
            return;
        }
        
        this.services.forEach(service => {
            const serviceElement = document.createElement('div');
            serviceElement.className = 'card';
            serviceElement.innerHTML = `
                <div style="display: flex; justify-content: between; align-items: start;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem; color: var(--text-color);">${service.name}</h3>
                        <p style="color: var(--text-light); margin-bottom: 1rem;">${service.description || 'Описание не указано'}</p>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <span style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color);">
                                ${service.price} руб.
                            </span>
                            <span style="color: var(--text-light); font-size: 0.875rem;">
                                ${service.duration} мин.
                            </span>
                        </div>
                    </div>
                </div>
            `;
            servicesList.appendChild(serviceElement);
        });
    }
    
    populateServiceSelect() {
        const serviceSelect = document.getElementById('service-select');
        if (!serviceSelect) return;
        
        serviceSelect.innerHTML = '<option value="">Выберите услугу</option>';
        
        if (this.services.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Нет доступных услуг";
            option.disabled = true;
            serviceSelect.appendChild(option);
            return;
        }
        
        this.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - ${service.price} руб. (${service.duration} мин.)`;
            serviceSelect.appendChild(option);
        });
    }

    renderDirections() {
        const directionsContent = document.getElementById('directions-content');
        if (!directionsContent) return;

        directionsContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem;">Наш адрес</h3>
                <p style="color: var(--text-light);">${this.settings.business_address || 'г. Москва, ул. Примерная, д. 123'}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem;">Часы работы</h3>
                <p style="color: var(--text-light); white-space: pre-line;">${this.settings.working_hours || 'Пн-Пт: 9:00 - 21:00\nСб-Вс: 10:00 - 20:00'}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem;">Контакты</h3>
                <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                    <i class="fas fa-phone"></i> ${this.settings.business_phone || '+7 (495) 123-45-67'}
                </p>
                <p style="color: var(--text-light);">
                    <i class="fas fa-envelope"></i> ${this.settings.business_email || 'info@beautysalon.ru'}
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                <p style="color: var(--text-light); margin: 0;">
                    <i class="fas fa-info-circle"></i> 
                    Ближайшая станция метро: "Примерная" (5 минут пешком)
                </p>
            </div>
        `;
    }
    
    async createAppointment() {
        // Получаем значения из формы
        const clientName = document.getElementById('client-name').value;
        const clientPhone = document.getElementById('client-phone').value;
        const serviceSelect = document.getElementById('service-select');
        const serviceId = serviceSelect ? parseInt(serviceSelect.value) : null;
        const appointmentDate = document.getElementById('appointment-date').value;
        const appointmentNotes = document.getElementById('appointment-notes').value;

        console.log('Form data:', {
            clientName,
            clientPhone,
            serviceId,
            appointmentDate,
            appointmentNotes
        });

        // Валидация
        if (!clientName || !clientPhone || !serviceId || !appointmentDate) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        // Валидация телефона
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(clientPhone.replace(/\s/g, ''))) {
            this.showNotification('Пожалуйста, введите корректный номер телефона', 'error');
            return;
        }

        // Подготавливаем данные для отправки
        const formData = {
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            service_id: serviceId,
            appointment_date: appointmentDate,
            notes: appointmentNotes ? appointmentNotes.trim() : null
        };

        console.log('Sending data:', formData);

        try {
            const response = await fetch('/appointments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Success:', result);
                this.showNotification('Запись успешно создана! Мы свяжемся с вами для подтверждения.', 'success');
                document.getElementById('appointment-form').reset();
                
                // Сбрасываем дату на завтрашний день 10:00
                this.setDefaultDateTime();
            } else {
                let errorMessage = 'Ошибка при создании записи';
                try {
                    const errorData = await response.json();
                    console.log('Error details:', errorData);
                    
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
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    errorMessage = `HTTP Error: ${response.status}`;
                }
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showNotification('Ошибка подключения к серверу: ' + error.message, 'error');
        }
    }

    async searchAppointments() {
        const phone = document.getElementById('search-phone').value;
        
        if (!phone) {
            this.showNotification('Пожалуйста, введите номер телефона', 'error');
            return;
        }

        // Валидация телефона
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            this.showNotification('Пожалуйста, введите корректный номер телефона', 'error');
            return;
        }

        try {
            const response = await fetch(`/client-appointments/${encodeURIComponent(phone)}`);
            
            if (response.ok) {
                this.clientAppointments = await response.json();
                this.renderClientAppointments();
                this.showNotification(`Найдено записей: ${this.clientAppointments.length}`, 'success');
            } else {
                this.showNotification('Ошибка при поиске записей', 'error');
            }
        } catch (error) {
            console.error('Error searching appointments:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    renderClientAppointments() {
        const container = document.getElementById('appointments-list');
        if (!container) return;

        if (this.clientAppointments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light);">Записей не найдено</p>';
            return;
        }

        // Группируем записи по дате
        const groupedAppointments = this.groupAppointmentsByDate(this.clientAppointments);

        let html = '';
        
        for (const [date, appointments] of Object.entries(groupedAppointments)) {
            html += `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary-color); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                        ${date}
                    </h4>
                    ${appointments.map(appointment => `
                        <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; background: var(--secondary-color);">
                            <div style="display: flex; justify-content: between; align-items: start;">
                                <div style="flex: 1;">
                                    <h5 style="margin-bottom: 0.5rem;">${appointment.service_name}</h5>
                                    <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                                        <i class="fas fa-clock"></i> 
                                        ${new Date(appointment.appointment_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p style="color: var(--text-light); margin-bottom: 0.5rem;">
                                        <i class="fas fa-ruble-sign"></i> ${appointment.service_price} руб.
                                    </p>
                                    <p style="margin-bottom: 0.5rem;">
                                        Статус: 
                                        <span class="status-badge ${this.getStatusClass(appointment.status)}">
                                            ${this.getStatusText(appointment.status)}
                                        </span>
                                    </p>
                                    ${appointment.notes ? `
                                        <p style="color: var(--text-light); margin-bottom: 0;">
                                            <strong>Примечание:</strong> ${appointment.notes}
                                        </p>
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
            'pending': 'Ожидает подтверждения',
            'confirmed': 'Подтверждено',
            'completed': 'Выполнено',
            'cancelled': 'Отменено'
        };
        return statusMap[status] || status;
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }

        // Load specific data when section is shown
        if (sectionName === 'directions') {
            this.loadSettings();
        } else if (sectionName === 'my-appointments') {
            // Очищаем результаты поиска при переходе в раздел
            document.getElementById('appointments-list').innerHTML = 
                '<p style="text-align: center; color: var(--text-light);">Введите номер телефона для поиска записей</p>';
            document.getElementById('search-phone').value = '';
        }
    }
    
    showNotification(message, type = 'info') {
        window.auth.showNotification(message, type);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClientApp();
});
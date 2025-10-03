/**
 * إعدادات النظام المتقدمة - ملف JavaScript شامل ومتطور
 * نظام EP Group - إدارة الإعدادات التفاعلية
 */

// الكائن الرئيسي لإدارة الإعدادات
const AdvancedSettings = {
    // إعدادات التطبيق
    config: {
        apiUrl: '/api/settings',
        autoSaveInterval: 30000, // 30 ثانية
        animationDuration: 300,
        chartColors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8'],
        languages: ['ar', 'en'],
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm'
    },

    // البيانات المؤقتة
    data: {
        currentSection: 'general',
        unsavedChanges: false,
        users: [],
        roles: [],
        permissions: [],
        backupHistory: [],
        activityStats: {},
        systemInfo: {},
        charts: {}
    },

    // حالة التطبيق
    state: {
        isLoading: false,
        isSaving: false,
        lastSaved: null,
        currentUser: null,
        darkMode: false,
        language: 'ar'
    },

    // التهيئة الأولية
    init() {
        console.log('🚀 بدء تهيئة نظام الإعدادات المتقدم...');
        
        // تحميل البيانات الأولية
        this.loadInitialData();
        
        // ربط الأحداث
        this.bindEvents();
        
        // تهيئة المكونات
        this.initializeComponents();
        
        // تحميل الإعدادات المحفوظة
        this.loadSettings();
        
        // بدء المراقبة التلقائية
        this.startAutoSave();
        
        console.log('✅ تم تهيئة النظام بنجاح');
    },

    // تحميل البيانات الأولية
    async loadInitialData() {
        try {
            this.showLoading();
            
            // تحميل بيانات المستخدم الحالي
            await this.loadCurrentUser();
            
            // تحميل الأقسام المختلفة
            await Promise.all([
                this.loadUsers(),
                this.loadRoles(),
                this.loadPermissions(),
                this.loadBackupHistory(),
                this.loadActivityStats(),
                this.loadSystemInfo()
            ]);
            
            this.hideLoading();
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            this.showError('فشل في تحميل البيانات الأولية');
        }
    },

    // ربط الأحداث
    bindEvents() {
        // أحداث التنقل
        this.bindNavigationEvents();
        
        // أحداث النماذج
        this.bindFormEvents();
        
        // أحداث الأزرار
        this.bindButtonEvents();
        
        // أحداث النوافذ المنبثقة
        this.bindModalEvents();
        
        // أحداث النافذة
        this.bindWindowEvents();
    },

    // ربط أحداث التنقل
    bindNavigationEvents() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    },

    // ربط أحداث النماذج
    bindFormEvents() {
        // مراقبة التغييرات في النماذج
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markUnsaved();
                this.validateInput(input);
            });

            input.addEventListener('input', () => {
                this.markUnsaved();
                this.updateRangeValue(input);
            });
        });

        // مربعات الاختيار المخصصة
        const checkboxes = document.querySelectorAll('.checkbox-label');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('click', () => {
                const input = checkbox.querySelector('input[type="checkbox"]');
                if (input) {
                    input.checked = !input.checked;
                    this.markUnsaved();
                }
            });
        });

        // مفاتيح التبديل
        const switches = document.querySelectorAll('.switch input');
        switches.forEach(switchEl => {
            switchEl.addEventListener('change', () => {
                this.markUnsaved();
            });
        });
    },

    // ربط أحداث الأزرار
    bindButtonEvents() {
        // حفظ الإعدادات
        document.getElementById('saveAllSettings')?.addEventListener('click', () => {
            this.saveAllSettings();
        });

        // إعادة تعيين الإعدادات
        document.getElementById('resetSettings')?.addEventListener('click', () => {
            this.resetSettings();
        });

        // تصدير الإعدادات
        document.getElementById('exportSettings')?.addEventListener('click', () => {
            this.exportSettings();
        });

        // استيراد الإعدادات
        document.getElementById('importSettings')?.addEventListener('click', () => {
            this.importSettings();
        });

        // إضافة مستخدم
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            this.showAddUserModal();
        });

        // حفظ المستخدم
        document.getElementById('saveUserBtn')?.addEventListener('click', () => {
            this.saveUser();
        });

        // أزرار النسخ الاحتياطي
        document.getElementById('createBackupBtn')?.addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('downloadBackupBtn')?.addEventListener('click', () => {
            this.downloadBackup();
        });

        document.getElementById('restoreBackupBtn')?.addEventListener('click', () => {
            this.restoreBackup();
        });

        // أزرار الصيانة
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
            this.clearCache();
        });

        document.getElementById('optimizeDbBtn')?.addEventListener('click', () => {
            this.optimizeDatabase();
        });

        document.getElementById('checkUpdatesBtn')?.addEventListener('click', () => {
            this.checkForUpdates();
        });

        document.getElementById('systemHealthBtn')?.addEventListener('click', () => {
            this.checkSystemHealth();
        });
    },

    // ربط أحداث النوافذ المنبثقة
    bindModalEvents() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.btn-close');
            closeBtn?.addEventListener('click', () => {
                this.hideModal(modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });
    },

    // ربط أحداث النافذة
    bindWindowEvents() {
        // تحذير من المغادرة بدون حفظ
        window.addEventListener('beforeunload', (e) => {
            if (this.data.unsavedChanges) {
                e.preventDefault();
                e.returnValue = 'هناك تغييرات غير محفوظة. هل تريد المغادرة؟';
                return e.returnValue;
            }
        });

        // تغيير حجم النافذة
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // اختصارات لوحة المفاتيح
        window.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    },

    // تهيئة المكونات
    initializeComponents() {
        // تهيئة الرسوم البيانية
        this.initializeCharts();
        
        // تهيئة التواريخ والأوقات
        this.initializeDateTimePickers();
        
        // تهيئة أدوات التلوين
        this.initializeColorPickers();
        
        // تهيئة أشرطة التمرير
        this.initializeRangeSliders();
        
        // تهيئة الجداول
        this.initializeTables();
        
        // تهيئة الخرائط
        this.initializeMaps();
    },

    // تبديل الأقسام
    switchSection(sectionName) {
        // إخفاء القسم الحالي
        const currentSection = document.querySelector('.settings-section.active');
        currentSection?.classList.remove('active');

        // إظهار القسم الجديد
        const newSection = document.getElementById(`${sectionName}-section`);
        if (newSection) {
            newSection.classList.add('active');
            this.data.currentSection = sectionName;
        }

        // تحديث التنقل
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

        // تحميل بيانات القسم إذا لزم الأمر
        this.loadSectionData(sectionName);

        // تحديث الرابط
        window.history.replaceState({}, '', `#${sectionName}`);
    },

    // تحميل بيانات القسم
    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'users':
                await this.loadUsers();
                this.renderUsersTable();
                break;
            case 'permissions':
                await this.loadPermissions();
                this.renderPermissionsMatrix();
                break;
            case 'activity':
                await this.loadActivityStats();
                this.updateActivityCharts();
                break;
            case 'backup':
                await this.loadBackupHistory();
                this.renderBackupHistory();
                break;
            case 'maps':
                this.initializeMaps();
                break;
        }
    },

    // تحميل المستخدم الحالي
    async loadCurrentUser() {
        try {
            const response = await fetch('/api/user/current');
            const userData = await response.json();
            this.state.currentUser = userData;
            
            // تحديث واجهة المستخدم
            document.getElementById('currentUserName').textContent = userData.name || 'مستخدم';
            document.getElementById('currentUserRole').textContent = userData.role || 'غير محدد';
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
        }
    },

    // تحميل المستخدمين
    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            this.data.users = await response.json();
            this.renderUsersTable();
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    },

    // عرض جدول المستخدمين
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.users.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <img src="${user.avatar || '/assets/images/default-avatar.png'}" 
                         alt="${user.name}" class="user-avatar" width="40" height="40">
                </td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge">${this.getRoleDisplayName(user.role)}</span></td>
                <td><span class="status-badge ${user.status}">${this.getStatusDisplayName(user.status)}</span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${this.formatDate(user.last_activity)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="AdvancedSettings.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="AdvancedSettings.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // تحميل الأدوار
    async loadRoles() {
        try {
            const response = await fetch('/api/roles');
            this.data.roles = await response.json();
            this.renderRoles();
        } catch (error) {
            console.error('خطأ في تحميل الأدوار:', error);
        }
    },

    // عرض الأدوار
    renderRoles() {
        const container = document.getElementById('rolesGrid');
        if (!container) return;

        container.innerHTML = '';

        this.data.roles.forEach(role => {
            const roleCard = document.createElement('div');
            roleCard.className = 'role-card';
            roleCard.innerHTML = `
                <h4>${role.display_name}</h4>
                <p>${role.description}</p>
                <div class="role-stats">
                    <span class="permissions-count">${role.permissions_count} صلاحية</span>
                    <span class="users-count">${role.users_count} مستخدم</span>
                </div>
                <div class="role-actions">
                    <button class="btn btn-sm btn-primary" onclick="AdvancedSettings.editRole(${role.id})">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                </div>
            `;
            container.appendChild(roleCard);
        });
    },

    // تحميل الصلاحيات
    async loadPermissions() {
        try {
            const response = await fetch('/api/permissions');
            this.data.permissions = await response.json();
            this.renderPermissionsMatrix();
        } catch (error) {
            console.error('خطأ في تحميل الصلاحيات:', error);
        }
    },

    // عرض مصفوفة الصلاحيات
    renderPermissionsMatrix() {
        const tbody = document.getElementById('permissionsMatrixBody');
        if (!tbody || !this.data.permissions.length) return;

        tbody.innerHTML = '';

        this.data.permissions.forEach(permission => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${permission.display_name}</td>
                <td>
                    <div class="permission-check ${permission.roles.admin ? 'allowed' : 'denied'}">
                        ${permission.roles.admin ? '✓' : '✗'}
                    </div>
                </td>
                <td>
                    <div class="permission-check ${permission.roles.manager ? 'allowed' : 'denied'}">
                        ${permission.roles.manager ? '✓' : '✗'}
                    </div>
                </td>
                <td>
                    <div class="permission-check ${permission.roles.employee ? 'allowed' : 'denied'}">
                        ${permission.roles.employee ? '✓' : '✗'}
                    </div>
                </td>
                <td>
                    <div class="permission-check ${permission.roles.viewer ? 'allowed' : 'denied'}">
                        ${permission.roles.viewer ? '✓' : '✗'}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // تحميل إحصائيات النشاط
    async loadActivityStats() {
        try {
            const response = await fetch('/api/activity/stats');
            this.data.activityStats = await response.json();
            this.updateActivityStats();
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات النشاط:', error);
        }
    },

    // تحديث إحصائيات النشاط
    updateActivityStats() {
        const stats = this.data.activityStats;
        
        document.getElementById('activeUsersCount').textContent = stats.active_users || '0';
        document.getElementById('totalSessionsCount').textContent = stats.total_sessions || '0';
        document.getElementById('totalActionsCount').textContent = stats.total_actions || '0';
        document.getElementById('errorCount').textContent = stats.error_count || '0';
    },

    // تحميل سجل النسخ الاحتياطي
    async loadBackupHistory() {
        try {
            const response = await fetch('/api/backup/history');
            this.data.backupHistory = await response.json();
            this.renderBackupHistory();
        } catch (error) {
            console.error('خطأ في تحميل سجل النسخ الاحتياطي:', error);
        }
    },

    // عرض سجل النسخ الاحتياطي
    renderBackupHistory() {
        const tbody = document.getElementById('backupHistoryBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.backupHistory.forEach(backup => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(backup.date)}</td>
                <td>${this.formatTime(backup.time)}</td>
                <td>${this.formatFileSize(backup.size)}</td>
                <td>${backup.type}</td>
                <td><span class="status-badge ${backup.status}">${backup.status_text}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-success" onclick="AdvancedSettings.downloadBackupFile('${backup.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="AdvancedSettings.restoreFromBackup('${backup.id}')">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="AdvancedSettings.deleteBackup('${backup.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // تحميل معلومات النظام
    async loadSystemInfo() {
        try {
            const response = await fetch('/api/system/info');
            this.data.systemInfo = await response.json();
            this.updateSystemInfo();
        } catch (error) {
            console.error('خطأ في تحميل معلومات النظام:', error);
        }
    },

    // تحديث معلومات النظام
    updateSystemInfo() {
        const info = this.data.systemInfo;
        
        document.getElementById('serverOS').textContent = info.server_os || 'غير معروف';
        document.getElementById('phpVersion').textContent = info.php_version || 'غير معروف';
        document.getElementById('webServer').textContent = info.web_server || 'غير معروف';
        document.getElementById('database').textContent = info.database || 'غير معروف';
        document.getElementById('diskSpace').textContent = info.disk_space || 'غير معروف';
    },

    // تهيئة الرسوم البيانية
    initializeCharts() {
        this.initializeActivityChart();
        this.initializeActivityTypeChart();
    },

    // تهيئة رسم النشاط
    initializeActivityChart() {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.data.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                datasets: [{
                    label: 'المستخدمين النشطين',
                    data: [12, 19, 3, 5, 2, 3, 20],
                    borderColor: this.config.chartColors[0],
                    backgroundColor: this.config.chartColors[0] + '20',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // تهيئة رسم أنواع النشاط
    initializeActivityTypeChart() {
        const canvas = document.getElementById('activityTypeChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.data.charts.activityType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['تسجيل الدخول', 'تعديل البيانات', 'عرض الصفحات', 'التصدير'],
                datasets: [{
                    data: [30, 25, 35, 10],
                    backgroundColor: this.config.chartColors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    },

    // تحديث رسوم النشاط
    updateActivityCharts() {
        if (this.data.activityStats.weekly_data) {
            this.data.charts.activity.data.datasets[0].data = this.data.activityStats.weekly_data;
            this.data.charts.activity.update();
        }

        if (this.data.activityStats.type_distribution) {
            this.data.charts.activityType.data.datasets[0].data = this.data.activityStats.type_distribution;
            this.data.charts.activityType.update();
        }
    },

    // تهيئة أدوات التلوين
    initializeColorPickers() {
        const colorPickers = document.querySelectorAll('.color-picker');
        colorPickers.forEach(picker => {
            picker.addEventListener('change', (e) => {
                this.applyColorChange(e.target);
            });
        });
    },

    // تطبيق تغيير اللون
    applyColorChange(colorPicker) {
        const colorValue = colorPicker.value;
        const colorId = colorPicker.id;
        
        // تطبيق اللون على المعاينة المباشرة
        document.documentElement.style.setProperty(`--${colorId.replace('Color', '')}-color`, colorValue);
        
        this.markUnsaved();
    },

    // تهيئة أشرطة التمرير
    initializeRangeSliders() {
        const ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(range => {
            this.updateRangeValue(range);
            range.addEventListener('input', () => {
                this.updateRangeValue(range);
            });
        });
    },

    // تحديث قيمة شريط التمرير
    updateRangeValue(range) {
        const valueSpan = range.parentNode.querySelector('.range-value');
        if (valueSpan) {
            let value = range.value;
            
            // إضافة الوحدة المناسبة
            if (range.id.includes('fontSize')) {
                value += 'px';
            } else if (range.id.includes('lineHeight')) {
                // لا حاجة لوحدة
            } else if (range.id.includes('Zoom')) {
                // لا حاجة لوحدة
            }
            
            valueSpan.textContent = value;
        }
    },

    // تهيئة الجداول
    initializeTables() {
        const tables = document.querySelectorAll('.users-table, .permissions-table, .backup-table');
        tables.forEach(table => {
            // إضافة وظائف الترتيب والبحث
            this.makeTableSortable(table);
        });
    },

    // جعل الجدول قابل للترتيب
    makeTableSortable(table) {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortTable(table, index);
            });
        });
    },

    // ترتيب الجدول
    sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isNumeric = !isNaN(Date.parse(rows[0].cells[columnIndex].textContent));
        
        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex].textContent.trim();
            const bValue = b.cells[columnIndex].textContent.trim();
            
            if (isNumeric) {
                return new Date(aValue) - new Date(bValue);
            } else {
                return aValue.localeCompare(bValue, 'ar');
            }
        });
        
        rows.forEach(row => tbody.appendChild(row));
    },

    // تهيئة الخرائط
    initializeMaps() {
        const mapPreview = document.getElementById('mapPreview');
        if (!mapPreview) return;

        // إنشاء خريطة تفاعلية بسيطة
        const lat = parseFloat(document.getElementById('defaultLatitude')?.value || 24.7136);
        const lng = parseFloat(document.getElementById('defaultLongitude')?.value || 46.6753);
        
        mapPreview.innerHTML = `
            <div class="simple-map" style="width: 100%; height: 100%; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <i class="fas fa-map-marker-alt" style="font-size: 2rem; color: #007bff; margin-bottom: 10px;"></i>
                <p style="margin: 0; font-weight: 500;">خط العرض: ${lat}</p>
                <p style="margin: 0; font-weight: 500;">خط الطول: ${lng}</p>
            </div>
        `;
    },

    // حفظ جميع الإعدادات
    async saveAllSettings() {
        if (this.state.isSaving) return;

        try {
            this.state.isSaving = true;
            this.showSaving();

            // جمع جميع البيانات من النماذج
            const settingsData = this.collectAllSettings();

            // إرسال البيانات إلى الخادم
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(settingsData)
            });

            if (response.ok) {
                this.data.unsavedChanges = false;
                this.state.lastSaved = new Date();
                this.showSuccess('تم حفظ الإعدادات بنجاح!');
            } else {
                throw new Error('فشل في حفظ الإعدادات');
            }

        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            this.showError('فشل في حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
        } finally {
            this.state.isSaving = false;
            this.hideSaving();
        }
    },

    // جمع جميع الإعدادات
    collectAllSettings() {
        const settings = {};
        
        // إعدادات عامة
        settings.general = this.collectFormData('#general-section');
        
        // إعدادات المظهر
        settings.appearance = this.collectFormData('#appearance-section');
        
        // إعدادات الأمان
        settings.security = this.collectFormData('#security-section');
        
        // إعدادات الخرائط
        settings.maps = this.collectFormData('#maps-section');
        
        // إعدادات الإشعارات
        settings.notifications = this.collectFormData('#notifications-section');
        
        // إعدادات النسخ الاحتياطي
        settings.backup = this.collectFormData('#backup-section');
        
        return settings;
    },

    // جمع بيانات النموذج
    collectFormData(sectionSelector) {
        const section = document.querySelector(sectionSelector);
        if (!section) return {};

        const data = {};
        const inputs = section.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const name = input.name || input.id;
            if (!name) return;

            if (input.type === 'checkbox') {
                data[name] = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    data[name] = input.value;
                }
            } else {
                data[name] = input.value;
            }
        });

        return data;
    },

    // إعادة تعيين الإعدادات
    async resetSettings() {
        if (!confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
            return;
        }

        try {
            const response = await fetch(this.config.apiUrl + '/reset', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                location.reload();
            } else {
                throw new Error('فشل في إعادة تعيين الإعدادات');
            }
        } catch (error) {
            console.error('خطأ في إعادة التعيين:', error);
            this.showError('فشل في إعادة تعيين الإعدادات');
        }
    },

    // تصدير الإعدادات
    async exportSettings() {
        try {
            const settingsData = this.collectAllSettings();
            const dataStr = JSON.stringify(settingsData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `settings-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.showSuccess('تم تصدير الإعدادات بنجاح!');
        } catch (error) {
            console.error('خطأ في التصدير:', error);
            this.showError('فشل في تصدير الإعدادات');
        }
    },

    // استيراد الإعدادات
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const settings = JSON.parse(e.target.result);
                    this.applyImportedSettings(settings);
                    this.showSuccess('تم استيراد الإعدادات بنجاح!');
                } catch (error) {
                    console.error('خطأ في الاستيراد:', error);
                    this.showError('ملف الإعدادات غير صالح');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // تطبيق الإعدادات المستوردة
    applyImportedSettings(settings) {
        Object.keys(settings).forEach(sectionName => {
            const sectionData = settings[sectionName];
            const sectionElement = document.getElementById(`${sectionName}-section`);
            
            if (sectionElement) {
                this.applySettingsToSection(sectionElement, sectionData);
            }
        });
        
        this.markUnsaved();
    },

    // تطبيق الإعدادات على القسم
    applySettingsToSection(section, data) {
        Object.keys(data).forEach(key => {
            const input = section.querySelector(`[name="${key}"], #${key}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else {
                    input.value = data[key];
                }
            }
        });
    },

    // إظهار نافذة إضافة مستخدم
    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        this.showModal(modal);
    },

    // حفظ المستخدم
    async saveUser() {
        const form = document.getElementById('addUserForm');
        const formData = new FormData(form);
        
        // التحقق من صحة البيانات
        if (!this.validateUserForm(form)) {
            return;
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const newUser = await response.json();
                this.data.users.push(newUser);
                this.renderUsersTable();
                this.hideModal(document.getElementById('addUserModal'));
                this.showSuccess('تم إضافة المستخدم بنجاح!');
                form.reset();
            } else {
                throw new Error('فشل في إضافة المستخدم');
            }
        } catch (error) {
            console.error('خطأ في حفظ المستخدم:', error);
            this.showError('فشل في إضافة المستخدم');
        }
    },

    // التحقق من نموذج المستخدم
    validateUserForm(form) {
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        const confirmPassword = form.querySelector('[name="confirmPassword"]').value;

        if (!this.isValidEmail(email)) {
            this.showError('البريد الإلكتروني غير صحيح');
            return false;
        }

        if (password.length < 8) {
            this.showError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('كلمة المرور وتأكيدها غير متطابقتين');
            return false;
        }

        return true;
    },

    // التحقق من البريد الإلكتروني
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // إنشاء نسخة احتياطية
    async createBackup() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/backup/create', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const backup = await response.json();
                this.data.backupHistory.unshift(backup);
                this.renderBackupHistory();
                this.showSuccess('تم إنشاء النسخة الاحتياطية بنجاح!');
            } else {
                throw new Error('فشل في إنشاء النسخة الاحتياطية');
            }
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            this.showError('فشل في إنشاء النسخة الاحتياطية');
        } finally {
            this.hideLoading();
        }
    },

    // تنزيل النسخة الاحتياطية
    async downloadBackup() {
        try {
            const response = await fetch('/api/backup/download/latest');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('فشل في تنزيل النسخة الاحتياطية');
            }
        } catch (error) {
            console.error('خطأ في التنزيل:', error);
            this.showError('فشل في تنزيل النسخة الاحتياطية');
        }
    },

    // استعادة النسخة الاحتياطية
    async restoreBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm('هل أنت متأكد من استعادة النظام من هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
                return;
            }

            const formData = new FormData();
            formData.append('backup_file', file);

            try {
                this.showLoading();
                
                const response = await fetch('/api/backup/restore', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    this.showSuccess('تم استعادة النظام بنجاح! سيتم إعادة تحميل الصفحة...');
                    setTimeout(() => location.reload(), 2000);
                } else {
                    throw new Error('فشل في استعادة النسخة الاحتياطية');
                }
            } catch (error) {
                console.error('خطأ في الاستعادة:', error);
                this.showError('فشل في استعادة النسخة الاحتياطية');
            } finally {
                this.hideLoading();
            }
        };
        input.click();
    },

    // مسح التخزين المؤقت
    async clearCache() {
        try {
            const response = await fetch('/api/system/clear-cache', {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccess('تم مسح التخزين المؤقت بنجاح!');
            } else {
                throw new Error('فشل في مسح التخزين المؤقت');
            }
        } catch (error) {
            console.error('خطأ في مسح التخزين المؤقت:', error);
            this.showError('فشل في مسح التخزين المؤقت');
        }
    },

    // تحسين قاعدة البيانات
    async optimizeDatabase() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/system/optimize-db', {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccess('تم تحسين قاعدة البيانات بنجاح!');
            } else {
                throw new Error('فشل في تحسين قاعدة البيانات');
            }
        } catch (error) {
            console.error('خطأ في تحسين قاعدة البيانات:', error);
            this.showError('فشل في تحسين قاعدة البيانات');
        } finally {
            this.hideLoading();
        }
    },

    // البحث عن تحديثات
    async checkForUpdates() {
        try {
            const response = await fetch('/api/system/check-updates');
            const updates = await response.json();

            if (updates.available) {
                this.showInfo(`يتوفر تحديث جديد: الإصدار ${updates.version}`);
            } else {
                this.showInfo('النظام محدث إلى أحدث إصدار');
            }
        } catch (error) {
            console.error('خطأ في البحث عن التحديثات:', error);
            this.showError('فشل في البحث عن التحديثات');
        }
    },

    // فحص صحة النظام
    async checkSystemHealth() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/system/health-check');
            const health = await response.json();

            let message = 'تقرير صحة النظام:\n\n';
            health.checks.forEach(check => {
                message += `${check.name}: ${check.status === 'ok' ? '✅' : '❌'}\n`;
            });

            alert(message);
        } catch (error) {
            console.error('خطأ في فحص صحة النظام:', error);
            this.showError('فشل في فحص صحة النظام');
        } finally {
            this.hideLoading();
        }
    },

    // تحديد التغييرات غير المحفوظة
    markUnsaved() {
        this.data.unsavedChanges = true;
        
        // تغيير لون زر الحفظ
        const saveBtn = document.getElementById('saveAllSettings');
        if (saveBtn) {
            saveBtn.classList.add('pulse');
        }
    },

    // التحقق من صحة المدخل
    validateInput(input) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';

        // التحقق حسب نوع المدخل
        switch (input.type) {
            case 'email':
                isValid = this.isValidEmail(value);
                message = 'البريد الإلكتروني غير صحيح';
                break;
            case 'url':
                isValid = this.isValidUrl(value);
                message = 'الرابط غير صحيح';
                break;
            case 'number':
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                const numValue = parseFloat(value);
                isValid = !isNaN(numValue) && numValue >= min && numValue <= max;
                message = `القيمة يجب أن تكون بين ${min} و ${max}`;
                break;
        }

        // تطبيق التصميم
        if (value && !isValid) {
            input.classList.add('is-invalid');
            this.showFieldError(input, message);
        } else {
            input.classList.remove('is-invalid');
            this.hideFieldError(input);
        }
    },

    // التحقق من صحة الرابط
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // إظهار خطأ الحقل
    showFieldError(input, message) {
        let errorDiv = input.parentNode.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            input.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    },

    // إخفاء خطأ الحقل
    hideFieldError(input) {
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    // إظهار النافذة المنبثقة
    showModal(modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    // إخفاء النافذة المنبثقة
    hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    },

    // إظهار شاشة التحميل
    showLoading() {
        this.state.isLoading = true;
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    },

    // إخفاء شاشة التحميل
    hideLoading() {
        this.state.isLoading = false;
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    },

    // إظهار حالة الحفظ
    showSaving() {
        const saveBtn = document.getElementById('saveAllSettings');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            saveBtn.disabled = true;
        }
    },

    // إخفاء حالة الحفظ
    hideSaving() {
        const saveBtn = document.getElementById('saveAllSettings');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ جميع الإعدادات';
            saveBtn.disabled = false;
            saveBtn.classList.remove('pulse');
        }
    },

    // إظهار رسالة نجاح
    showSuccess(message) {
        this.showToast(message, 'success');
    },

    // إظهار رسالة خطأ
    showError(message) {
        this.showToast(message, 'error');
    },

    // إظهار رسالة معلومات
    showInfo(message) {
        this.showToast(message, 'info');
    },

    // إظهار التوست
    showToast(message, type = 'success') {
        const toast = document.getElementById(`${type}Toast`) || document.getElementById('successToast');
        if (!toast) return;

        const messageSpan = toast.querySelector('.toast-message');
        if (messageSpan) {
            messageSpan.textContent = message;
        }

        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    },

    // معالجة تغيير حجم النافذة
    handleResize() {
        // إعادة تحجيم الرسوم البيانية
        Object.values(this.data.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    },

    // معالجة اختصارات لوحة المفاتيح
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveAllSettings();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetSettings();
                    break;
            }
        }

        if (e.key === 'Escape') {
            // إغلاق النوافذ المنبثقة
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => this.hideModal(modal));
        }
    },

    // بدء الحفظ التلقائي
    startAutoSave() {
        setInterval(() => {
            if (this.data.unsavedChanges && !this.state.isSaving) {
                console.log('🔄 تشغيل الحفظ التلقائي...');
                this.saveAllSettings();
            }
        }, this.config.autoSaveInterval);
    },

    // تحميل الإعدادات المحفوظة
    loadSettings() {
        const savedSettings = localStorage.getItem('ep-advanced-settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.applyImportedSettings(settings);
            } catch (error) {
                console.error('خطأ في تحميل الإعدادات المحفوظة:', error);
            }
        }
    },

    // حفظ الإعدادات محلياً
    saveSettingsLocally() {
        const settings = this.collectAllSettings();
        localStorage.setItem('ep-advanced-settings', JSON.stringify(settings));
    },

    // وظائف مساعدة لتنسيق البيانات
    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        return new Date(dateString).toLocaleDateString('ar-SA');
    },

    formatTime(timeString) {
        if (!timeString) return 'غير محدد';
        return new Date(timeString).toLocaleTimeString('ar-SA');
    },

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getRoleDisplayName(role) {
        const roles = {
            'admin': 'مدير عام',
            'manager': 'مدير قسم',
            'employee': 'موظف',
            'viewer': 'مشاهد'
        };
        return roles[role] || role;
    },

    getStatusDisplayName(status) {
        const statuses = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'suspended': 'معلق',
            'pending': 'في الانتظار'
        };
        return statuses[status] || status;
    },

    // تنظيف الموارد
    destroy() {
        // إلغاء المؤقتات
        clearInterval(this.autoSaveInterval);
        
        // تنظيف الرسوم البيانية
        Object.values(this.data.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        
        // إزالة مستمعي الأحداث
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyboardShortcuts);
        
        console.log('تم تنظيف موارد النظام');
    }
};

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    AdvancedSettings.init();
});

// تصدير الكائن للاستخدام العام
window.AdvancedSettings = AdvancedSettings;
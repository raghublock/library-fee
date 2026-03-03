// Using global db and whatsapp from db.js and whatsapp.js

document.addEventListener('DOMContentLoaded', async function() {
    await db.initDB();
    setupEventListeners();
    loadDashboard();
});

function setupEventListeners() {
    // Hamburger Menu
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('show');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.dataset.tab;
            switchTab(tabName);
            sidebar.classList.remove('show');
        });
    });

    // Form Submit
    const form = document.getElementById('student-form');
    if (form) {
        form.addEventListener('submit', handleAddStudent);
    }

    // Photo Preview
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', previewPhoto);
    }

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Modal Close
    const modalClose = document.querySelectorAll('.modal-close');
    modalClose.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    });
}

async function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'students-list') {
        await loadAllStudents();
    } else if (tabName === 'pending-fees') {
        await loadPendingFees();
    } else if (tabName === 'dashboard') {
        await loadDashboard();
    }
}

async function loadDashboard() {
    try {
        const students = await db.getAllStudents();
        const pendingStudents = await db.getPendingFees();
        const totalAmount = pendingStudents.reduce((sum, s) => sum + s.feeAmount, 0);
        const paidCount = students.length - pendingStudents.length;

        document.getElementById('total-students').textContent = students.length;
        document.getElementById('pending-count').textContent = pendingStudents.length;
        document.getElementById('total-amount').textContent = '₹' + totalAmount.toLocaleString('en-IN');
        document.getElementById('paid-count').textContent = paidCount;

        await loadPendingList();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard', 'error');
    }
}

async function loadPendingList() {
    try {
        const pendingStudents = await db.getPendingFees();
        const container = document.getElementById('pending-list');

        if (!container) return;

        if (pendingStudents.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: #999; padding: 20px;">✅ All fees are paid!</p>';
            return;
        }

        container.innerHTML = pendingStudents.map(student => `
            <div class="pending-item">
                <div class="pending-item-info">
                    <p>${student.name}</p>
                    <p>📱 ${student.whatsapp}</p>
                    <p>👤 ${student.fatherName}</p>
                </div>
                <div class="pending-item-right">
                    <div class="pending-item-amount">₹${student.feeAmount}</div>
                    <button class="btn btn-warning" onclick="sendWhatsAppReminder(${student.id})">
                        <i class="fab fa-whatsapp"></i> Send
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pending list:', error);
    }
}

async function loadAllStudents() {
    try {
        const students = await db.getAllStudents();
        const container = document.getElementById('students-container');

        if (students.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: #999;">No students found</p>';
            return;
        }

        let html = '';
        for (let student of students) {
            html += await createStudentCard(student);
        }
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    }
}

async function loadPendingFees() {
    try {
        const students = await db.getPendingFees();
        const container = document.getElementById('pending-fees-container');

        if (students.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: #999;">✅ No pending fees!</p>';
            return;
        }

        let html = '';
        for (let student of students) {
            html += await createStudentCard(student);
        }
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading pending fees:', error);
        showToast('Error loading pending fees', 'error');
    }
}

async function createStudentCard(student) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const isPaid = await db.isFeePaid(student.id, currentMonth, currentYear);

    return `
        <div class="student-card" onclick="showStudentDetail(${student.id})">
            <img src="${student.photo}" alt="${student.name}" class="student-photo">
            <div class="student-info">
                <h3>${student.name}</h3>
                <p><i class="fas fa-user"></i> ${student.fatherName}</p>
                <p><i class="fas fa-phone"></i> ${student.mobile}</p>
                <p><i class="fas fa-rupiah"></i> ₹${student.feeAmount}/month</p>
                
                <div class="student-status">
                    <span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}">
                        ${isPaid ? '✅ Paid' : '❌ Pending'}
                    </span>
                </div>

                <div class="student-actions">
                    <button class="btn btn-success" onclick="markFeePaid(${student.id}, event)">
                        <i class="fas fa-check"></i> Pay
                    </button>
                    <button class="btn btn-info" onclick="showFeeModal(${student.id}, event)">
                        <i class="fas fa-calendar"></i> Track
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function showStudentDetail(studentId) {
    try {
        const student = await db.getStudent(studentId);
        if (!student) return;

        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const isPaid = await db.isFeePaid(studentId, currentMonth, currentYear);

        const feeHistory = (student.feeHistory || []).map(f => 
            `<li>${f.month}/${f.year} - ₹${f.amount}</li>`
        ).join('') || '<li>No records</li>';

        modalBody.innerHTML = `
            <img src="${student.photo}" alt="${student.name}" class="detail-photo">
            
            <div class="detail-info">
                <h2>${student.name}</h2>
            </div>

            <div class="detail-info">
                <label>Father's Name</label>
                <p>${student.fatherName}</p>
            </div>

            <div class="detail-info">
                <label>Mobile</label>
                <p>${student.mobile}</p>
            </div>

            <div class="detail-info">
                <label>WhatsApp</label>
                <p>${student.whatsapp}</p>
            </div>

            <div class="detail-info">
                <label>Email</label>
                <p>${student.email || 'Not provided'}</p>
            </div>

            <div class="detail-info">
                <label>Address</label>
                <p>${student.address || 'Not provided'}</p>
            </div>

            <div class="detail-info">
                <label>Monthly Fee</label>
                <p>₹${student.feeAmount}</p>
            </div>

            <div class="detail-info">
                <label>Joined</label>
                <p>${new Date(student.joiningDate).toLocaleDateString()}</p>
            </div>

            <div class="detail-info">
                <label>Fee Status</label>
                <p><span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}">
                    ${isPaid ? '✅ Paid' : '❌ Pending'}
                </span></p>
            </div>

            <div class="detail-info">
                <label>Recent Payments</label>
                <ul>${feeHistory}</ul>
            </div>

            <div class="detail-actions">
                <button class="btn btn-success" onclick="markFeePaid(${studentId})">Mark Paid</button>
                <button class="btn btn-warning" onclick="sendWhatsAppReminder(${studentId})">WhatsApp</button>
                <button class="btn btn-danger" onclick="deleteStudent(${studentId})">Delete</button>
            </div>
        `;

        modal.classList.add('show');
    } catch (error) {
        console.error('Error showing student detail:', error);
        showToast('Error loading student details', 'error');
    }
}

async function showFeeModal(studentId, event) {
    if (event) event.stopPropagation();

    try {
        const student = await db.getStudent(studentId);
        if (!student) return;

        const modal = document.getElementById('fee-modal');
        const modalBody = document.getElementById('fee-modal-body');
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Generate last 12 months
        let monthsHtml = '';
        for (let i = 11; i >= 0; i--) {
            let month = currentDate.getMonth() - i;
            let year = currentYear;
            if (month < 0) {
                month += 12;
                year--;
            }
            month++; // Convert to 1-based month

            const isPaid = await db.isFeePaid(studentId, month, year);
            const monthName = months[month - 1];
            
            monthsHtml += `
                <div class="month-box ${isPaid ? 'paid' : ''}" onclick="toggleFeePayment(${studentId}, ${month}, ${year}, event)">
                    <div class="month-name">${monthName}</div>
                    <div class="month-year">${year}</div>
                    ${isPaid ? '<div class="month-status">✓</div>' : ''}
                </div>
            `;
        }

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 24px;">
                <i class="fas fa-calendar-alt"></i> Fee Tracker - ${student.name}
            </h2>

            <div class="fee-tracker">
                <h3>Monthly Fee Status (Last 12 Months)</h3>
                <p style="color: #666; font-size: 13px; margin-bottom: 16px;">
                    Click on a month to mark/unmark fee as paid
                </p>
                
                <div class="month-grid">
                    ${monthsHtml}
                </div>

                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <i class="fas fa-info-circle" style="color: var(--primary); margin-right: 8px;"></i>
                        Monthly Fee: <strong>₹${student.feeAmount}</strong>
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
                        Total Paid: <strong>₹${(student.feeHistory || []).length * student.feeAmount}</strong>
                    </p>
                </div>

                <button class="btn btn-warning add-fee-btn" onclick="sendWhatsAppReminder(${studentId})">
                    <i class="fab fa-whatsapp"></i> Send Reminder
                </button>
            </div>
        `;

        modal.classList.add('show');
    } catch (error) {
        console.error('Error showing fee modal:', error);
        showToast('Error loading fee tracker', 'error');
    }
}

async function toggleFeePayment(studentId, month, year, event) {
    event.stopPropagation();
    
    try {
        const isPaid = await db.isFeePaid(studentId, month, year);
        
        if (isPaid) {
            await db.markFeeAsUnpaid(studentId, month, year);
            showToast('Fee marked as unpaid', 'info');
        } else {
            await db.markFeeAsPaid(studentId, month, year);
            showToast('Fee marked as paid', 'success');
        }
        
        // Refresh fee modal
        await showFeeModal(studentId, null);
        await loadDashboard();
    } catch (error) {
        console.error('Error toggling fee payment:', error);
        showToast('Error updating fee', 'error');
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

async function handleAddStudent(e) {
    e.preventDefault();

    const photoInput = document.getElementById('photo');
    if (!photoInput.files[0]) {
        showToast('Please select a photo', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = async function(event) {
        try {
            const studentData = {
                name: document.getElementById('name').value,
                fatherName: document.getElementById('father-name').value,
                mobile: document.getElementById('mobile').value,
                whatsapp: document.getElementById('whatsapp').value,
                email: document.getElementById('email').value || '',
                feeAmount: parseInt(document.getElementById('fee-amount').value),
                photo: event.target.result,
                address: document.getElementById('address').value || '',
                joiningDate: document.getElementById('joining-date').value
            };

            await db.addStudent(studentData);
            showToast('✅ Student added successfully!', 'success');
            document.getElementById('student-form').reset();
            document.getElementById('photo-preview').classList.remove('show');
            setTimeout(async () => {
                await switchTab('students-list');
                await loadDashboard();
            }, 800);
        } catch (error) {
            console.error('Error adding student:', error);
            showToast('Error adding student', 'error');
        }
    };

    reader.readAsDataURL(photoInput.files[0]);
}

function previewPhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById('photo-preview');
            preview.style.backgroundImage = `url(${event.target.result})`;
            preview.classList.add('show');
        };
        reader.readAsDataURL(file);
    }
}

async function markFeePaid(studentId, event) {
    if (event) event.stopPropagation();

    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        await db.markFeeAsPaid(studentId, currentMonth, currentYear);
        const student = await db.getStudent(studentId);

        showToast(`✅ ${student.name}'s fee marked as paid!`, 'success');
        await loadDashboard();
        await loadAllStudents();
        closeModal();
    } catch (error) {
        console.error('Error marking fee as paid:', error);
        showToast('Error updating fee', 'error');
    }
}

function sendWhatsAppReminder(studentId, event) {
    if (event) event.stopPropagation();

    db.getStudent(studentId).then(student => {
        if (!student) return;

        const link = whatsapp.sendFeePaidReminder(student);
        whatsapp.openWhatsApp(link);
    }).catch(error => {
        console.error('Error sending WhatsApp reminder:', error);
        showToast('Error sending message', 'error');
    });
}

async function deleteStudent(studentId) {
    if (confirm('क्या आप इस छात्र को हटाना चाहते हैं?')) {
        try {
            await db.deleteStudent(studentId);
            showToast('Student deleted!', 'success');
            closeModal();
            await loadAllStudents();
            await loadDashboard();
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error deleting student', 'error');
        }
    }
}

async function handleSearch(e) {
    try {
        const query = e.target.value;
        const students = query ? await db.searchStudents(query) : await db.getAllStudents();
        const container = document.getElementById('students-container');

        if (students.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: #999;">No results found</p>';
            return;
        }

        let html = '';
        for (let student of students) {
            html += await createStudentCard(student);
        }
        container.innerHTML = html;
    } catch (error) {
        console.error('Error searching students:', error);
        showToast('Error searching', 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show`;
    if (type === 'error') {
        toast.style.borderLeftColor = 'var(--danger)';
    } else if (type === 'success') {
        toast.style.borderLeftColor = 'var(--success)';
    } else if (type === 'info') {
        toast.style.borderLeftColor = 'var(--primary)';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

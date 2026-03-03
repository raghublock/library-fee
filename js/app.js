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
            window.switchTab(tabName);
            if(sidebar) sidebar.classList.remove('show');
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
        btn.addEventListener('click', window.closeModal);
    });

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                window.closeModal();
            }
        });
    });
}

// ------------------------------------------------------------------
// IMPORTANT: Attached to 'window' so inline HTML can trigger them
// ------------------------------------------------------------------

window.switchTab = async function(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const tabElement = document.getElementById(tabName);
    const navElement = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (tabElement) tabElement.classList.add('active');
    if (navElement) navElement.classList.add('active');

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
        window.showToast('Error loading dashboard', 'error');
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
                    <button class="btn btn-warning" onclick="sendWhatsAppReminder(${student.id}, event)">
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

        if (!container) return;

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
        window.showToast('Error loading students', 'error');
    }
}

async function loadPendingFees() {
    try {
        const students = await db.getPendingFees();
        const container = document.getElementById('pending-fees-container');

        if (!container) return;

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
        window.showToast('Error loading pending fees', 'error');
    }
}

async function createStudentCard(student) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const isPaid = await db.isFeePaid(student.id, currentMonth, currentYear);

    // Added a fallback for photo in case the src is empty
    const photoSrc = student.photo || 'https://via.placeholder.com/150';

    return `
        <div class="student-card" onclick="showStudentDetail(${student.id})">
            <img src="${photoSrc}" alt="${student.name}" class="student-photo">
            <div class="student-info">
                <h3>${student.name}</h3>
                <p><i class="fas fa-user"></i> ${student.fatherName}</p>
                <p><i class="fas fa-phone"></i> ${student.mobile}</p>
                <p><i class="fas fa-rupee-sign"></i> ₹${student.feeAmount}/month</p>
                
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

window.showStudentDetail = async function(studentId) {
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

        const photoSrc = student.photo || 'https://via.placeholder.com/150';

        modalBody.innerHTML = `
            <img src="${photoSrc}" alt="${student.name}" class="detail-photo">
            
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
        window.showToast('Error loading student details', 'error');
    }
}

window.showFeeModal = async function(studentId, event) {
    if (event) event.stopPropagation();

    try {
        const student = await db.getStudent(studentId);
        if (!student) return;

        const modal = document.getElementById('fee-modal');
        const modalBody = document.getElementById('fee-modal-body');
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let monthsHtml = '';
        for (let i = 11; i >= 0; i--) {
            let month = currentDate.getMonth() - i;
            let year = currentYear;
            if (month < 0) {
                month += 12;
                year--;
            }
            month++; 

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
        window.showToast('Error loading fee tracker', 'error');
    }
}

window.toggleFeePayment = async function(studentId, month, year, event) {
    if(event) event.stopPropagation();
    
    try {
        const isPaid = await db.isFeePaid(studentId, month, year);
        
        if (isPaid) {
            await db.markFeeAsUnpaid(studentId, month, year);
            window.showToast('Fee marked as unpaid', 'info');
        } else {
            await db.markFeeAsPaid(studentId, month, year);
            window.showToast('Fee marked as paid', 'success');
        }
        
        // Refresh fee modal
        await window.showFeeModal(studentId, null);
        await loadDashboard();
        await loadAllStudents(); // Ensure main list reflects changes too
    } catch (error) {
        console.error('Error toggling fee payment:', error);
        window.showToast('Error updating fee', 'error');
    }
}

window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

async function handleAddStudent(e) {
    e.preventDefault();

    const photoInput = document.getElementById('photo');
    let photoData = '';

    // Handle photo reading as a Promise to ensure it completes before saving
    if (photoInput.files && photoInput.files[0]) {
        photoData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(photoInput.files[0]);
        });
    }

    try {
        const studentData = {
            name: document.getElementById('name').value,
            fatherName: document.getElementById('father-name').value,
            mobile: document.getElementById('mobile').value,
            whatsapp: document.getElementById('whatsapp').value,
            email: document.getElementById('email').value || '',
            feeAmount: parseInt(document.getElementById('fee-amount').value),
            photo: photoData, 
            address: document.getElementById('address').value || '',
            joiningDate: document.getElementById('joining-date').value,
            id: Date.now() // Added ID generation to ensure uniqueness
        };

        await db.addStudent(studentData);
        window.showToast('✅ Student added successfully!', 'success');
        
        document.getElementById('student-form').reset();
        const preview = document.getElementById('photo-preview');
        if(preview) preview.classList.remove('show');
        
        setTimeout(async () => {
            await window.switchTab('students-list');
            await loadDashboard();
        }, 800);
    } catch (error) {
        console.error('Error adding student:', error);
        window.showToast('Error adding student', 'error');
    }
}

function previewPhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById('photo-preview');
            if(preview) {
                preview.style.backgroundImage = `url(${event.target.result})`;
                preview.classList.add('show');
            }
        };
        reader.readAsDataURL(file);
    }
}

window.markFeePaid = async function(studentId, event) {
    if (event) event.stopPropagation();

    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        await db.markFeeAsPaid(studentId, currentMonth, currentYear);
        const student = await db.getStudent(studentId);

        window.showToast(`✅ ${student.name}'s fee marked as paid!`, 'success');
        await loadDashboard();
        await loadAllStudents();
        window.closeModal();
    } catch (error) {
        console.error('Error marking fee as paid:', error);
        window.showToast('Error updating fee', 'error');
    }
}

window.sendWhatsAppReminder = function(studentId, event) {
    if (event) event.stopPropagation();

    if(typeof whatsapp === 'undefined' || !whatsapp.sendFeePaidReminder) {
         window.showToast('WhatsApp module not loaded correctly!', 'error');
         return;
    }

    db.getStudent(studentId).then(student => {
        if (!student) return;

        const link = whatsapp.sendFeePaidReminder(student);
        whatsapp.openWhatsApp(link);
    }).catch(error => {
        console.error('Error sending WhatsApp reminder:', error);
        window.showToast('Error sending message', 'error');
    });
}

window.deleteStudent = async function(studentId) {
    if (confirm('क्या आप इस छात्र को हटाना चाहते हैं?')) {
        try {
            await db.deleteStudent(studentId);
            window.showToast('Student deleted!', 'success');
            window.closeModal();
            await loadAllStudents();
            await loadDashboard();
        } catch (error) {
            console.error('Error deleting student:', error);
            window.showToast('Error deleting student', 'error');
        }
    }
}

async function handleSearch(e) {
    try {
        const query = e.target.value.toLowerCase();
        
        // Add a fallback incase db.searchStudents doesn't exist
        let students = [];
        if(db.searchStudents) {
            students = query ? await db.searchStudents(query) : await db.getAllStudents();
        } else {
            const allStudents = await db.getAllStudents();
            students = query ? allStudents.filter(s => 
                s.name.toLowerCase().includes(query) || 
                s.mobile.includes(query)
            ) : allStudents;
        }
        
        const container = document.getElementById('students-container');

        if (!container) return;

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
        window.showToast('Error searching', 'error');
    }
}

window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if(!toast) return;

    toast.textContent = message;
    toast.className = `toast show`;
    
    // Fallback logic for styling if CSS vars are missing
    if (type === 'error') {
        toast.style.borderLeft = '4px solid #dc3545';
    } else if (type === 'success') {
        toast.style.borderLeft = '4px solid #28a745';
    } else if (type === 'info') {
        toast.style.borderLeft = '4px solid #0d6efd';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

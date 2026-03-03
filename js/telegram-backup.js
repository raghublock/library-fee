class TelegramBackup {
    constructor() {
        this.botToken = localStorage.getItem('telegramBotToken') || '';
        this.chatId = localStorage.getItem('telegramChatId') || '';
    }

    // Telegram settings setup karo
    setupTelegram() {
        const botToken = prompt('Enter your Telegram Bot Token:\n(Get from @BotFather on Telegram)');
        if (!botToken) return false;

        const chatId = prompt('Enter your Telegram Chat ID:\n(Send /start to @userinfobot to get it)');
        if (!chatId) return false;

        localStorage.setItem('telegramBotToken', botToken);
        localStorage.setItem('telegramChatId', chatId);

        this.botToken = botToken;
        this.chatId = chatId;

        showToast('✅ Telegram settings saved!');
        if(typeof checkTelegramStatus === 'function') {
            checkTelegramStatus();
        }
        return true;
    }

    // Telegram par backup bhejo
    async sendBackupToTelegram() {
        try {
            if (!this.botToken || !this.chatId) {
                const setup = confirm('Telegram settings not configured. Setup now?');
                if (setup) {
                    this.setupTelegram();
                }
                return;
            }

            // Fallback agar db.js configure nahi hai toh LocalStorage use karega
            let students = [];
            if (typeof db !== 'undefined' && db.getAllStudents) {
                students = await db.getAllStudents();
            } else {
                students = JSON.parse(localStorage.getItem('library_students')) || [];
            }
            
            if (students.length === 0) {
                showToast('❌ No data to backup');
                return;
            }

            showToast('📤 Sending backup to Telegram...');

            let message = `📊 *LIBRARY FEE MANAGER BACKUP*\n\n`;
            message += `📅 Date: ${new Date().toLocaleString('en-IN')}\n`;
            message += `👥 Total Students: ${students.length}\n\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

            for (let student of students) {
                // Agar history nahi hai toh 0 set karega
                const feeHistory = student.feeHistory || [];
                const totalPaid = feeHistory.length * (student.feeAmount || student.total || 0);
                
                // Status check fallback
                let isPaid = false;
                if (typeof db !== 'undefined' && db.isFeePaid) {
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    isPaid = await db.isFeePaid(student.id, currentMonth, currentYear);
                } else {
                     // Local storage fallback logic
                     isPaid = student.due <= 0;
                }

                const status = isPaid ? '✅ PAID' : '❌ PENDING';

                message += `👤 *${student.name}*\n`;
                if(student.fatherName) message += `👨 Father: ${student.fatherName}\n`;
                if(student.mobile) message += `📱 Mobile: ${student.mobile}\n`;
                message += `💰 Monthly Fee: ₹${student.feeAmount || student.total || 0}\n`;
                message += `💳 Total Paid: ₹${totalPaid || student.paid || 0}\n`;
                message += `📊 Status: ${status}\n`;
                message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            }

            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            const responseData = await response.json();

            if (response.ok && responseData.ok) {
                showToast('✅ Backup sent to Telegram successfully!');
            } else {
                throw new Error(responseData.description || 'Failed to send message');
            }

        } catch (error) {
            console.error('Error sending to Telegram:', error);
            showToast('❌ Error: ' + error.message);
        }
    }

    // Telegram settings ko clear karo
    clearTelegramSettings() {
        if (confirm('Remove Telegram settings?')) {
            localStorage.removeItem('telegramBotToken');
            localStorage.removeItem('telegramChatId');
            this.botToken = '';
            this.chatId = '';
            showToast('✅ Telegram settings cleared');
            if(typeof checkTelegramStatus === 'function') {
                checkTelegramStatus();
            }
        }
    }
}

// Global instance banaya taaki HTML buttons isko call kar sakein
const telegramBackup = new TelegramBackup();

// HTML Buttons ko global functions se link karna
function setupTelegram() {
    telegramBackup.setupTelegram();
}

function sendBackupToTelegram() {
    telegramBackup.sendBackupToTelegram();
}

function clearTelegramSettings() {
    telegramBackup.clearTelegramSettings();
}

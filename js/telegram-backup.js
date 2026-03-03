class TelegramBackup {
    constructor() {
        // अपना Telegram Bot Token डालो
        this.botToken = localStorage.getItem('telegramBotToken') || '';
        // अपना Telegram Chat ID डालो  
        this.chatId = localStorage.getItem('telegramChatId') || '';
    }

    // Telegram settings setup करो
    setupTelegram() {
        const botToken = prompt('Enter your Telegram Bot Token:\n(Get from @BotFather on Telegram)');
        if (!botToken) return false;

        const chatId = prompt('Enter your Telegram Chat ID:\n(Send /start to @userinfobot to get it)');
        if (!chatId) return false;

        localStorage.setItem('telegramBotToken', botToken);
        localStorage.setItem('telegramChatId', chatId);

        this.botToken = botToken;
        this.chatId = chatId;

        showToast('✅ Telegram settings saved!', 'success');
        checkTelegramStatus();
        return true;
    }

    // Telegram पर backup भेजो
    async sendBackupToTelegram() {
        try {
            if (!this.botToken || !this.chatId) {
                const setup = confirm('Telegram settings not configured. Setup now?');
                if (setup) {
                    this.setupTelegram();
                    return;
                }
                return;
            }

            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                showToast('❌ No data to backup', 'error');
                return;
            }

            showToast('📤 Sending backup to Telegram...', 'info');

            let message = `📊 *LIBRARY FEE MANAGER BACKUP*\n\n`;
            message += `📅 Date: ${new Date().toLocaleString('en-IN')}\n`;
            message += `👥 Total Students: ${students.length}\n\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

            for (let student of students) {
                const totalPaid = (student.feeHistory || []).length * student.feeAmount;
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const isPaid = await db.isFeePaid(student.id, currentMonth, currentYear);
                const status = isPaid ? '✅ PAID' : '❌ PENDING';

                message += `👤 *${student.name}*\n`;
                message += `👨 Father: ${student.fatherName}\n`;
                message += `📱 Mobile: ${student.mobile}\n`;
                message += `💰 Monthly Fee: ₹${student.feeAmount}\n`;
                message += `💳 Total Paid: ₹${totalPaid}\n`;
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
                showToast('✅ Backup sent to Telegram successfully!', 'success');
            } else {
                throw new Error(responseData.description || 'Failed to send message');
            }

        } catch (error) {
            console.error('Error sending to Telegram:', error);
            showToast('❌ Error: ' + error.message, 'error');
        }
    }

    // Telegram settings को clear करो
    clearTelegramSettings() {
        if (confirm('Remove Telegram settings?')) {
            localStorage.removeItem('telegramBotToken');
            localStorage.removeItem('telegramChatId');
            this.botToken = '';
            this.chatId = '';
            showToast('✅ Telegram settings cleared', 'success');
            checkTelegramStatus();
        }
    }
}

const telegramBackup = new TelegramBackup();

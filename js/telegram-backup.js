class TelegramBackup {
    constructor() {
        // अपना Telegram Bot Token यहाँ डालो
        this.botToken = '8777296653:AAGoje_gzSyBddeDXOHfKEiIAmen2gC8em8';
        // अपना Telegram Chat ID यहाँ डालो
        this.chatId = '626936565';
    }

    async sendBackupToTelegram() {
        try {
            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                showToast('No data to backup', 'error');
                return;
            }

            // CSV format में data बनाओ
            let message = `📊 *Library Fee Manager Backup*\n\n`;
            message += `Date: ${new Date().toLocaleString()}\n`;
            message += `Total Students: ${students.length}\n\n`;
            message += `━━━━━━━━━━━━━━━━━\n\n`;

            for (let student of students) {
                const totalPaid = (student.feeHistory || []).length * student.feeAmount;
                message += `👤 *${student.name}*\n`;
                message += `Father: ${student.fatherName}\n`;
                message += `Mobile: ${student.mobile}\n`;
                message += `Fee: ₹${student.feeAmount}\n`;
                message += `Total Paid: ₹${totalPaid}\n`;
                message += `━━━━━━━━━━━━━━━━━\n\n`;
            }

            // Telegram API को call करो
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

            if (response.ok) {
                showToast('✅ Backup sent to Telegram!', 'success');
            } else {
                showToast('❌ Failed to send backup', 'error');
            }

        } catch (error) {
            console.error('Error sending to Telegram:', error);
            showToast('Error sending backup', 'error');
        }
    }
}

const telegramBackup = new TelegramBackup();

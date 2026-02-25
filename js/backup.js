class BackupManager {
    constructor() {
        this.exportFormat = 'csv';
    }

    // CSV में export करो
    async exportToCSV() {
        try {
            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                showToast('❌ No students to export', 'error');
                return;
            }

            let csvContent = 'Name,Father Name,Mobile,WhatsApp,Email,Monthly Fee,Address,Joined Date,Total Paid Fees,Pending This Month\n';

            // Data rows
            for (let student of students) {
                const totalPaid = (student.feeHistory || []).length * student.feeAmount;
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const isPaid = await db.isFeePaid(student.id, currentMonth, currentYear);
                const pendingFee = isPaid ? 'PAID ✓' : 'PENDING ✗';

                const row = [
                    `"${student.name}"`,
                    `"${student.fatherName}"`,
                    student.mobile,
                    student.whatsapp,
                    `"${student.email || 'N/A'}"`,
                    student.feeAmount,
                    `"${student.address || 'N/A'}"`,
                    student.joiningDate,
                    totalPaid,
                    pendingFee
                ];

                csvContent += row.join(',') + '\n';
            }

            // Download करो
            this.downloadCSV(csvContent, `library-students-${new Date().getTime()}.csv`);
            showToast('✅ Data exported to CSV successfully!', 'success');

        } catch (error) {
            console.error('Error exporting to CSV:', error);
            showToast('❌ Error exporting CSV: ' + error.message, 'error');
        }
    }

    downloadCSV(csvContent, filename) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // JSON में Full Backup करो (सब कुछ के साथ)
    async exportToJSON() {
        try {
            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                showToast('❌ No data to backup', 'error');
                return;
            }

            const backupData = {
                backupType: 'LOCAL_STORAGE_BACKUP',
                exportDate: new Date().toISOString(),
                totalStudents: students.length,
                students: students
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `library-backup-${Date.now()}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('✅ Full backup created successfully!', 'success');

        } catch (error) {
            console.error('Error exporting to JSON:', error);
            showToast('❌ Error creating backup: ' + error.message, 'error');
        }
    }

    // JSON से Import करो
    async importFromJSON(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            if (!backupData.students || !Array.isArray(backupData.students)) {
                throw new Error('Invalid backup file format');
            }

            let importedCount = 0;
            
            for (let student of backupData.students) {
                try {
                    await db.addStudent(student);
                    importedCount++;
                } catch (error) {
                    console.warn('Skipping duplicate student:', student.id);
                }
            }

            showToast(`✅ ${importedCount} students imported successfully!`, 'success');
            await loadDashboard();
            await loadAllStudents();
            return true;

        } catch (error) {
            console.error('Error importing:', error);
            showToast('❌ Error importing backup: ' + error.message, 'error');
            return false;
        }
    }
}

const backup = new BackupManager();

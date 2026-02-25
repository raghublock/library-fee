class BackupManager {
    constructor() {
        this.exportFormat = 'csv';
    }

    // CSV में export करो
    async exportToCSV() {
        try {
            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                alert('No students to export');
                return;
            }

            let csvContent = 'data:text/csv;charset=utf-8,';
            
            // Header row
            csvContent += 'Name,Father Name,Mobile,WhatsApp,Email,Fee Amount,Address,Joined Date,Total Paid,Pending Fee\n';

            // Data rows
            for (let student of students) {
                const totalPaid = (student.feeHistory || []).length * student.feeAmount;
                const isPaid = await db.isFeePaid(student.id, new Date().getMonth() + 1, new Date().getFullYear());
                const pendingFee = isPaid ? 0 : student.feeAmount;

                const row = [
                    this.escapeCSV(student.name),
                    this.escapeCSV(student.fatherName),
                    student.mobile,
                    student.whatsapp,
                    this.escapeCSV(student.email || ''),
                    student.feeAmount,
                    this.escapeCSV(student.address || ''),
                    student.joiningDate,
                    totalPaid,
                    pendingFee
                ];

                csvContent += row.join(',') + '\n';
            }

            // Download करो
            this.downloadCSV(csvContent, 'library-students.csv');
            showToast('✅ Data exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting to CSV:', error);
            showToast('Error exporting data', 'error');
        }
    }

    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const text = String(value);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    downloadCSV(csvContent, filename) {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // JSON में export करो (photos के साथ)
    async exportToJSON() {
        try {
            const students = await db.getAllStudents();
            
            if (students.length === 0) {
                alert('No students to export');
                return;
            }

            const data = {
                exportDate: new Date().toISOString(),
                totalStudents: students.length,
                students: students
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `library-backup-${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('✅ Backup created successfully!', 'success');

        } catch (error) {
            console.error('Error exporting to JSON:', error);
            showToast('Error creating backup', 'error');
        }
    }

    // JSON से import करो
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!data.students || !Array.isArray(data.students)) {
                        throw new Error('Invalid backup file format');
                    }

                    // Import करो
                    for (let student of data.students) {
                        await db.addStudent(student);
                    }

                    showToast(`✅ ${data.students.length} students imported!`, 'success');
                    await loadDashboard();
                    resolve(true);

                } catch (error) {
                    console.error('Error importing:', error);
                    showToast('Error importing backup', 'error');
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }
}

const backup = new BackupManager();

class StudentDatabase {
    constructor() {
        this.storageKey = 'library_students';
        this.initializeDB();
    }

    initializeDB() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    addStudent(studentData) {
        const students = this.getAllStudents();
        const newStudent = {
            id: Date.now(),
            ...studentData,
            createdAt: new Date().toISOString(),
            feeHistory: []
        };
        students.push(newStudent);
        localStorage.setItem(this.storageKey, JSON.stringify(students));
        return newStudent;
    }

    getAllStudents() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    getStudent(id) {
        const students = this.getAllStudents();
        return students.find(s => s.id === id);
    }

    updateStudent(id, updates) {
        const students = this.getAllStudents();
        const index = students.findIndex(s => s.id === id);
        if (index !== -1) {
            students[index] = { ...students[index], ...updates };
            localStorage.setItem(this.storageKey, JSON.stringify(students));
            return students[index];
        }
        return null;
    }

    deleteStudent(id) {
        const students = this.getAllStudents();
        const filtered = students.filter(s => s.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        return true;
    }

    markFeeAsPaid(studentId, month, year) {
        const student = this.getStudent(studentId);
        if (student) {
            if (!student.feeHistory) student.feeHistory = [];
            
            const alreadyPaid = student.feeHistory.some(f => f.month === month && f.year === year);
            if (!alreadyPaid) {
                student.feeHistory.push({
                    month,
                    year,
                    amount: student.feeAmount,
                    paidAt: new Date().toISOString()
                });
                this.updateStudent(studentId, student);
                return true;
            }
        }
        return false;
    }

    markFeeAsUnpaid(studentId, month, year) {
        const student = this.getStudent(studentId);
        if (student && student.feeHistory) {
            student.feeHistory = student.feeHistory.filter(f => !(f.month === month && f.year === year));
            this.updateStudent(studentId, student);
            return true;
        }
        return false;
    }

    isFeePaid(studentId, month, year) {
        const student = this.getStudent(studentId);
        if (student && student.feeHistory) {
            return student.feeHistory.some(f => f.month === month && f.year === year);
        }
        return false;
    }

    getPendingFees() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        return this.getAllStudents().filter(student => {
            return !this.isFeePaid(student.id, currentMonth, currentYear);
        });
    }

    searchStudents(query) {
        const students = this.getAllStudents();
        return students.filter(s =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.mobile.includes(query) ||
            s.whatsapp.includes(query) ||
            s.fatherName.toLowerCase().includes(query.toLowerCase())
        );
    }

    getMonthsArray() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months;
    }

    getStudentFeeHistory(studentId) {
        const student = this.getStudent(studentId);
        if (student) {
            return student.feeHistory || [];
        }
        return [];
    }
}

const db = new StudentDatabase();

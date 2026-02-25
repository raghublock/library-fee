class StudentDatabase {
    constructor() {
        this.dbName = 'LibraryFeeDB';
        this.storeName = 'students';
        this.version = 1;
        this.db = null;
        this.initDB();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    addStudent(studentData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const newStudent = {
                id: Date.now(),
                ...studentData,
                createdAt: new Date().toISOString(),
                feeHistory: []
            };

            const request = objectStore.add(newStudent);

            request.onsuccess = () => {
                console.log('Student added successfully');
                resolve(newStudent);
            };

            request.onerror = () => {
                console.error('Error adding student:', request.error);
                reject(request.error);
            };
        });
    }

    getAllStudents() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting students:', request.error);
                reject(request.error);
            };
        });
    }

    getStudent(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error getting student:', request.error);
                reject(request.error);
            };
        });
    }

    updateStudent(id, updates) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            const getRequest = objectStore.get(id);

            getRequest.onsuccess = () => {
                const student = getRequest.result;
                if (student) {
                    const updatedStudent = { ...student, ...updates };
                    const putRequest = objectStore.put(updatedStudent);

                    putRequest.onsuccess = () => {
                        console.log('Student updated successfully');
                        resolve(updatedStudent);
                    };

                    putRequest.onerror = () => {
                        reject(putRequest.error);
                    };
                } else {
                    reject('Student not found');
                }
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    deleteStudent(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Student deleted successfully');
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    markFeeAsPaid(studentId, month, year) {
        return new Promise(async (resolve, reject) => {
            try {
                const student = await this.getStudent(studentId);
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
                        await this.updateStudent(studentId, student);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    reject('Student not found');
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    markFeeAsUnpaid(studentId, month, year) {
        return new Promise(async (resolve, reject) => {
            try {
                const student = await this.getStudent(studentId);
                if (student && student.feeHistory) {
                    student.feeHistory = student.feeHistory.filter(f => !(f.month === month && f.year === year));
                    await this.updateStudent(studentId, student);
                    resolve(true);
                } else {
                    reject('Student not found');
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    isFeePaid(studentId, month, year) {
        return new Promise(async (resolve, reject) => {
            try {
                const student = await this.getStudent(studentId);
                if (student && student.feeHistory) {
                    const paid = student.feeHistory.some(f => f.month === month && f.year === year);
                    resolve(paid);
                } else {
                    resolve(false);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    getPendingFees() {
        return new Promise(async (resolve, reject) => {
            try {
                const students = await this.getAllStudents();
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();

                const pending = [];
                for (let student of students) {
                    const isPaid = await this.isFeePaid(student.id, currentMonth, currentYear);
                    if (!isPaid) {
                        pending.push(student);
                    }
                }
                resolve(pending);
            } catch (error) {
                reject(error);
            }
        });
    }

    searchStudents(query) {
        return new Promise(async (resolve, reject) => {
            try {
                const students = await this.getAllStudents();
                const filtered = students.filter(s =>
                    s.name.toLowerCase().includes(query.toLowerCase()) ||
                    s.mobile.includes(query) ||
                    s.whatsapp.includes(query) ||
                    s.fatherName.toLowerCase().includes(query.toLowerCase())
                );
                resolve(filtered);
            } catch (error) {
                reject(error);
            }
        });
    }

    getMonthsArray() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months;
    }

    getStudentFeeHistory(studentId) {
        return new Promise(async (resolve, reject) => {
            try {
                const student = await this.getStudent(studentId);
                if (student) {
                    resolve(student.feeHistory || []);
                } else {
                    resolve([]);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}

const db = new StudentDatabase();

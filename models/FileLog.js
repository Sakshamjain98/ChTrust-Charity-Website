class FileLog {
    constructor(patientName, phoneNumber, email, filePath) {
        this.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.patientName = patientName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.filePath = filePath;
        this.createdAt = new Date().toISOString();
        this.status = 'Sent'; // Default to sent for now
    }
}

module.exports = FileLog;

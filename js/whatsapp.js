class WhatsAppManager {
    constructor() {
        this.apiEndpoint = 'https://wa.me/';
    }

    generateWhatsAppLink(phoneNumber, message) {
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    }

    sendFeePaidReminder(student) {
        const message = `नमस्ते ${student.name},\n\nयह एक सूचना है कि आपके लाइब्रेरी की फीस अभी तक भुगतान नहीं हुई है।\n\nवर्तमान बकाया राशि: ₹${student.feeAmount}\n\nकृपया जल्द से जल्द भुगतान करें।\n\nधन्यवाद!`;
        
        const link = this.generateWhatsAppLink(student.whatsapp, message);
        return link;
    }

    sendFeeReceipt(student, month, year) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[month - 1];
        
        const message = `नमस्ते ${student.name},\n\n✅ आपकी ${monthName} ${year} की लाइब्रेरी फीस प्राप्त हो गई है।\n\nभुगतान की गई राशि: ₹${student.feeAmount}\n\nधन्यवाद!`;
        
        const link = this.generateWhatsAppLink(student.whatsapp, message);
        return link;
    }

    openWhatsApp(link) {
        window.open(link, '_blank');
    }
}

const whatsapp = new WhatsAppManager();

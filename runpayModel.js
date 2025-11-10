const runpaySchema = mongoose.Schema({    
    phone: {
        type: String,
        required: false
    },
    reference: {
        type: String,
        required: false
    },
    voucher: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Voucher is required'],
        ref: 'Voucher'
    },
}, {
    timestamps: true,
})
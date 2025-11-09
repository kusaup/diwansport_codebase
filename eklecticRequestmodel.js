
const eklecticRequestSchema = mongoose.Schema({
    action: {
        type: String,
        required: false
    },
    subscriptionID: {
        type: String,
        required: false
    },
    transactionID: {
        type: String,
        required: false
    },
    offreid: {
        type: String,
        required: false
    },
    amount: {
        type: String,
        required: false
    },
    date: {
        type: String,
        required: false
    },
    msisdn: {
        type: String,
        required: false
    },
    alias: {
        type: String,
        required: false
    },
    sk: {
        type: String,
        required: [true, 'sk is required'],
        unique: true
    },
    landing: {
        type: Number,
        required: [true, 'landing is required'],
    },
    status: {
        type: Boolean,
        required: [true, 'status is required']
    },
}, {
    timestamps: true,
})

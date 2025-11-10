const voucherSchema = mongoose.Schema({
    sk: {
        type: String,
        required: [true, 'sk is required'],
        unique: true
    },
    serie: {
        type: Number,
        required: [true, 'serie is required']
    },
    type: {
        type: String,
        required: [true, 'type is required']
    },
    status: {
        type: Boolean,
        required: [true, 'status is required']
    },
    landing: {
        type: Number,
    },
    provider: {
        type: String,
        required: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true,
})
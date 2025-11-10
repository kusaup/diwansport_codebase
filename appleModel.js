const appleOrderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'user is required'],
        ref: 'User'
    },
    competition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition'
    },
    season: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Season'
    },
    transactionId: {
        type: String,
        required: false
    },
    price: {
        type: Number,
        required: [true, 'price is required']
    },
    status: {
        type: String,
        required: [true, 'status is required']
    },
    treated: {
        type: Boolean,
        required: false
    },
}, {
    timestamps: true,
})
const eklecticSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'user is required'],
        ref: 'User'
    },
    phone: {
        type: Number,
        required: [true, 'phone is required']
    },
    code: {
        type: String,
        required: [true, 'code is required']
    },
    offreid: {
        type: Number,
        required: [true, 'offreid is required']
    },
    status: {
        type: String,
        required: [true, 'status is required']
    },
    competition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition'
    },
    season: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Season'
    },
    alias: {
        type: String,
        required: false
    },
    subscriptionID: {
        type: String,
        required: false
    },
    oneshotID: {
        type: String,
        required: false
    },
    subscriptionDate: {
        type: String,
        required: false
    },
    expireDate: {
        type: String,
        required: false
    },
    lastStatusUpdate: {
        type: String,
        required: false
    },
    treated: {
        type: Boolean,
        required: false
    },
}, {
    timestamps: true,
})
const authorisationSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'target is required']
    },
    type: {
        type: String,
        required: [true, 'type is required']
    },
    ref: {
        type: mongoose.Schema.Types.ObjectId
    },
    subject: {
        type: String,
    },   
}, {
    timestamps: true,
})

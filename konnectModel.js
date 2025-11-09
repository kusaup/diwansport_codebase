const konnectOrderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'user is required'],
        ref: 'User'
    },
    season: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Season'
    },
    league: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leagues'
    },
    competition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition'
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    price: {
        type: Number,
        required: [true, 'price is required']
    },
    status: {
        type: String,
        required: [true, 'status is required']
    },
    token: {
        type: String,
    },
    transactionId: {
        type: String,
    }, 
    treated: {
        type: Boolean,
        required: false
    },
}, {
    timestamps: true,
})

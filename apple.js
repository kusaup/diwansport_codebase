// @desc initAppleOrder
// @route POST /vouchers/init_apple_request
// @access User
const initAppleOrder = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);

    //get data
    const {
        competition_id,
        type
    } = req.body;

   

    let competition = await Competition.findById(competition_id)
    if (!competition) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    

    let order = null;
    if (type === 'competition') {
        order = await appleOrder.create({
            user: req.user._id,
            competition: competition._id,
            price: 3,
            status: 'pending'
        })

    } else if (type === 'season') {
        order = await appleOrder.create({
            user: req.user._id,
            season: competition.season,
            price: 30,
            status: 'pending'
        })
    }

    let signed = md5(order._id + '#' + order.price + '#' + process.env.IOS_SECRET);

    res.status(200).json({
        data: order._id + '#' + order.price + '#' + signed
    })

})

// @desc validAppleOrder
// @route POST /vouchers/valid_apple_order
// @access User
const validAppleOrder = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
        transaction_id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);

    //get data
    const {
        competition_id,
        type,
        transaction_id
    } = req.body;

   

    let competition = await Competition.findById(competition_id)
    console.log(req.user._id)
    console.log(competition)
    if (!competition) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    if (type === 'competition') {
        console.log('case1')
        await appleOrder.create({
            user: req.user._id,
            competition: competition._id,
            price: 3,
            status: 'success',
            transactionId: transaction_id
        })

    } else if (type === 'season') {
        console.log('case2')
        await appleOrder.create({
            user: req.user._id,
            season: competition.season,
            price: 40,
            status: 'success',
            transactionId: transaction_id
        })
    }

    res.status(200).json({
        data: 'ok'
    })

})
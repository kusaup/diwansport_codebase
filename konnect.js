// @desc initKonnect
// @route POST /vouchers/init-konnect
// @access User
const initKonnect = asyncHandler(async (req, res) => {
  
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
        info: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);

    //get data
    const {
        competition_id,
        type,
        info
    } = req.body;

    
    let profile = await Profile.findOne({
        user: req.user._id
    });
    if (!profile) {
        res.status(400).json({
            message: 'Profile non complet'
        });
        throw new Error('Profile non complet')
    }

    let config = await Config.findOne();

  
    let konnectOrder = null;
    if (type === 'match' || type === 'emission') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            competition: competition_id,
            price: config.cp,
            status: 'pending'
        })

    } else if (type === 'season') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            season: competition_id,
            price: config.sp,
            status: 'pending'
        })
    }else if (type === 'league') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            league: competition_id,
            price: 20,
            status: 'pending'
        })
    }else if (type === 'team') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            team: competition_id,
            price: 15,
            status: 'pending'
        })
    }

    let uri = process.env.KONNECT_URI + 'payments/init-payment';
    let contentType = 'application/json';

    let data = {
        receiverWalletId: process.env.KONNECT_WALLET,
        token: 'TND',
        amount: konnectOrder.price * 1000,
        type: 'immediate',
        description : info,
        acceptedPaymentMethods:[
            "wallet",
            "bank_card",
            "e-DINAR"
            ],
        lifespan: 20,
        orderId: konnectOrder._id.toString(),        
        webhook: "https://api3.diwansport.com/vouchers/handle-konnect",
        silentWebhook: true,
        successUrl: "https://diwansport.com/success_payment",
        failUrl: "https://diwansport.com/fail_payment",
    }

    let response = await dataService.postWithxapiHeader(uri, data, contentType, process.env.KONNECT_API_KEY)

    if (response.payUrl) {
        let update = {
            $set: {
                token: response.paymentRef
            }
        };
        await KonnectOrder.updateOne(konnectOrder, update);
        res.status(200).json({
            data: response.payUrl
        })
    } else {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }
})

// @desc initKonnect
// @route POST /vouchers/init-international-konnect
// @access User
const initInternationalKonnect = asyncHandler(async (req, res) => {
  
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
        info: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);

    //get data
    const {
        competition_id,
        type,
        info
    } = req.body;

    
    let profile = await Profile.findOne({
        user: req.user._id
    });
    if (!profile) {
        res.status(400).json({
            message: 'Profile non complet'
        });
        throw new Error('Profile non complet')
    }
  
    let konnectOrder = null;
    if (type === 'match' || type === 'emission') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            competition: competition_id,
            price: 3,
            status: 'pending'
        })

    } else if (type === 'season') {
        konnectOrder = await KonnectOrder.create({
            user: req.user._id,
            season: competition_id,
            price: 30,
            status: 'pending'
        })
    }

    let uri = process.env.KONNECT_URI + 'payments/init-payment';
    let contentType = 'application/json';

    let data = {
        receiverWalletId: process.env.KONNECT_WALLET,
        token: 'EUR',
        amount: konnectOrder.price * 100,
        type: 'immediate',
        description : info,
        acceptedPaymentMethods:[
            "wallet",
            "bank_card",
            ],
        lifespan: 20,
        orderId: konnectOrder._id.toString(),        
        webhook: "https://api3.diwansport.com/vouchers/handle-konnect",
        silentWebhook: true,
        successUrl: "https://diwansport.com/success_payment",
        failUrl: "https://diwansport.com/fail_payment",
    }

    let response = await dataService.postWithxapiHeader(uri, data, contentType, process.env.KONNECT_API_KEY)

    if (response.payUrl) {
        let update = {
            $set: {
                token: response.paymentRef
            }
        };
        await KonnectOrder.updateOne(konnectOrder, update);
        res.status(200).json({
            data: response.payUrl
        })
    } else {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }
})

// @desc handleKonnect
// @route POST /vouchers/handle-konnect
// @access Public
const handleKonnect = asyncHandler(async (req, res) => {
    
    //validate data
    const validationSchema = Joi.object({
        payment_ref: Joi.string().required()
    })
    await validationSchema.validateAsync(req.query);

    //get data
    const {
        payment_ref
    } = req.query;

    let konnectOrder = await KonnectOrder.findOne({
        token: payment_ref,
    });
    if (!konnectOrder) {
        res.status(400).json({
            message: 'order not found'
        });
        throw new Error('order not found')
    }

    let uri = process.env.KONNECT_URI + 'payments/' + payment_ref;

    let response = await dataService.simpleGet(uri, res)
    if (response.payment.status == 'completed') {

        for (let transaction of response.payment.transactions){
            if(transaction.type == 'ePayment'){
                let update = {
                    $set: {
                        status: 'success',
                        transactionId: response.payment.id
                    }
                };
                await KonnectOrder.updateOne(konnectOrder, update);
            }
        }

        
        res.status(200).json({
            data: 'ok'
        })
    } else {

        let update = {
            $set: {
                status: 'fail'
            }
        };
        await KonnectOrder.updateOne(konnectOrder, update);
        res.status(200).json({
            data: 'ok'
        })

    }
})
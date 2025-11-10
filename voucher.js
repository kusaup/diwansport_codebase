// @desc makeVoucher
// @route POST /vouchers/add
// @access Admin
const makeVoucher = asyncHandler(async (req, res) => {

    //validate data
    const validationSchema = Joi.object({
        qte: Joi.number().required(),
        type: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);

    const {
        qte,
        type
    } = req.body;
    if (qte > 100) {
        res.status(400).json({
            message: 'Maximum de 100k par request de génération'
        });
        throw new Error('Maximum de 100k par request de génération')
    }

    let vouchers = [];
    let rng = new rngGenerator();



    do {
        val1 = (rng.next() % 9) + 1
        token = val1.toString();
        for (let i = 0; i < 15; i++) {
            token = token + (rng.next() % 10);
        }
        val2 = (rng.next() % 9) + 1
        serie = val2.toString();
        for (let j = 0; j < 5; j++) {
            serie = serie + (rng.next() % 10);
        }
        let landing = await extractNumber(token)
        const hashedToken = await bcrypt.hash(token, process.env.VOUCHER_SALT)

        let exist = await Voucher.findOne({
            sk: hashedToken
        })
        if (!exist) {
            if (await Voucher.create({
                    sk: hashedToken,
                    serie,
                    landing,
                    type,
                    status: true
                })) {
                let entity = {};
                entity.voucher = token;
                entity.numero_serie = serie;
                vouchers.push(entity)
            }
        }


    } while (vouchers.length < qte * 1000);

    res.status(200).json({
        data: vouchers
    })
})

// @desc assignVoucher
// @route POST /vouchers/assign
// @access User
const assignVoucher = asyncHandler(async (req, res) => {

    //validate data
    const validationSchema = Joi.object({
        voucher: Joi.string().required(),
        user: Joi.string().required(),
        type: Joi.string().required(),
        competition: Joi.string().allow('')
    })
    await validationSchema.validateAsync(req.body);
    const {
        voucher,
        user,
        type,
        competition
    } = req.body;

    let targetUser = await User.findById(user)
    if (!targetUser) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    let targetVoucher = await Voucher.findById(voucher);
    if (!targetVoucher) {
        res.status(400).json({
            message: "Voucher non valide!"
        });
        throw new Error("Voucher non valide!")
    }

    let update = {
        $set: {
            status: false,
            provider: req.user.id
        }
    };
    await Voucher.updateOne(targetVoucher, update);

    if (type === 'competition' || type === 'digital-competition') {

        let taregtCompetition = await Competition.findById(competition)
        if (!taregtCompetition) {
            res.status(400).json({
                message: "Un erreur s'est produite. veuillez réessayer plus tard!"
            });
            throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
        }

        let sell = await Sell.create({
            user: targetUser._id,
            competition: taregtCompetition._id,
            voucher: targetVoucher._id,
            status: 'pending'
        })

        res.status(200).json({
            data: sell._id
        })
    } else if (type === 'season' || type === 'monthly-season') {
        let taregtSeason = await Season.findOne()

        let sell = await Sell.create({
            user: targetUser._id,
            season: taregtSeason._id,
            voucher: targetVoucher._id,
            status: 'pending'
        })

        res.status(200).json({
            data: sell._id
        })
    }

})

// @desc getRequestStatus
// @route POST /vouchers/get-request-status
// @access User
const getRequestStatus = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        id
    } = req.body;

    let sell = await Sell.findById(id)
    if (!sell) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    res.status(200).json({
        data: sell.status
    })
})

// @desc check
// @route POST /vouchers/check
// @access Public
const check = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        competition_id
    } = req.body;

    let competition = await Competition.findById(competition_id)

   

    //verif request on match
    let sellMatch = await Sell.findOne({
        status: 'pending',
        competition: competition._id,
        user: req.user._id
    });
    let sellSeason = await Sell.findOne({
        status: 'pending',
        season: competition.season,
        user: req.user._id
    });

    if (sellMatch) {
        res.status(200).json({
            data: sellMatch._id
        })
    } else if (sellSeason) {
        res.status(200).json({
            data: sellSeason._id
        })
    } else {
        res.status(200).json({
            data: false
        })
    }

})


// @desc validate
// @route POST /vouchers/validate
// @access User
const validate = asyncHandler(async (req, res) => {

    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        code: Joi.number().unsafe().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        competition_id,
        code
    } = req.body;


    let competition = await Competition.findOne({_id: competition_id})
    if(!competition){
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    const hashedToken = await bcrypt.hash(code, process.env.VOUCHER_SALT)

    let mod = 'competition'
    let voucher = await Voucher.findOne({
            sk: hashedToken,
            type: {"$in": ['competition', 'digital-competition']},
            status: true
    });

    if(!voucher){
        mod= 'season'
        voucher = await Voucher.findOne({
            sk: hashedToken,
            type: {"$in": ['season', 'alpha', 'monthly-season']},
            status: true
        });        
    }


    if (!voucher) {
        res.status(400).json({
            message: "Voucher non valide!"
        });
        throw new Error("Voucher non valide!")
    }

    let update = {
        $set: {
            status: false,
            provider: 'diwansport'
        }
    };
    await Voucher.updateOne(voucher, update);

    let sell;
    if(mod === 'competition'){
        sell = await Sell.create({
            user: req.user._id,
            competition: competition._id,
            voucher: voucher._id,
            status: 'pending'
        })
    }else if(mod === 'season'){
        sell = await Sell.create({
            user: req.user._id,
            season: competition.season,
            voucher: voucher._id,
            status: 'pending'
        })
    }


    res.status(200).json({
        data: sell._id
    })

})

// @desc validateSeason
// @route POST /vouchers/validate_season
// @access User
const validateSeason = asyncHandler(async (req, res) => {

    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        code: Joi.number().unsafe().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        competition_id,
        code
    } = req.body;


    let competition = await Competition.findOne({_id: competition_id})
    if(!competition){
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    const hashedToken = await bcrypt.hash(code, process.env.VOUCHER_SALT)

    let mod = 'competition'
    let voucher = await Voucher.findOne({
            sk: hashedToken,
            type: {"$in": ['competition', 'digital-competition']},
            status: true
    });

    if(!voucher){
        mod= 'season'
        voucher = await Voucher.findOne({
            sk: hashedToken,
            type: {"$in": ['season', 'alpha', 'monthly-season']},
            status: true
        });        
    }


    if (!voucher) {
        res.status(400).json({
            message: "Voucher non valide!"
        });
        throw new Error("Voucher non valide!")
    }

    let update = {
        $set: {
            status: false,
            provider: 'diwansport'
        }
    };
    await Voucher.updateOne(voucher, update);

    let sell;
    if(mod === 'competition'){
        sell = await Sell.create({
            user: req.user._id,
            competition: competition._id,
            voucher: voucher._id,
            status: 'pending'
        })
    }else if(mod === 'season'){
        sell = await Sell.create({
            user: req.user._id,
            season: competition.season,
            voucher: voucher._id,
            status: 'pending'
        })
    }


    res.status(200).json({
        data: sell._id
    })
})
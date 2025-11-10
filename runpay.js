// @desc services
// @route get /runpay/services
// @access Public
const services = asyncHandler(async (req, res) => {

    const {password} = req.query;

    if(!password || password !== process.env.RUN_PAY_PASSWORD){
        res.status(500).json({
            error_code: 1,
            description: 'authentication error'
        })
        return
    }

    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    res.status(200).json({
        error_code: 0,
        description: '',
        services:
            [
                {
                    "price": "4.5",
                    "title": "Match | 4.50 DT",
                    "reference": "competition"
                },
                {
                    "price": "40",
                    "title": `Abonnement Annuel : ${today.toISOString().split('T')[0]}/${nextYear.toISOString().split('T')[0]} | 40 DT`,
                    "reference": "season"
                }
            ]
    })
    
})

// @desc notification
// @route post /runpay/notification
// @access Public
const notification = asyncHandler(async (req, res) => {

    const {password, phone, reference} = req.body;

    if(!password || password !== process.env.RUN_PAY_PASSWORD){
        res.status(500).json({
            error_code: 1,
            description: 'authentication error'
        })
        return
    }

    if(!phone || !reference){
        res.status(500).json({
            error_code: 2,
            description: 'Missing params phone or reference'
        })
        return
    }

    if(reference !== 'competition' && reference !== 'season'){
        res.status(500).json({
            error_code: 4,
            description: 'Wrong reference value'
        })
        return
    }

    let validStart =  [2, 4, 5, 7, 9]

    if(phone.length !== 8 || isNaN(phone) || !validStart.includes(parseInt(phone.charAt(0), 10) ) ){
        res.status(500).json({
            error_code: 5,
            description: 'Invalid phone number'
        })
        return
    }

    let rng = new rngGenerator();
    let token;
    success = false

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
            let newVoucher;
            if (newVoucher = await Voucher.create({
                    sk: hashedToken,
                    serie,
                    landing,
                    type: reference,
                    status: true
                })) {

                await Runpay.create({
                    phone,
                    reference,
                    voucher: newVoucher._id
                })    
                success = true
            }
        }


    } while (success === false);


    res.status(200).json({
        error_code: 0,
        code: token
    })
    
})
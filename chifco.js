
// @desc manageTtDcb
// @route GET /vouchers/manage_tt_dcb
// @access GUEST
const manageTtDcb = asyncHandler(async (req, res) => {
    let uri = process.env.DCB_API_URI + 'api/get_my_stats';
    let data = {
        type: 'active',
        apikey: process.env.DCB_API_KEY
    }
    let response = await dataService.post(uri, encryptData(data))

    let msisdns = [];
    for(let dailySub of response.data){       
        if(!msisdns.includes(dailySub.msisdn)){
            msisdns.push(dailySub.msisdn)
        }
    }

    
    let dcbs = await Dcb.find({
        status : {$ne: 'pending'},
        offreid: 1
    })

    let userElevok = [];
 

    let update = {$set: {status: 'inactive'}};
    for(let dcb of dcbs){
        if(!msisdns.includes(dcb.phone)){            
            await Dcb.updateOne(dcb, update)
        }else{
            if(!userElevok.includes(dcb.user)){
                userElevok.push(dcb.user)
            }            
           
        }
    }

    for(let userElev of userElevok){
        //wait 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
       
    }
    
    res.status(200).json({
        data: "ok"
    })
})

// @desc handleTtDcb
// @route GET /vouchers/handle_tt_dcb
// @access GUEST
const handleTtDcb = asyncHandler(async (req, res) => {
    //validate data
     const validationSchema = Joi.object({
         id: Joi.string().required(),
         msisdn: Joi.string().required(),
         status: Joi.string().required(),
         hash: Joi.string().required(),
     })
     await validationSchema.validateAsync(req.body);
     const {
         id,
         msisdn,
         status,
         hash
     } = req.body;
 
     // verif hash
     let data = {
         id,
         msisdn,
         status,
         hash
     }
 
     console.log(data)
     if(validateData(data)){
         
         await Dcb.updateMany({phone: msisdn, offreid: 1, status: {$ne: 'pending'}}, {
            $set: {
                status:status 
            }
            });
         res.status(200).json({
             data: "ok"
         })
     }else{
         res.status(500).json({
             data: "not valid"
         })
     }
    
     
})

// @desc otpTt
// @route POST /vouchers/otp-tt
// @access Public
const otpTt = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        phone: Joi.string().required()
    })
    await validationSchema.validateAsync(req.body);
    let {
        phone
    } = req.body;

    msisdn = phone = phone.slice(-8);

    let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };

    let auth = await dataService.postWithParams(authUri, params, res)

    type = await getPhoneType(phone, auth, res);
    let alias = '';
    
    offreid = 1
 
    //get ott
    if(type === 'telecom'){
        let linkedPhone = await Dcb.findOne({
            phone: msisdn,
            status: 'active',
            offreid: offreid
        })
       
        if (linkedPhone) {
              
            let msg = "Vous êtes déjà inscrit au service Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs du championnat tunisien.";
          
            await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

            res.status(400).json({
                message: "Vous êtes déjà inscrit au service Diwan Sport."
            });
            throw new Error("Vous êtes déjà inscrit au service Diwan Sport.")
        }

        let uri = process.env.DCB_API_URI + 'api/ott';

        let data = {
            msisdn: phone,
            apikey: process.env.DCB_API_KEY
        }

        let response = await dataService.post(uri, encryptData(data))

        //user exist 
        let existUser = await User.findOne({
            role: 'local-user',
            identifier: msisdn
        }) 

        let existUserId = null;
        
        //generate and hash
        let password = makeRandomNum(8);
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if(!existUser){
            // register user        
            let newUser = await User.create({
                identifier: msisdn,
                password: hashedPassword,
                role: 'local-user',
                valid: true
            })
            /*elevokService.login({
                    identifier: newUser._id,
                    username: newUser.identifier,
                    firstName: '',
                    lastName: '',
                    phoneCode: '216',
                    phoneNumber: '',
                    email: '',
                    widget: true,
                    reference: 'aaaa',
                    source: 'MOBILE',
                })*/
            existUserId = newUser._id;

        }else{
            // update user password
            existUserId = existUser._id;
            let update = { $set: { 
                password: hashedPassword,
            }};
            await User.updateOne(existUser, update);  
        }

        let season =  await Season.findOne()

        let dcb = await Dcb.create({
            user: existUserId,
            phone: msisdn,
            offreid,
            code: response.data.token,
            subscriptionID: password,
            status: 'pending',
            season: season._id
        })

        res.status(200).json({
            data: dcb,
            type : 'dcb'
        })

    }else{
        res.status(400).json({
            message: "numéro non valide"
        });
        throw new Error("numéro non valide")
    }
    
})

// @desc validateTT
// @route POST /vouchers/validate-tt
// @access Public
const validateTT = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        pin: Joi.string().required(),
        id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        pin,
        id
    } = req.body;
    
    let dcb = await Dcb.findById(id)

    if (!dcb || dcb.status != 'pending') {
        
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    let uri = process.env.DCB_API_URI + 'api/user_dailysub';

    let data = {
        apikey: process.env.DCB_API_KEY,
        offreId: dcb.offreid.toString(),
        token: dcb.code,
        code: pin,
        password: dcb.subscriptionID.toString(),
        msisdn: dcb.phone.toString(),           
    }
   
    let response = await dataService.post(uri, encryptData(data));
    
    
        if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
        }else {
                res.status(200).json({
                    data: "fail"
                })
        }

})

// @desc handleChifco
// @route GET /vouchers/handle_chifco
// @access GUEST
const handleChifco = asyncHandler(async (req, res) => {

    const validationSchema = Joi.object({
        offreId: Joi.string().required(),
        action: Joi.string().required(),
        msisdn: Joi.string()
          .length(8)
          .pattern(/^[0-9]+$/)
          .required(),
        hash: Joi.string().required(),
    });
    
    await validationSchema.validateAsync(req.body);
  
    let {offreId, action, msisdn, hash} = req.body;

    let data = {
        offreId,
        action,
        msisdn,
        hash
    }

    offreId = parseInt(offreId, 10)

    if(validateChifcoData(data)){

        // case 1 unsub 
        if(action.toLowerCase() === 'unsub'){       

            //find subscription
            let dcbs = await Dcb.find({
                phone: msisdn,
                offreid: offreId,
                status: {$ne: 'pending'}
            });
            if(dcbs.length === 0){
                //notif dcb server + sms
                let uri = process.env.DCB_API_URI + 'api/uusd';

                let data = {
                    msisdn: msisdn.toString(),
                    action: action,
                    apikey: process.env.DCB_API_KEY
                }      
                   
                await dataService.post(uri, encryptData(data))

                res.status(200).json({
                    data: 'ok'
                })
    
                return;
            }

            //update sub
            let  update = { $set: { 
                status : "inactive"
            }};   

            let sended = false;

            for(let dcb of dcbs){

                if(!sended){
                    sended = true;
                    //notif dcb server + sms
                    let uri = process.env.DCB_API_URI + 'api/uusd';

                    let data = {
                        msisdn: msisdn.toString(),
                        action: action,
                        apikey: process.env.DCB_API_KEY
                    }      
                    
                    await dataService.post(uri, encryptData(data))
                }                
                
                //desactivate user
                await Dcb.updateOne(dcb, update);
            }

            res.status(200).json({
                data: 'ok'
            })

            return;
        }

        // case 2 sub 
        if(action.toLowerCase() === 'sub'){   

            if(offreId === 2){
                msisdn = 'EST' + msisdn
            }
            if(offreId === 3){
                msisdn = 'CSS' + msisdn
            }

            //linked phone
            let linkedPhone = await Dcb.findOne({
                phone: msisdn,
                status: 'active',
                offreid: offreId
            })
            if (linkedPhone) {
               
                let msg = "Vous êtes déjà inscrit au service Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs du championnat tunisien.";
             
                await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

                res.status(400).json({
                    message: "numéro liée avec un autre compte"
                });
                throw new Error("numéro liée avec un autre compte")
            }

            //user exist 
            let existUser = await User.findOne({
                role: 'local-user',
                identifier: msisdn
            }) 

            let existUserId = null;
            
            //generate and hash
            let password = makeRandomNum(8);
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)

            if(!existUser){
                // register user        
                let newUser = await User.create({
                    identifier: msisdn,
                    password: hashedPassword,
                    role: 'local-user',
                    valid: true
                })
               /* elevokService.login({
                    identifier: newUser._id,
                    username: newUser.identifier,
                    firstName: '',
                    lastName: '',
                    phoneCode: '216',
                    phoneNumber: '',
                    email: '',
                    widget: true,
                    reference: 'aaaa',
                    source: 'MOBILE',
                })*/
                existUserId = newUser._id;
    
            }else{
                // update user password
                existUserId = existUser._id;
                let update = { $set: { 
                    password: hashedPassword,
                }};
                await User.updateOne(existUser, update);  
            }

            let season =  await Season.findOne()

            let dcb = await Dcb.create({
                user: existUserId,
                phone: msisdn,
                offreid: offreId,
                code: 'offline-subscribtion',
                status: 'pending',
                season: season._id
            })

            let uri = process.env.DCB_API_URI + 'api/direct_dailysub';

            let postedData = {
                apikey: process.env.DCB_API_KEY,
                offreId: dcb.offreid.toString(),
                token: password,
                msisdn: dcb.phone.toString(),           
            }
    
            let response = await dataService.post(uri, encryptData(postedData));

            if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
            }

            res.status(200).json({
                data: "fail"
            })

            return;
        }

        // case 2 sub 
        if(action.toLowerCase() === 'oneshot' && offreId === 4){   
          

            let uri = process.env.DCB_API_URI + 'api/directoneshot';

            let data = {
                apikey: process.env.DCB_API_KEY,
                offreId: '4',
                msisdn: msisdn.toString(),           
            }        
    
            let response = await dataService.postDCB(uri, encryptData(data));
                
            if (response && response.data.confirm && response.data.confirm === 'ok') {
                
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
                                type: 'competition',
                                status: true
                            })) {
            
                            await Chifco.create({
                                phone: msisdn,
                                voucher: newVoucher._id
                            })    
                            success = true
                        }
                    }        
            
                } while (success === false);
    
                let msg = "Accédez à  https://diwansport.com/ et regardez en direct tous les matchs du championnat tunisien. Veuillez utiliser ce code : " + token + " pour activer le match que vous voulez regarder";
                 
                await dataService.sendDcbSms( [{number: msisdn, message: msg }] );            
            
                res.status(200).json({
                    data: "active"
                })
                
            }else {

                let msg = "Cher client, votre solde ne vous permet pas de bénéficier du service Diwan Sport. Veuillez recharger votre compte puis composez *352#";
                 
                await dataService.sendDcbSms( [{number: msisdn, message: msg }] );            

                    res.status(200).json({
                        data: "fail"
                    })
            }
        
            
        }
       
    }else{
        res.status(500).json({
            data: "not valid hash"
        })
    }
})


// @desc otpTt
// @route POST /dcb/otp-est-tt
// @access Public
const otpEstTt = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        phone: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    let {
        phone
    } = req.body;

    msisdn = phone = phone.slice(-8);

    let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };

    let auth = await dataService.postWithParams(authUri, params, res)

    type = await getPhoneType(phone, auth, res);
    console.log(type)
    let alias = '';
    
    let offreid = 2;
    let identifier = 'EST' + phone
 
    //get ott
    if(type === 'telecom'){
        let linkedPhone = await Dcb.findOne({
            phone: msisdn,
            status: 'active',
            offreid: offreid
        })
       
        if (linkedPhone) {
                  
            let msg = "Vous êtes déjà inscrit au service TARAJI Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs de l'Espérance sportive de Tunis. ";
           

            await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

            res.status(400).json({
                message: "Vous êtes déjà inscrit au service Diwan Sport."
            });
            throw new Error("Vous êtes déjà inscrit au service Diwan Sport.")
        }

        let uri = process.env.DCB_API_URI + 'api/ott';

        let data = {
            msisdn: phone,
            apikey: process.env.DCB_API_KEY_EST
        }

        let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_EST))

        //user exist 
        let existUser = await User.findOne({
            role: 'local-user',
            identifier: identifier
        }) 

        let existUserId = null;
        
        //generate and hash
        let password = makeRandomNum(8);
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if(!existUser){
            // register user        
            let newUser = await User.create({
                identifier: identifier,
                password: hashedPassword,
                role: 'local-user',
                valid: true
            })
            existUserId = newUser._id;

        }else{
            // update user password
            existUserId = existUser._id;
            let update = { $set: { 
                password: hashedPassword,
            }};
            await User.updateOne(existUser, update);  
        }



        let dcb = await Dcb.create({
            user: existUserId,
            phone: msisdn,
            offreid,
            code: response.data.token,
            subscriptionID: password,
            status: 'pending',
            team: '63ef97928fb96177741a3712'
        })

        res.status(200).json({
            data: dcb,
            type : 'dcb'
        })

    }else{
        res.status(400).json({
            message: "numéro non valide"
        });
        throw new Error("numéro non valide")
    }
    
})

// @desc validateTT
// @route POST /dcb/validate-est-tt
// @access Public
const validateEstTT = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        pin: Joi.string().required(),
        id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        pin,
        id
    } = req.body;
    
    let dcb = await Dcb.findById(id)

    if (!dcb || dcb.status != 'pending') {
        
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    let uri = process.env.DCB_API_URI + 'api/user_dailysub';

    let data = {
        apikey: process.env.DCB_API_KEY_EST,
        offreId: dcb.offreid.toString(),
        token: dcb.code,
        code: pin,
        password: dcb.subscriptionID.toString(),
        msisdn: dcb.phone.toString(),           
    }
   
    let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_EST));
    
    
        if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
        }else {
                res.status(200).json({
                    data: "fail"
                })
        }

})

// @desc handleTtEst
// @route GET /dcb/handle_tt_est
// @access GUEST
const handleTtEst = asyncHandler(async (req, res) => {
    //validate data
     const validationSchema = Joi.object({
         id: Joi.string().required(),
         msisdn: Joi.string().required(),
         status: Joi.string().required(),
         hash: Joi.string().required(),
     })
     await validationSchema.validateAsync(req.body);
     const {
         id,
         msisdn,
         status,
         hash
     } = req.body;
 
     // verif hash
     let data = {
         id,
         msisdn,
         status,
         hash
     }
 
     console.log(data)
     if(validateData(data, process.env.DCB_API_SK_EST)){
         /*await Dcb.updateOne(
             {subscriptionID: id, phone: msisdn},
             {
                 $set: {
                     status:status 
                 }
             }
         )*/
         await Dcb.updateMany({phone: msisdn, offreid: 2,status: {$ne: 'pending'}}, {
            $set: {
                status:status 
            }
            });
         res.status(200).json({
             data: "ok"
         })
     }else{
         res.status(500).json({
             data: "not valid"
         })
     }
    
     
})

// @desc manageTtEst
// @route GET /dcb/manage_tt_est
// @access GUEST
const manageTtEst = asyncHandler(async (req, res) => {
    let uri = process.env.DCB_API_URI + 'api/get_my_stats';
    let data = {
        type: 'active',
        apikey: process.env.DCB_API_KEY_EST
    }
    let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_EST))

    let msisdns = [];
    for(let dailySub of response.data){       
        if(!msisdns.includes(dailySub.msisdn)){
            msisdns.push(dailySub.msisdn)
        }
    }

    let dcbs = await Dcb.find({
        status : {$ne: 'pending'},
        offreid: 2
    })

    let update = {$set: {status: 'inactive'}};
    for(let dcb of dcbs){
        if(!msisdns.includes(dcb.phone)){
            
            await Dcb.updateOne(dcb, update)
        }else{
           /* elevokService.push({
                user: dcb.user,
                amount: 0.25,
            })*/       
        }
    }
    
    res.status(200).json({
        data: "ok"
    })
})

// @desc otpTt
// @route POST /dcb/otp-css-tt
// @access Public
const otpCssTt = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        phone: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    let {
        phone
    } = req.body;

    msisdn = phone = phone.slice(-8);

    let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };

    let auth = await dataService.postWithParams(authUri, params, res)

    type = await getPhoneType(phone, auth, res);
    let alias = '';
    
    let offreid = 3;
    let identifier = 'CSS' + phone
 
    //get ott
    if(type === 'telecom'){
        let linkedPhone = await Dcb.findOne({
            phone: msisdn,
            status: 'active',
            offreid: offreid
        })
       
        if (linkedPhone) {         
            let msg = "Vous êtes déjà inscrit au service CSS Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs du Club Sportif Sfaxien. ";
           

            await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

            res.status(400).json({
                message: "Vous êtes déjà inscrit au service Diwan Sport."
            });
            throw new Error("Vous êtes déjà inscrit au service Diwan Sport.")
        }

        let uri = process.env.DCB_API_URI + 'api/ott';

        let data = {
            msisdn: phone,
            apikey: process.env.DCB_API_KEY_CSS
        }

        let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_CSS))

        //user exist 
        let existUser = await User.findOne({
            role: 'local-user',
            identifier: identifier
        }) 

        let existUserId = null;
        
        //generate and hash
        let password = makeRandomNum(8);
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if(!existUser){
            // register user        
            let newUser = await User.create({
                identifier: identifier,
                password: hashedPassword,
                role: 'local-user',
                valid: true
            })
            existUserId = newUser._id;

        }else{
            // update user password
            existUserId = existUser._id;
            let update = { $set: { 
                password: hashedPassword,
            }};
            await User.updateOne(existUser, update);  
        }

        let season =  await Season.findOne()

        let dcb = await Dcb.create({
            user: existUserId,
            phone: msisdn,
            offreid,
            code: response.data.token,
            subscriptionID: password,
            status: 'pending',
            team: '63ef97928fb96177741a372a'
        })

        res.status(200).json({
            data: dcb,
            type : 'dcb'
        })

    }else{
        res.status(400).json({
            message: "numéro non valide"
        });
        throw new Error("numéro non valide")
    }
    
})

// @desc validateTT
// @route POST /dcb/validate-css-tt
// @access Public
const validateCssTT = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        pin: Joi.string().required(),
        id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        pin,
        id
    } = req.body;
    
    let dcb = await Dcb.findById(id)

    if (!dcb || dcb.status != 'pending') {
        
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    let uri = process.env.DCB_API_URI + 'api/user_dailysub';

    let data = {
        apikey: process.env.DCB_API_KEY_CSS,
        offreId: dcb.offreid.toString(),
        token: dcb.code,
        code: pin,
        password: dcb.subscriptionID.toString(),
        msisdn: dcb.phone.toString(),           
    }
   
    let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_CSS));
    
    
        if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
        }else {
                res.status(200).json({
                    data: "fail"
                })
        }

})

// @desc handleTtCss
// @route GET /dcb/handle_tt_css
// @access GUEST
const handleTtCss = asyncHandler(async (req, res) => {
    //validate data
     const validationSchema = Joi.object({
         id: Joi.string().required(),
         msisdn: Joi.string().required(),
         status: Joi.string().required(),
         hash: Joi.string().required(),
     })
     await validationSchema.validateAsync(req.body);
     const {
         id,
         msisdn,
         status,
         hash
     } = req.body;
 
     // verif hash
     let data = {
         id,
         msisdn,
         status,
         hash
     }
 
     console.log(data)
     if(validateData(data , process.env.DCB_API_SK_CSS)){
         /*await Dcb.updateOne(
             {subscriptionID: id, phone: msisdn},
             {
                 $set: {
                     status:status 
                 }
             }
         )*/
         await Dcb.updateMany({phone: msisdn, offreid: 3, status: {$ne: 'pending'}}, {
            $set: {
                status:status 
            }
            });
         res.status(200).json({
             data: "ok"
         })
     }else{
         res.status(500).json({
             data: "not valid"
         })
     }
    
     
})

// @desc manageTtCss
// @route GET /dcb/manage_tt_css
// @access GUEST
const manageTtCss = asyncHandler(async (req, res) => {
    let uri = process.env.DCB_API_URI + 'api/get_my_stats';
    let data = {
        type: 'active',
        apikey: process.env.DCB_API_KEY_CSS
    }
    let response = await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_CSS))

    let msisdns = [];
    for(let dailySub of response.data){       
        if(!msisdns.includes(dailySub.msisdn)){
            msisdns.push(dailySub.msisdn)
        }
    }
    

    let dcbs = await Dcb.find({
        status : {$ne: 'pending'},
        offreid: 3
    })

    let update = {$set: {status: 'inactive'}};
    for(let dcb of dcbs){
        if(!msisdns.includes(dcb.phone)){
            
            await Dcb.updateOne(dcb, update)
        }else{
           /* elevokService.push({
                user: dcb.user,
                amount: 0.25,
            })*/       
        }
    }
    
    res.status(200).json({
        data: "ok"
    })
})

// @desc handleChifco
// @route GET /dcb/handle_est_chifco
// @access GUEST
const handleEstChifco = asyncHandler(async (req, res) => {

    const validationSchema = Joi.object({
        offreId: Joi.string().required(),
        action: Joi.string().required(),
        msisdn: Joi.string()
          .length(8)
          .pattern(/^[0-9]+$/)
          .required(),
        hash: Joi.string().required(),
    });
    
    await validationSchema.validateAsync(req.body);
  
    let {offreId, action, msisdn, hash} = req.body;

    let data = {
        offreId,
        action,
        msisdn,
        hash
    }

    let identifier = 'EST' + msisdn

    if(validateChifcoData(data)){

        // case 1 unsub 
        if(action.toLowerCase() === 'unsub'){       

            //find subscription
            let dcbs = await Dcb.find({
                phone: msisdn,
                offreid: offreId,
                status: {$ne: 'pending'}
            });
            if(dcbs.length === 0){
                //notif dcb server + sms
                let uri = process.env.DCB_API_URI + 'api/uusd';

                let data = {
                    msisdn: msisdn.toString(),
                    action: action,
                    apikey: process.env.DCB_API_KEY_EST
                }      
                   
                await dataService.post(uri, encryptData(data,  process.env.DCB_API_SK_EST))

                res.status(200).json({
                    data: 'ok'
                })
    
                return;
            }

            //update sub
            let  update = { $set: { 
                status : "inactive"
            }};   

            let sended = false;

            for(let dcb of dcbs){

                if(!sended){
                    sended = true;
                    //notif dcb server + sms
                    let uri = process.env.DCB_API_URI + 'api/uusd';

                    let data = {
                        msisdn: msisdn.toString(),
                        action: action,
                        apikey: process.env.DCB_API_KEY_EST
                    }      
                    
                    await dataService.post(uri, encryptData(data,  process.env.DCB_API_SK_EST))
                }                
                
                //desactivate user
                await Dcb.updateOne(dcb, update);
            }

            res.status(200).json({
                data: 'ok'
            })

            return;
        }

        // case 2 sub 
        if(action.toLowerCase() === 'sub'){   
            
            //linked phone
            let linkedPhone = await Dcb.findOne({
                phone: msisdn,
                offreid: offreId,
                status: 'active',
            })
            if (linkedPhone) {
               
                let msg = "Vous êtes déjà inscrit au service TARAJI Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs de l'Espérance sportive de Tunis. ";
               

                await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

                res.status(400).json({
                    message: "numéro liée avec un autre compte"
                });
                throw new Error("numéro liée avec un autre compte")
            }

            //user exist 
            let existUser = await User.findOne({
                role: 'local-user',
                identifier: identifier
            }) 

            let existUserId = null;
            
            //generate and hash
            let password = makeRandomNum(8);
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)

            if(!existUser){
                // register user        
                let newUser = await User.create({
                    identifier: identifier,
                    password: hashedPassword,
                    role: 'local-user',
                    valid: true
                })
                existUserId = newUser._id;
    
            }else{
                // update user password
                existUserId = existUser._id;
                let update = { $set: { 
                    password: hashedPassword,
                }};
                await User.updateOne(existUser, update);  
            }

            let season =  await Season.findOne()

            let dcb = await Dcb.create({
                user: existUserId,
                phone: msisdn,
                offreid: offreId,
                code: 'offline-subscribtion',
                status: 'pending',
                team: '63ef97928fb96177741a3712'
            })

            let uri = process.env.DCB_API_URI + 'api/direct_dailysub';

            let postedData = {
                apikey: process.env.DCB_API_KEY_EST,
                offreId: dcb.offreid.toString(),
                token: password,
                msisdn: dcb.phone.toString(),           
            }
    
            let response = await dataService.post(uri, encryptData(postedData, process.env.DCB_API_SK_EST));

            if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
            }

            res.status(200).json({
                data: "fail"
            })

            return;
        }
       
    }else{
        res.status(500).json({
            data: "not valid hash"
        })
    }
})

// @desc handleChifco
// @route GET /dcb/handle_css_chifco
// @access GUEST
const handleCssChifco = asyncHandler(async (req, res) => {

    const validationSchema = Joi.object({
        offreId: Joi.string().required(),
        action: Joi.string().required(),
        msisdn: Joi.string()
          .length(8)
          .pattern(/^[0-9]+$/)
          .required(),
        hash: Joi.string().required(),
    });
    
    await validationSchema.validateAsync(req.body);
  
    let {offreId, action, msisdn, hash} = req.body;

    let data = {
        offreId,
        action,
        msisdn,
        hash
    }

    let identifier = 'CSS' + msisdn

    if(validateChifcoData(data)){

        // case 1 unsub 
        if(action.toLowerCase() === 'unsub'){       

            //find subscription
            let dcbs = await Dcb.find({
                phone: msisdn,
                offreid: offreId,
                status: {$ne: 'pending'}
            });
            if(dcbs.length === 0){
                //notif dcb server + sms
                let uri = process.env.DCB_API_URI + 'api/uusd';

                let data = {
                    msisdn: msisdn.toString(),
                    action: action,
                    apikey: process.env.DCB_API_KEY_CSS
                }      
                   
                await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_CSS))

                res.status(200).json({
                    data: 'ok'
                })
    
                return;
            }

            //update sub
            let  update = { $set: { 
                status : "inactive"
            }};   

            let sended = false;

            for(let dcb of dcbs){

                if(!sended){
                    sended = true;
                    //notif dcb server + sms
                    let uri = process.env.DCB_API_URI + 'api/uusd';

                    let data = {
                        msisdn: msisdn.toString(),
                        action: action,
                        apikey: process.env.DCB_API_KEY_CSS
                    }      
                    
                    await dataService.post(uri, encryptData(data, process.env.DCB_API_SK_CSS))
                }                
                
                //desactivate user
                await Dcb.updateOne(dcb, update);
            }

            res.status(200).json({
                data: 'ok'
            })

            return;
        }

        // case 2 sub 
        if(action.toLowerCase() === 'sub'){   
            
            //linked phone
            let linkedPhone = await Dcb.findOne({
                phone: msisdn,
                offreid: offreId,
                status: 'active',
            })
            if (linkedPhone) {
             
                let msg = "Vous êtes déjà inscrit au service CSS Diwan Sport. Accédez à  https://diwansport.com/ et regardez en direct tous les matchs du Club Sportif Sfaxien. ";
              

                await dataService.sendDcbSms( [{number: msisdn, message: msg }] );

                res.status(400).json({
                    message: "numéro liée avec un autre compte"
                });
                throw new Error("numéro liée avec un autre compte")
            }

            //user exist 
            let existUser = await User.findOne({
                role: 'local-user',
                identifier: identifier
            }) 

            let existUserId = null;
            
            //generate and hash
            let password = makeRandomNum(8);
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)

            if(!existUser){
                // register user        
                let newUser = await User.create({
                    identifier: identifier,
                    password: hashedPassword,
                    role: 'local-user',
                    valid: true
                })
                existUserId = newUser._id;
    
            }else{
                // update user password
                existUserId = existUser._id;
                let update = { $set: { 
                    password: hashedPassword,
                }};
                await User.updateOne(existUser, update);  
            }


            let dcb = await Dcb.create({
                user: existUserId,
                phone: msisdn,
                offreid: offreId,
                code: 'offline-subscribtion',
                status: 'pending',
                team: '63ef97928fb96177741a372a'
            })

            let uri = process.env.DCB_API_URI + 'api/direct_dailysub';

            let postedData = {
                apikey: process.env.DCB_API_KEY_CSS,
                offreId: dcb.offreid.toString(),
                token: password,
                msisdn: dcb.phone.toString(),           
            }
    
            let response = await dataService.post(uri, encryptData(postedData, process.env.DCB_API_SK_CSS));

            if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    subscriptionID: response.data.subscriptionID, 
                    status : response.data.status.toLowerCase()
                } };   
            
                await Dcb.updateOne(dcb, update);

                if(response.data.status.toLowerCase() === 'active'){
                    res.status(200).json({
                        data: "active"
                    })
                }else{
                    res.status(200).json({
                        data: "fail"
                    }) 
                }
            
            }

            res.status(200).json({
                data: "fail"
            })

            return;
        }
       
    }else{
        res.status(500).json({
            data: "not valid hash"
        })
    }
})


// @desc intern
function validateChifcoData(data){

    // Exclude the 'hash' property
    let { hash, ...restData } = data;
 
    // Get the property names in alphabetical order
    let alphabeticalOrder = Object.keys(restData).sort();
  
    // Concatenate values
    let concatenatedData = alphabeticalOrder
      .map((propertyName) => `${propertyName}${restData[propertyName]}`)
      .join("");

    // hashData
    let hashData = md5(concatenatedData + process.env.DCB_CHIFCO_API_SK);
  
    if (hashData === data.hash) {
      return true;
    } else {
      return false;
    }

}
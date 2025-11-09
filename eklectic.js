
// @desc oneshotEklectic
// @route POST /vouchers/oneshot-eklectic
// @access User
const oneshotEklectic = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
        phone: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    let {
        competition_id,
        type,
        phone
    } = req.body;

    phone = phone.slice(-8);

    let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };

    let auth = await dataService.postWithParams(authUri, params, res)

    type = await getPhoneType(phone, auth, res);
    let alias = '';

   
    let competition = await Competition.findById(competition_id)
    if (!competition) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

   


    let offreid = 0;
    if (type === 'ooredoo') {
        offreid = 105;
    }else if (type === 'orange') {
        offreid = 165;
        alias = await getAlias(phone, auth, res);
    }else{
        offreid = 4;
    }

    if(type === 'telecom'){
        //linked phone
       
        let uri = process.env.DCB_API_URI + 'api/ott';

        let data = {
            msisdn: phone,
            apikey: process.env.DCB_API_KEY
        }

   

        let response = await dataService.post(uri, encryptData(data))
        
        let dcb = await Dcb.create({
            user: req.user._id,
            phone: phone,
            offreid,
            code: response.data.token,
            status: 'pending',
            competition: competition._id
        })


        res.status(200).json({
            data: dcb,
            type : 'dcb'
        })

    }else{
        let uri = 'https://payment.eklectic.tn/API/subscription/otp';
        let contentType = 'application/json';
        let authorization = "Bearer " + auth.access_token;
    
    
    
        let data = {
            msisdn: phone,
            offreid
        }
    
        let response = await dataService.postWithHeader(uri, data, contentType, authorization)
    
        let eklectic = await Eklectic.create({
            user: req.user._id,
            phone: phone,
            alias,
            offreid,
            code: response.code,
            status: 'pending',
            competition: competition._id
        })
    
        res.status(200).json({
            data: eklectic,
            type : 'eklectic'
        })
    }
    
})

// @desc otpEklectic
// @route POST /vouchers/otp-eklectic
// @access User
const otpEklectic = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        competition_id: Joi.string().required(),
        type: Joi.string().required(),
        phone: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    let {
        competition_id,
        type,
        phone
    } = req.body;

    phone = phone.slice(-8);

    let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };

    let auth = await dataService.postWithParams(authUri, params, res)

    type = await getPhoneType(phone, auth, res);
    let alias = '';

    
    let season = await Season.findById(competition_id)
    if (!season) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }

    
    let offreid = 0;
    if (type === 'ooredoo') {
        offreid = 104;
    }else if (type === 'orange') {
        offreid = 164;
        alias = await getAlias(phone, auth, res);
    }else{
        offreid = 1;
    }
   
    //get ott
    if(type === 'telecom'){
        //linked phone
        let linkedPhone = await Dcb.findOne({
            user: {
                $ne: req.user._id
            },
            phone,
            status: 'active',
            offreid: offreid
        })
        if (linkedPhone) {
            res.status(400).json({
                message: "numéro liée avec un autre compte"
            });
            throw new Error("numéro liée avec un autre compte")
        }

        let uri = process.env.DCB_API_URI + 'api/ott';

        let data = {
            msisdn: phone,
            apikey: process.env.DCB_API_KEY
        }

   

        let response = await dataService.post(uri, encryptData(data))
        
        let dcb = await Dcb.create({
            user: req.user._id,
            phone: phone,
            offreid,
            code: response.data.token,
            status: 'pending',
            season: season._id
        })


        res.status(200).json({
            data: dcb,
            type : 'dcb'
        })

    }else{
        //linked phone
        let linkedPhone = await Eklectic.findOne({
            user: {
                $ne: req.user._id
            },
            offreid: {
                $in: [104, 164]
            },
            phone,
            status: 'active',
        })
        if (linkedPhone) {
            res.status(400).json({
                message: "numéro liée avec un autre compte"
            });
            throw new Error("numéro liée avec un autre compte")
        }

        let uri = 'https://payment.eklectic.tn/API/subscription/otp';
        let contentType = 'application/json';
        let authorization = "Bearer " + auth.access_token;



        let data = {
            msisdn: phone,
            offreid
        }

        let response = await dataService.postWithHeader(uri, data, contentType, authorization)

        let eklectic = await Eklectic.create({
            user: req.user._id,
            phone: phone,
            alias,
            offreid,
            code: response.code,
            status: 'pending',
            season: season._id
        })


        res.status(200).json({
            data: eklectic,
            type : 'eklectic'
        })
    }
    
})

// @desc validateEklectic
// @route POST /vouchers/validate-eklectic
// @access User
const validateEklectic = asyncHandler(async (req, res) => {
    //validate data
    const validationSchema = Joi.object({
        pin: Joi.string().required(),
        type: Joi.string().required(),
        id: Joi.string().required(),
    })
    await validationSchema.validateAsync(req.body);
    const {
        pin,
        type,
        id
    } = req.body;


    
    if(type === 'otp_diwan'){

        let dcb = await Dcb.findById(id)

        if (!dcb || dcb.status != 'pending') {
        
            res.status(400).json({
                message: "Un erreur s'est produite. veuillez réessayer plus tard!"
            });
            throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
        }

        let uri = process.env.DCB_API_URI + 'api/dailysub';

        let data = {
            apikey: process.env.DCB_API_KEY,
            offreId: dcb.offreid.toString(),
            token: dcb.code,
            code: pin,
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

    }
    else if(type === 'oneshot_diwan'){

        

        let dcb = await Dcb.findById(id)

        if (!dcb || dcb.status != 'pending') {
        
            res.status(400).json({
                message: "Un erreur s'est produite. veuillez réessayer plus tard!"
            });
            throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
        }

        let uri = process.env.DCB_API_URI + 'api/oneshot';

        let data = {
            apikey: process.env.DCB_API_KEY,
            offreId: dcb.offreid.toString(),
            token: dcb.code,
            code: pin,
            msisdn: dcb.phone.toString(),           
        }

       
   
        let response = await dataService.post(uri, encryptData(data));
       
    
        if (response.data.confirm && response.data.confirm === 'ok') {
            
                let update = { $set: { 
                    oneshotID: response.data.oneshotID, 
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

    }
    else{
        let eklectic = await Eklectic.findById(id)

        if (!eklectic || eklectic.status != 'pending') {
          
            res.status(400).json({
                message: "Un erreur s'est produite. veuillez réessayer plus tard!"
            });
            throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
        }
       
        
        let authUri = 'https://payment.eklectic.tn/API/oauth/token';
        let params = {
            "grant_type": "client_credentials",
            "client_id": process.env.EKLECTIC_CLIENT_ID,
            "client_secret": process.env.EKLECTIC_CLIENT_SK,
        };
    
        let auth = await dataService.postWithParams(authUri, params, res)
    
        let uri = '';
        let contentType = 'application/json';
        let authorization = "Bearer " + auth.access_token;
    
        if (type === 'otp') {
            uri = 'https://payment.eklectic.tn/API/subscription/confirm';
    
            let data = {
                msisdn: eklectic.phone,
                pin,
                code: eklectic.code,
                offreid: eklectic.offreid
            }
          
    
            let response = await dataService.postWithHeader(uri, data, contentType, authorization);
            console.log(response)
       
            if (response.confirm && response.user && response.confirm === 'ok') {
              
                let update = { $set: { 
                    subscriptionID: response.subscriptionID, 
                    subscriptionDate: response.user.subscription_date,
                    expireDate: response.user.expire_date,
                    lastStatusUpdate: response.user.last_status_update,
                    status : response.user.state.toLowerCase()
                } };   
            
                await Eklectic.updateOne(eklectic, update);
    
                if(response.user.state.toLowerCase() === 'active'){
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
            
        } 
        else if (type === 'oneshot') {
            uri = 'https://payment.eklectic.tn/API/subscription/oneshot';
    
            let data = {
                msisdn: eklectic.phone,
                pin,
                code: eklectic.code,
                offreid: eklectic.offreid
            }
    
            let response = await dataService.postWithHeader(uri, data, contentType, authorization);
        
            if (response.confirm && response.confirm === 'ok') {
    
                if(response.result &&  response.result.responseData){
                    let update = {
                        $set: {
                            oneshotID: response.result.responseData.transactionUUID,
                            status: 'active'
                        }
                    };
        
                    await Eklectic.updateOne(eklectic, update);
                    res.status(200).json({
                        data: "active"
                    })
                }
    
                else if(response.transaction &&  response.offreid && parseInt(response.offreid, 10) === 165){
                    let update = {
                        $set: {
                            oneshotID: response.transaction,
                            status: 'active'
                        }
                    };
        
                    await Eklectic.updateOne(eklectic, update);
                    res.status(200).json({
                        data: "active"
                    })
                }
    
                else {
                    res.status(200).json({
                        data: "fail"
                    })
                }
                
                
            }
    
            else if (response.confirm && response.confirm === 'ko' &&  response.result &&  response.result.responseData) {
                let update = {
                    $set: {
                        oneshotID: response.result.responseData.transactionUUID,
                        status: 'inactive'
                    }
                };
    
                await Eklectic.updateOne(eklectic, update);
                res.status(200).json({
                    data: "fail"
                })
            } 
            
            else {
                res.status(200).json({
                    data: "fail"
                })
            }
        }
    }

})

// @desc validateEklecticVoucher
// @route POST /vouchers/validate_elektic_voucher
// @access User
const validateEklecticVoucher = asyncHandler(async (req, res) => {

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

  

    let competition = await Competition.findById(competition_id)
    if (!competition) {
        res.status(400).json({
            message: "Un erreur s'est produite. veuillez réessayer plus tard!"
        });
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")
    }


    const hashedToken = await bcrypt.hash(code, process.env.VOUCHER_SALT)

    let eklecticRequest = await EklecticRequest.findOne({
        sk: hashedToken,
        status: true
    });
    if (!eklecticRequest || (!eklecticRequest.msisdn && !eklecticRequest.alias) || !eklecticRequest.offreid) {
        res.status(400).json({
            message: "Voucher non valide!"
        });
        throw new Error("Voucher non valide!")
    }

    let update = {
        $set: {
            status: false
        }
    };
    await EklecticRequest.updateOne(eklecticRequest, update);

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if(eklecticRequest.msisdn){
        let eklectic = await Eklectic.create({
            user: req.user._id,
            phone: eklecticRequest.msisdn,
            code: uuid.v4(),
            offreid: eklecticRequest.offreid,
            status: 'active',
            competition: competition._id
        })
    }else if(eklecticRequest.alias){
        let eklectic = await Eklectic.create({
            user: req.user._id,
            alias: eklecticRequest.alias,
            code: uuid.v4(),
            offreid: eklecticRequest.offreid,
            status: 'active',
            competition: competition._id
        })
    }

   

    res.status(200).json({
        data: "ok"
    })

})

// @desc manageEklectic
// @route GET /vouchers/manage-eklectic
// @access GUEST
const manageEklectic = asyncHandler(async (req, res) => {
    let eklectics = await Eklectic.find({
        status: 'active',
        offreid: {
            $in: [104, 110, 164]
        }
    })

    let inactiveklectics = await Eklectic.find({
        status: { "$ne": 'active' },
        offreid: {
            $in: [104, 110, 164]
        }
    })



   let authUri = 'https://payment.eklectic.tn/API/oauth/token';
    let params = {
        "grant_type": "client_credentials",
        "client_id": process.env.EKLECTIC_CLIENT_ID,
        "client_secret": process.env.EKLECTIC_CLIENT_SK,
    };
    let auth = await dataService.postWithParams(authUri, params, res);
    let uriOoredoo = 'https://payment.eklectic.tn/API/subscription/activelist?offreid=104';
    let uriOrange = 'https://payment.eklectic.tn/API/subscription/activelist?offreid=164';
    let contentType = 'application/json';
    let authorization = "Bearer " + auth.access_token;
    let responseOoredoo = await dataService.getWithHeader(uriOoredoo, contentType, authorization)
    let responseOrange = await dataService.getWithHeader(uriOrange, contentType, authorization)
    let userElevok = []
   
    if(responseOoredoo.length > 0 && responseOrange.length > 0){
        let eklecticData = responseOoredoo.concat(responseOrange)
    
       for (let eklectic of eklectics) {
            
            if(!eklecticData.includes(eklectic.subscriptionID)){
               
                let update = {
                    $set: {
                        status : 'inactive'
                    }
                };
                await Eklectic.updateOne(eklectic, update);
            }else{
                if(!userElevok.includes(eklectic.user)){
                     userElevok.push(eklectic.user)
                }            
               
            }
        }
    
    
        for (let inactiveklectic of inactiveklectics) {
            if(eklecticData.includes(inactiveklectic.subscriptionID)){
                let update = {
                    $set: {
                        status : 'active',
                        treated: false
                    }
                };
                await Eklectic.updateOne(inactiveklectic, update);
            } 
            
        }
    }

    /*for(let userElev of userElevok){
        //wait 100ms
        await new Promise(resolve => setTimeout(resolve, 100));
        elevokService.push({
            user:userElev,
            amount: 0.45,
        })
    }*/

    res.status(200).json({
        count:{
            ooredoo: responseOoredoo.length,
            orange: responseOrange.length,
        },
        data: {
            responseOoredoo,
            responseOrange
        }
    })
})

// @desc handleEklectic
// @route GET /vouchers/handle_eklectic
// @access GUEST
const handleEklectic = asyncHandler(async (req, res) => {
  
    let {action, subscriptionid, transaction, amount, offreid, canal, msisdn, ise2, date} = req.query;

    if(msisdn){
        msisdn = msisdn.slice(-8);
    }

    // case 1 unsub 
    if(subscriptionid && action.toLowerCase() === 'unsub'){       

        //find subscription
        let eklectics = await Eklectic.find({
            subscriptionID: subscriptionid,
            offreid
        });
        if(eklectics.length === 0){
            res.status(404).json({
                message: "subscriptionID not found!"
            });
            throw new Error("subscriptionID not found!")
        }

        //update sub
        let  update = { $set: { 
            status : "inactive"
        }};   

        for(let eklectic of eklectics){
            await Eklectic.updateOne(eklectic, update);
        }

        res.status(200).json({
            data: "ok"
        })

        return;
    }

    // case 2 renew 
    if(subscriptionid && action.toLowerCase() === 'renew'){       

        let eklectic = await Eklectic.findOne({
            subscriptionID: subscriptionid, 
            offreid: parseInt(offreid, 10)
        })

        if(!eklectic){
            res.status(400).json({
                message: "subscriptionid non trouvé"
            });
            throw new Error("subscriptionid non trouvé")

        }

        let update = {
            $set: {
                expireDate: addDays(new Date(date), 1),
                status: 'active',
            }
        };
        await Eklectic.updateOne(eklectic, update);

        res.status(200).json({
            data: "ok"
        })

        return;
    }

    // fail case no canal
    if(!canal){
        res.status(500).json({
            message: "Unknown Canal!"
        });
        throw new Error("Unknown Canal!")
    }  

    // case 3.1 online canal && otp && ooredoo
    if(canal.toLowerCase() === 'online' && subscriptionid && parseInt(offreid, 10) === 104 ){

        //find target request 
        let eklectic = await Eklectic.findOne({
            subscriptionID: subscriptionid,
            offreid
        });

        let eklectic1 = await Eklectic.findOne({
            phone: msisdn,
            offreid
        });

        //case 1 from app
        if(eklectic || eklectic1){
             //update target request 
                let update;
                if(action.toLowerCase() === 'sub'){

                    //update user state
                    update = { $set: { 
                        status : "active",
                        expireDate: addDays(new Date(date), 1)
                    }};       
                    if(eklectic){
                        await Eklectic.updateOne(eklectic, update);
                    }           
                    

                                                        
                }
                else{
                    update = { $set: { 
                        status : "inactive"
                    } };               
                    if(eklectic){
                        await Eklectic.updateOne(eklectic, update);
                    }        
                }

                //send notif to user
                let msg;
                if(eklectic){
msg = `Vous voilà Re-inscrit au service Diwan sport.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
MDP : cliquez sur mot de passe oublié
Pour gérer votre abonnement composez *177#`;
} else{
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du Football Tunisien à 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Pour gérer votre abonnement composez *177#`;
}
                let notifData = {
                    subscriptionId: subscriptionid,
                    sc: "",
                    message: msg,
                    offreid
                }

                await sendSmsBySubId(notifData, res)

                res.status(200).json({
                    data: "ok"
                })

                return; 
        }else{
            // case 2 from landing page

            //user exist 
            let existUser = await User.findOne({
                role: 'local-user',
                identifier: msisdn
            }) 

            let existUserId = null;

            //generate and hash
            let password = makePassCode(8);
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

            let status = 'pending';  
            if(action.toLowerCase() === 'sub'){
                status = "active";
            }
            else{
                status = "inactive";
            }

            let season =  await Season.findOne()

            let eklectic = await Eklectic.create({
                user: existUserId,
                phone: msisdn,
                offreid,
                code: 'landingpage-subscribtion',
                status,
                season: season._id,
                subscriptionID: subscriptionid, 
                subscriptionDate: date,
                expireDate: addDays(new Date(date), 1),
                lastStatusUpdate: date,
            })

            //send notif to user
            let msg;
            if(action.toLowerCase() === 'sub' && !transaction){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 1er jour gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
Mot de passe : ${password}
Pour gérer votre abonnement composez *177#`;
            }else{
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du Football Tunisien à 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
Mot de passe : ${password}
Pour gérer votre abonnement composez *177#`;
            }

            
            let notifData = {
                subscriptionId: subscriptionid,
                sc: "",
                message: msg,
                offreid
            }

            await sendSmsBySubId(notifData, res)

            res.status(200).json({
                data: "ok"
            })

            return;
        }        
    }

    // case 3.2 online canal && otp && orange
    if(canal.toLowerCase() === 'online' && subscriptionid && parseInt(offreid, 10) === 164 ){

        //find target request 
        let eklectic = await Eklectic.findOne({
            subscriptionID: subscriptionid,
            offreid
        });

        let eklectic1 = await Eklectic.findOne({
            phone: msisdn,
            offreid
        });
       
        //case 1 from app
        if(eklectic || eklectic1){
             //update target request 
                let update;
                if(action.toLowerCase() === 'sub' ){

                    //update user state
                    update = { $set: { 
                        status : "active",
                        expireDate: addDays(new Date(date), 1)
                    }}; 
                                     
                    if(eklectic){
                        await Eklectic.updateOne(eklectic, update);
                    }                                                         
                }
                else{
                    update = { $set: { 
                        status : "inactive"
                    } };               
                    if(eklectic){
                        await Eklectic.updateOne(eklectic, update);
                    }   
                }

                //send notif to user
                let msg;
                if(eklectic){
msg = `Vous voilà Re-inscrit au service Diwan sport.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
MDP : cliquez sur mot de passe oublié`;
            
                    let notifData = {
                        subscriptionId: subscriptionid,
                        sc: "",
                        message: msg,
                        offreid
                    }

                    await sendSmsBySubId(notifData, res)

                    res.status(200).json({
                        data: "ok"
                    })
                    return; 
                }else{
                    res.status(200).json({
                        data: "ok"
                    })
                    return; 
                }
      
        }else{
            // case 2 from landing page

            //user exist 
            let existUser = await User.findOne({
                identifier: 'diwan'+subscriptionid,
                role: 'local-user'
            }) 

            let existUserId = null;           

            //generate and hash
            let password = makePassCode(8);
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)

            if(!existUser){

                // register user        
                let newUser = await User.create({
                    identifier: 'diwan'+subscriptionid,
                    alias: ise2,
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

            let status = 'pending';  
            if(action.toLowerCase() === 'sub'){
                status = "active";
            }
            else{
                status = "inactive";
            }

            let season =  await Season.findOne()

            let eklectic = await Eklectic.create({
                user: existUserId,
                phone: msisdn,
                alias: ise2,
                offreid,
                code: 'landingpage-subscribtion',
                status,
                season: season._id,
                subscriptionID: subscriptionid, 
                subscriptionDate: date,
                expireDate: addDays(new Date(date), 1),
                lastStatusUpdate: date,
            })

            //send notif to user
            let msg;
            if(action.toLowerCase() === 'sub' && !transaction){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 1er jour gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
Mot de passe : ${password}`;
            }else{
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du Football Tunisien à 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
Mot de passe : ${password}`;
            }

            
            let notifData = {
                subscriptionId: subscriptionid,
                sc: "",
                message: msg,
                offreid
            }

            await sendSmsBySubId(notifData, res)

            res.status(200).json({
                data: "ok"
            })

            return;
        }        
    }

    // case 4.1 offline canal && otp && ooredoo
    if(canal.toLowerCase() === 'offline' && subscriptionid && parseInt(offreid, 10) === 104 ){
        //linked phone
        let linkedPhone = await Eklectic.findOne({
            phone: msisdn,
            status: 'active',
            offreid: parseInt(offreid, 10)
        })
        if (linkedPhone) { 

            console.log(linkedPhone)
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
        let password = makePassCode(8);
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

        let status = 'pending';  
        if(action.toLowerCase() === 'sub'){
            status = "active";
        }
        else{
            status = "inactive";
        }

        let season =  await Season.findOne()

        let eklectic = await Eklectic.create({
            user: existUserId,
            phone: msisdn,
            offreid,
            code: 'offline-subscribtion',
            status,
            season: season._id,
            subscriptionID: subscriptionid, 
            subscriptionDate: date,
            expireDate: addDays(new Date(date), 1),
            lastStatusUpdate: date,
        })

        //send notif to user
        let msg;
        if(action.toLowerCase() === 'sub' && !transaction){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 1er jour gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
Mot de passe : ${password}
Pour gérer votre abonnement composez *177#`;
        }else{
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du Football Tunisien à 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
Mot de passe : ${password}
Pour gérer votre abonnement composez *177#`;
        }
            
        let notifData = {
            subscriptionId: subscriptionid,
            sc: "",
            message: msg,
            offreid
        }

        await sendSmsBySubId(notifData, res)

        res.status(200).json({
            data: "ok"
        })

        return;

    }

    // case 4.2 offline canal && otp && orange
    if(canal.toLowerCase() === 'offline' && subscriptionid && parseInt(offreid, 10) === 164 ){
        //linked phone
        let linkedPhone = await Eklectic.findOne({
            alias: ise2,
            status: 'active',
            offreid: parseInt(offreid, 10)
        })
        if (linkedPhone) { 

            res.status(400).json({
                message: "numéro liée avec un autre compte"
            });
            throw new Error("numéro liée avec un autre compte")
        }

        //user exist 
        let existUser = await User.findOne({
            identifier: 'diwan'+subscriptionid,
            role: 'local-user'
        }) 

        let existUserId = null;

        //generate and hash
        let password = makePassCode(8);
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if(!existUser){
        
            // register user        
            let newUser = await User.create({
                identifier: 'diwan'+subscriptionid,
                alias: ise2,
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

        let status = 'pending';  
        if(action.toLowerCase() === 'sub'){
            status = "active";
        }
        else{
            status = "inactive";
        }

        let season =  await Season.findOne()

        let eklectic = await Eklectic.create({
            user: existUserId,
            phone: msisdn,
            alias: ise2,
            offreid,
            code: 'offline-subscribtion',
            status,
            season: season._id,
            subscriptionID: subscriptionid, 
            subscriptionDate: date,
            expireDate: addDays(new Date(date), 1),
            lastStatusUpdate: date,
        })

        //send notif to user
        let msg;
        if(action.toLowerCase() === 'sub' && !transaction){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 1er jour gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
Mot de passe : ${password}`;
        }else{
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du Football Tunisien à 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
Mot de passe : ${password}`;
        }
            
        let notifData = {
            subscriptionId: subscriptionid,
            sc: "",
            message: msg,
            offreid
        }

        await sendSmsBySubId(notifData, res)

        res.status(200).json({
            data: "ok"
        })

        return;

    }

    // case 5 offline canal && oneshot
    if(canal.toLowerCase() === 'offline' && (parseInt(offreid, 10) === 105 || parseInt(offreid, 10) === 165 ) ){
        //verif if already treated
        let oldTrans = await EklecticRequest.findOne({
            action, 
            transactionID: transaction,
            offreid
        })  
        if(oldTrans){
            res.status(500).json({
                message: "Already used transactionID !"
            });
            throw new Error("Already used transactionID !")
        }

        if(action.toLowerCase() === 'charge'){
            //one shot
            let rng = new rngGenerator();

            let eclectic = null;
            do {
                val1 = (rng.next() % 9)+1
                token  = val1.toString();
                for(let i =0; i < 15; i++){
                    token = token + (rng.next() % 10);
                }
                val2 = (rng.next() % 9)+1
                serie  = val2.toString();
                for(let j =0; j < 5; j++){
                    serie = serie + (rng.next() % 10);
                } 
                let landing = await extractNumber(token)
                const hashedToken = await bcrypt.hash(token, process.env.VOUCHER_SALT)

                //verif unique voucher
                let exist = await EklecticRequest.findOne({sk: hashedToken})
                if(!exist){                   
                
//send user notif
let msg = `Profitez du visionnage de votre match souhaité, veuillez saisir le code suivant : ${token}.
RDV sur  https://diwansport.com/` ;
                    
                    let notifData;
                    
                    if(parseInt(offreid, 10) === 105 ){
                        notifData = {
                            msisdn,
                            sc: "",
                            message: msg,
                            offreid
                        }
                    }else if(parseInt(offreid, 10) === 165 ){
                        notifData = {
                            ISE2: ise2,
                            sc: "",
                            message: msg,
                            offreid
                        }
                    }
           
                   
                    await sendSmsBySms(notifData, res)
                    
                    //save request
                    await EklecticRequest.create({
                        action: action.toLowerCase(),
                        subscriptionID: subscriptionid,
                        transactionID: transaction,
                        offreid,
                        amount,
                        msisdn,
                        alias: ise2,
                        date,
                        sk: hashedToken, 
                        landing, 
                        status: true 
                    })

                    res.status(200).json({
                        data: "ok"
                    })
            
                    return;
                
                }
                
            
            } while (!eclectic);
        }


    }

    // case 6.1 monthly && ooredoo
    if(1===2 && (parseInt(offreid, 10) === 104 || parseInt(offreid, 10) === 105) ){
        //linked phone
        let linkedPhone = await Eklectic.findOne({
            phone: msisdn,
            status: 'active',
            offreid: parseInt(offreid, 10)
        })
        if (linkedPhone) { 

            console.log(linkedPhone)
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
        let password = makePassCode(8);
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

        let eklectic = await Eklectic.create({
            user: existUserId,
            phone: msisdn,
            offreid,
            code: 'monthly-plan',
            status: 'active',
            season: season._id,
            subscriptionID: subscriptionid, 
            subscriptionDate: date,
            expireDate: addDays(new Date(date), 1),
            lastStatusUpdate: date,
        })

        //send notif to user
        let msg;
        if(1===1){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 30 jours gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : ${msisdn}
Mot de passe : ${password}
Pour gérer votre abonnement composez *177#`;
        }
            
        let notifData = {
            subscriptionId: subscriptionid,
            sc: "",
            message: msg,
            offreid
        }

        await sendSmsBySubId(notifData, res)

        res.status(200).json({
            data: "ok"
        })

        return;

    }

    // case 6.2 monthly && orange
    if(canal.toLowerCase() === 'online' && subscriptionid  && parseInt(offreid, 10) === 260 ){
        //linked phone
        let linkedPhone = await Eklectic.findOne({
            alias: ise2,
            status: 'active',
            offreid: parseInt(offreid, 10)
        })
        if (linkedPhone) { 

            res.status(400).json({
                message: "numéro liée avec un autre compte"
            });
            throw new Error("numéro liée avec un autre compte")
        }

        //user exist 
        let existUser = await User.findOne({
            identifier: 'diwan'+subscriptionid,
            role: 'local-user'
        }) 

        let existUserId = null;

        //generate and hash
        let password = makePassCode(8);
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if(!existUser){
        
            // register user        
            let newUser = await User.create({
                identifier: 'diwan'+subscriptionid,
                alias: ise2,
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

        let eklectic = await Eklectic.create({
            user: existUserId,
            phone: msisdn,
            alias: ise2,
            offreid,
            code: 'monthly-plan',
            status: 'active',
            season: season._id,
            subscriptionID: subscriptionid, 
            subscriptionDate: date,
            expireDate: addDays(new Date(date), 1),
            lastStatusUpdate: date,
        })

        //send notif to user
        let msg;
        if(1===1){
msg = `Bienvenue au service Diwan SPORT. Profitez de tous les matches du football Tunisien. 30 jours gratuit puis 0.45 DT/j.
Accédez au service ici https://diwansport.com/.
Login : diwan${subscriptionid}
Mot de passe : ${password}`;
        }
            
        let notifData = {
            subscriptionId: subscriptionid,
            sc: "",
            message: msg,
            offreid
        }

        await sendSmsBySubId(notifData, res)

        res.status(200).json({
            data: "ok"
        })

        return;

    }

    res.status(200).json({
        data: "ok"
    })
})
// @desc updateAuthorisation
// @route GET /crontask/update_authorisation
// @access PUBLIC
const updateAuthorisation = asyncHandler(async (req, res) => {
    let sells = await Sell.find({ treated: { "$ne": true }, status: 'success' })
    for (let sell of sells) {
        if (sell.season) {
            targetVoucher = await Voucher.findById(sell.voucher)
     
            if(targetVoucher && targetVoucher.type === 'monthly-season'){
               
                const elevenMonthsAgo = new Date();
                elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
                await Authorisation.create({
                    user: sell.user,
                    target: '64decdebc70a79ad95011ac7',
                    type: 'sells',
                    ref: sell._id,
                    createdAt: elevenMonthsAgo
                })

            }else{
                await Authorisation.create({
                    user: sell.user,
                    target: '64decdebc70a79ad95011ac7',
                    type: 'sells',
                    ref: sell._id
                })
            }
        }
        else if(sell.competition){
            await Authorisation.create({
                user: sell.user,
                target: sell.competition,
                type: 'sells',
                ref: sell._id
            })
           
        }


        sellUpdate = { $set: { treated: true } };
        await Sell.updateOne(sell, sellUpdate);
    }

    let orders = await Order.find({ treated: { "$ne": true }, status: 'success' })
    for (let order of orders) {
        if (order.season) {
            await Authorisation.create({
                user: order.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'orders',
                ref: order._id
            })
           /* elevokService.push({
                user: order.user,
                amount: 30,
            })*/
        }
        else if (order.league) {
            await Authorisation.create({
                user: order.user,
                target: order.league,
                type: 'orders',
                ref: order._id
            })
        }
        else if (order.team) {
            await Authorisation.create({
                user: order.user,
                target: order.team,
                type: 'orders',
                ref: order._id
            })
        }
        else if (order.competition) {
            await Authorisation.create({
                user: order.user,
                target: order.competition,
                type: 'orders',
                ref: order._id
            })
           /* elevokService.push({
                user: order.user,
                amount: 4.5,
            })*/
        }

        orderUpdate = { $set: { treated: true } };
        await Order.updateOne(order, orderUpdate);
    }

    let konnectOrders = await KonnectOrder.find({ treated: { "$ne": true }, status: 'success' })
    for (let konnectOrder of konnectOrders) {
        if (konnectOrder.season) {
            await Authorisation.create({
                user: konnectOrder.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'konnect',
                ref: konnectOrder._id
            })
           /* elevokService.push({
                user: konnectOrder.user,
                amount: 40,
            })*/
        }
        else if (konnectOrder.league) {
            await Authorisation.create({
                user: konnectOrder.user,
                target: konnectOrder.league,
                type: 'konnect',
                ref: konnectOrder._id
            })
        }
        else if (konnectOrder.team) {
            await Authorisation.create({
                user: konnectOrder.user,
                target: konnectOrder.team,
                type: 'konnect',
                ref: konnectOrder._id
            })
        }
        else if (konnectOrder.competition) {
            await Authorisation.create({
                user: konnectOrder.user,
                target: konnectOrder.competition,
                type: 'konnect',
                ref: konnectOrder._id
            })
           /* elevokService.push({
                user: konnectOrder.user,
                amount: 4.5,
            })*/
        }

        konnectOrderUpdate = { $set: { treated: true } };
        await KonnectOrder.updateOne(konnectOrder, konnectOrderUpdate);
    }

    let elevokOrders = await ElevokOrder.find({ treated: { "$ne": true }, status: 'success' })
    for (let elevokOrder of elevokOrders) {
        if (elevokOrder.season) {
            await Authorisation.create({
                user: elevokOrder.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'elevok',
                ref: elevokOrder._id
            })
        }
        else if (elevokOrder.competition) {
            await Authorisation.create({
                user: elevokOrder.user,
                target: elevokOrder.competition,
                type: 'elevok',
                ref: elevokOrder._id
            })
        }

        elevokOrderUpdate = { $set: { treated: true } };
        await ElevokOrder.updateOne(elevokOrder, elevokOrderUpdate);
    }

    let appleOrders = await appleOrder.find({ treated: { "$ne": true }, status: 'success' })
    for (let apple of appleOrders) {
        if (apple.season) {
            await Authorisation.create({
                user: apple.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'appleOrders',
                ref: apple._id
            })
           /* elevokService.push({
                user: apple.user,
                amount: 40,
            })*/
        }

        else if (apple.competition) {
            await Authorisation.create({
                user: apple.user,
                target: apple.competition,
                type: 'appleOrders',
                ref: apple._id
            })
           /* elevokService.push({
                user: apple.user,
                amount: 4.5,
            })*/
        }


        appleOrderUpdate = { $set: { treated: true } };
        await appleOrder.updateOne(apple, appleOrderUpdate);
    }

    let eklectics = await Eklectic.find({ treated: { "$ne": true }, status: 'active' })
    for (let eklectic of eklectics) {
        if(eklectic.code && eklectic.code === 'monthly-plan'){
            const elevenMonthsAgo = new Date();
            elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
            await Authorisation.create({
                user: eklectic.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'eklectics',
                ref: eklectic._id,
                createdAt: elevenMonthsAgo
            })
        }else{
            if (eklectic.season) {
                await Authorisation.create({
                    user: eklectic.user,
                    target: '64decdebc70a79ad95011ac7',
                    type: 'eklectics',
                    ref: eklectic._id
                })
            }
            else if (eklectic.competition) {
                await Authorisation.create({
                    user: eklectic.user,
                    target: eklectic.competition,
                    type: 'eklectics',
                    ref: eklectic._id
                })
            }
        }
       

        eklecticUpdate = { $set: { treated: true } };
        await Eklectic.updateOne(eklectic, eklecticUpdate);
    }

    let dcbs = await Dcb.find({ treated: { "$ne": true }, status: 'active' })
    for (let dcb of dcbs) {
        if (dcb.season) {
            await Authorisation.create({
                user: dcb.user,
                target: '64decdebc70a79ad95011ac7',
                type: 'dcbs',
                ref: dcb._id
            })
           /* elevokService.push({
                user: dcb.user,
                amount: 0.45,
            })*/
        }
        else if (dcb.team) {
            await Authorisation.create({
                user: dcb.user,
                target: dcb.team,
                type: 'dcbs',
                ref: dcb._id
            })
           /* elevokService.push({
                user: dcb.user,
                amount: 0.25,
            })*/
        }
        else if (dcb.competition) {
            await Authorisation.create({
                user: dcb.user,
                target: dcb.competition,
                type: 'dcbs',
                ref: dcb._id
            })
           /* elevokService.push({
                user: dcb.user,
                amount: 4.5,
            })*/
        }


        dcbUpdate = { $set: { treated: true } };
        await Dcb.updateOne(dcb, dcbUpdate);
    }



    let stopEklectics = await Eklectic.find({ treated: true, status: { "$ne": 'active' } })
    for (let stopEklectic of stopEklectics) {
        await Authorisation.remove({ type: 'eklectics', ref: stopEklectic._id });
        stopEklecticUpdate = { $set: { treated: false } };
        await Eklectic.updateOne(stopEklectic, stopEklecticUpdate);
    }

    let stopDcbs = await Dcb.find({ treated: true, status: { "$ne": 'active' } })
    for (let stopDcb of stopDcbs) {
        await Authorisation.remove({ type: 'dcbs', ref: stopDcb._id });
        stopDcbUpdate = { $set: { treated: false } };
        await Dcb.updateOne(stopDcb, stopDcbUpdate);
    }


    res.status(200).json({ data: 'ok' })
})

//intern
const getMyStatus = async (req) => {


    if(!req.user || !req.user.id || !req.user._id){       
        throw new Error("Un erreur s'est produite. veuillez réessayer plus tard!")  
    }

    let auths = await Authorisation.find({user: req.user._id}).maxTimeMS(process.env.MAX_MONGO_TIMEOUT);  
    
    let myAuthorizations = [];
    for(let auth of auths){
        if(auth.target.toString() === '64decdebc70a79ad95011ac7' && !myAuthorizations.includes('68dd84be3d6dfc2545d11967')){
            myAuthorizations.push('68dd84be3d6dfc2545d11967')
        }
        if(!myAuthorizations.includes(auth.target.toString())){
            myAuthorizations.push(auth.target.toString())
         }
    }
    return myAuthorizations;
}
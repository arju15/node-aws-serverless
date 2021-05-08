'use strict';
const stripe = require("stripe")(process.env.STRIPE_KEY); //this key should be the private key
const Joi = require('joi');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');

const validate = async function (body) {

    const schema = Joi.object().keys({
        gateway_id: Joi.string(),
        plan_id: Joi.string().required(),
        old_plan_id: Joi.string(),
        user_id: Joi.number().required(),
        token: Joi.string(),
        id: Joi.string(),
        amount: Joi.number().required(),
        description: Joi.string().required(),
        subscription: Joi.boolean(),
        coupon: Joi.string(),
        times_redeemed: Joi.number()
    });

    return new Promise((resolve, reject) => {

        Joi.validate(body, schema, {
            abortEarly: false
        }, function (err, value) {

            if (err) {
                reject(err);
            } else {
                resolve(value);
            }

        });

    });
}

const createCustomer = async function (apiData) {
    return stripe.customers.create({
        description: apiData.description,
        metadata: {
            "user": apiData.user_id
        },
        source: apiData.token
    });
}

//for charging customer
const createCharge = async function (apiData, customerId) {
    let data = {
        amount: (apiData.amount * 100),
        currency: 'usd',
        description: apiData.description
    };
    if (customerId) {
        data.customer = customerId;
    } else {
        data.source = apiData.token;
    }
    let finalResponse = null;
    return Promise.resolve()
        .then(() => {
            if (apiData.amount > 0) {
                return stripe.charges.create(data);
            } else {
                return Promise.resolve({
                    customer: customerId
                });
            }
        })
        .then((response) => {
            finalResponse = response;
            if (apiData.coupon) {
                let updateData = {
                    metadata: {
                        times_redeemed: (apiData.times_redeemed) || 1
                    }
                };
                return stripe.coupons.update(apiData.coupon, updateData);
            } else {
                return Promise.resolve(response);
            }
        })
        .then(res => {
            console.log('coupon updated', res);
            return Promise.resolve(finalResponse);
        });

};

const updateSubscription = async function (apiData, customerId) {
    console.log('Inside updateSubscription');
    let couponVar = null;
    if (apiData.coupon && apiData.coupon.trim() != '') {
        couponVar = apiData.coupon;
    }
    let subscriptions = await stripe.subscriptions.list({
        customer: customerId
    });
    if (subscriptions && subscriptions.data.length > 0) {
        let sub_id = subscriptions.data[0].id;
        let item_id = subscriptions.data[0]["items"]["data"][0].id;
        console.log(item_id);
        
        return stripe.subscriptions.update(sub_id, {
            items: [{
                id: item_id,
                plan: apiData.plan_id
            }],
            coupon: couponVar
        });
    } else {
        return Promise.reject({
            'status_code': 400,
            'message': 'You are not subscribed to this plan'
        });
    }
};

const updateCustomer = async function(apiData,customerId){
    if('token' in apiData && apiData.token){
        console.log('Updating customer card');
        await stripe.customers.update(customerId,
            {
            source: apiData.token,
            });
    }
};

const createSubscription = async function (apiData, customerId) {
    console.log('Inside createSubscription');
    let subscription = {
        customer: customerId,
        items: [{
            plan: apiData.plan_id,
        }, ]
    };
    if (apiData.coupon && apiData.coupon.trim() != '') {
        subscription.coupon = apiData.coupon;
    }
    return stripe.subscriptions.create(subscription);
};

// This function is used to update payment gateway in QB
const updatePaymentGateway = async (customerID, apiData, QBtoken) => {
    console.log('Inside updatePaymentGateway');
    let user = await utils.verifyUser(QBtoken);
    let updateUserPaymentBody = {
        gateway_id: customerID,
        _user_id: apiData.user_id
    };

    if(apiData.plan_id == 'basic' || apiData.plan_id == 'unlimited'){
        updateUserPaymentBody.current_plan_id = apiData.plan_id;
    }

    if ('token' in apiData && apiData.token) {
        // Get the token details for last 4 
        let tokenDetails = await stripe.tokens.retrieve(apiData.token);
        console.log('tokenDetails',tokenDetails);
        if (tokenDetails && 'card' in tokenDetails && tokenDetails.card) {
            updateUserPaymentBody.last4 = tokenDetails.card.last4;
        }
    }
        console.log('Creating ',updateUserPaymentBody);
        await DBManager.dataInsert('user_payment_gateway', updateUserPaymentBody);
        response = { success: true, message: 'Details saved'};
        console.log(response);
};

module.exports.handler = async (event, context, callback) => {
    let apiData = JSON.parse(event.body);

    try {
        await validate(apiData);

        //for checking if the user is new or we have the customer id
        let customerID = null;
        if (!apiData.gateway_id) {
            let customerIdResponse = await createCustomer(apiData);
            console.log("customerIdResponse: ", customerIdResponse)
            if (customerIdResponse) {
                customerID = customerIdResponse.id;
            }
        } else {
            customerID = apiData.gateway_id;
            await updateCustomer(apiData,customerID);
        }


        let response = {
            "message": "Payment is successful",
            'customerID': customerID
        };
        if (apiData.subscription) {
            if (!apiData.old_plan_id) {
                // Create the subscription
                await createSubscription(apiData, customerID);
            } else {
                await updateSubscription(apiData, customerID);
            }
            
        } else {
            await createCharge(apiData, customerID);
        }

        await updatePaymentGateway(customerID, apiData, event.headers.Authorization);

        console.log('response', response);
        return awsRequestHelper.respondWithJsonBody(200, response);

    } catch (err) {
        console.log('Inside error', err);
        return awsRequestHelper.respondWithSimpleMessage(500, err.message);
    }
};
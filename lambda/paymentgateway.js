const awsRequestHelper = require('./common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    console.log('Got Event::',JSON.stringify(event));
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/user/{id}/billinghistory':
            const billinghistoryHandler = require('./getBillingHistory');
            return await billinghistoryHandler.handler(event,context,callback);
        case '/user/{id}/card':
            const cardHandler = require('./addcard');
            return await cardHandler.handler(event,context,callback);
        case '/user/{id}/completetransaction':
            const completeTraxHandler = require('./completePayment');
            return await completeTraxHandler.handler(event,context,callback);
        case '/user/unsubscribestripe':
            const unsubscribeStripeHandler = require('./unsubscribeStripe');
            return await unsubscribeStripeHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/billing/{id}/billingHistory':
            const billingHistoryHandler = require('./getBillingHistory');
            return await billingHistoryHandler.handler(event,context,callback);
        case '/users/getPlans':
            const myPlansHandler = require('./getPlan');
            return await myPlansHandler.handler(event,context,callback);
        case '/users/getGatewayId' :
            const getGatewayIdHandler = require('./getGatewayId');
            return await getGatewayIdHandler.handler(event,context,callback);
        case '/users/{id}/card':
            const cardHandler = require('./addcard');
            return await cardHandler.handler(event,context,callback);
        case '/users/{id}/completetransaction':
            const completeTraxHandler = require('./completePayment');
            return await completeTraxHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
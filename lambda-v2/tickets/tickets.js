const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/ticket/getAllTickets':
            const allTicketsHandler = require('./allTickets');
            return await allTicketsHandler.handler(event,context,callback);
        case '/ticket/{ticket_id}':
            const ticketdetailsHandler = require('./ticketDetails');
            return await ticketdetailsHandler.handler(event,context,callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/event/add':
            const addEvent = require('./addEvent');
            return await addEvent.handler(event,context,callback);
        case '/event/list':
            const getEvents = require('./getEvents');
            return await getEvents.handler(event,context,callback);
        case '/event/updateAddress':
            const updateAddressHandler = require('./updateAddress');
            return await updateAddressHandler.handler(event,context,callback);
        case '/event/goingUsersInEvent':
            const goingUsersInEventHandler = require('./userGoingEvent');
            return await goingUsersInEventHandler.handler(event,context,callback);
        case '/event/getUpcoming':
            const getupcomingHandler = require('./getUpcoming');
            return await getupcomingHandler.handler(event,context,callback);
        case '/event/getPast':
            const getPastHandler = require('./getPast');
            return await getPastHandler.handler(event,context,callback); 
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
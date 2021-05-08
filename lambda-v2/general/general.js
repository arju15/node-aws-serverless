const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/general/postFeedback':
            const postFeedbackHandler = require('./postFeedback');
            return await postFeedbackHandler.handler(event,context,callback);
        
        case '/general/getNotification':
            const getNotificationHandler = require('./getNotification');
            return await getNotificationHandler.handler(event,context,callback);
        
        case '/general/getAllUser':
            const allUserHandler = require('./getAllUser');
            return await allUserHandler.handler(event,context,callback);

        case '/general/searchUser':
            const searchUserHandler = require('./searchUser');
            return await searchUserHandler.handler(event,context,callback);

        case '/general/pushNotification':
            const pushNotificationHandler = require('./pushNotification');
            return await pushNotificationHandler.handler(event,context,callback);

        case '/general/getEventCategories':
            const getEventCategoriesHandler = require('./getEventCategories');
            return await getEventCategoriesHandler.handler(event,context,callback);
         
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
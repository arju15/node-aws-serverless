const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch(resource){
        case '/auth/login':
            const loginHandler = require('./login');
            return await loginHandler.handler(event,context,callback);
        case '/auth/register':
            const registerHandler = require('./register');
            return await registerHandler.handler(event,context,callback);
        case '/auth/changepassword':
            const changePasswordHandler = require('./changePassword');
            return await changePasswordHandler.handler(event,context,callback);
        case '/auth/forgotpassword':
            const forgotPasswordHandler = require('./forgotPassword');
            return await forgotPasswordHandler.handler(event,context,callback);
        case '/auth/logout':
            const logoutHandler = require('./logout');
            return await logoutHandler.handler(event,context,callback);
        case '/auth/resetpassword':
            const resetPasswordHandler = require('./resetPassword');
            return await resetPasswordHandler.handler(event,context,callback);
    
    }
    return awsRequestHelper.respondWithSimpleMessage(500,'Unable to serve request.Contact administrator');
}
const AWS = require('aws-sdk');
const ses = new AWS.SES({region:'eu-west-1'});

exports.sendEmail = async function(to,body,subject,from) {
    let eParams = {
        Destination: { /* required */
            ToAddresses: to
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body
                },

            },
            Subject: {
                Data: subject
            }
        },
        Source: (from || 'Donotreply@thepromoapp.com')
    };

    console.log('===SENDING EMAIL===', eParams);
    await ses.sendEmail(eParams).promise();
}
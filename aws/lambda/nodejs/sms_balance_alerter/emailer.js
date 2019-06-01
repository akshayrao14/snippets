var aws = require('aws-sdk');
var ses = new aws.SES({
   region: 'us-east-1'
});

exports.send_email = function(mail_opts) {
    var eParams = {
        Destination: {
            ToAddresses: mail_opts.to,
            BccAddresses: mail_opts.bcc || [],
        },
        Message: {
            Body: {
                Text: {
                    Data: mail_opts.text
                }
            },
            Subject: {
                Data: mail_opts.subject
            }
        },
        Source: mail_opts.from
    };

    console.log('===SENDING EMAIL===');
    var email = ses.sendEmail(eParams, function(err, data){
        if(err) console.log(err);
        else {
            console.log("===EMAIL SENT===");
            console.log(data);


            console.log("EMAIL CODE END");
            console.log('EMAIL: ', email);

        }
    });

};
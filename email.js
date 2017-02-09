var nodemailer = require('nodemailer');
var config = require('./config');

var Email = (function(){
    var mailerOptions;
    if(config.port == 587) {
        mailerOptions = {
            transport: "SMTP",
            //host: 'xxx',
            //port: 587,
            secure: false,
            requireTLS: true,
            ignoreTLS:false,
            requiresAuth: true,
            authMethod:'NTLM',
            // auth: {
            //     user: 'xxx@xxx.com',
            //     pass: 'xxx'
            // },
            tls: {rejectUnauthorized: false},
            //debug:true
            debug:false
        };
    }else{
        mailerOptions = {
            transport: "SMTP",
            secure: true,
            requiresAuth: true,
            debug:false
        };
    }

    var _email = function(host, port, authUser, authPass){
        mailerOptions.host = host;
        mailerOptions.port = port;
        mailerOptions.auth = {
            user: authUser,
            pass: authPass
        };
        this.transporter = nodemailer.createTransport(mailerOptions);
    };

    _email.prototype.sendMail = function(subject, htmlContent, to/*, from */){
        // 邮件信息配置
        var fromEmail = arguments.length >= 4 ? arguments[3] : 'mailer@alipaysupervisor.com';
        var mailOptions = {
            from: '"Alipay-Supervisor ♥" <' + fromEmail + '>',
            to: to,
            subject: subject,
            //text: '', // plaintext body
            html: htmlContent
        };
        // 发送邮件
        this.transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
    };

    return _email;
})();

module.exports = Email;
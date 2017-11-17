"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nodemailer = require("nodemailer");
var Mailer = /** @class */ (function () {
    function Mailer(host, port, authUser, authPass) {
        this.smtpUsername = authUser;
        var mailerOptions;
        if (port == 587) {
            mailerOptions = {
                transport: "SMTP",
                host: host,
                port: port,
                secure: false,
                requireTLS: true,
                ignoreTLS: false,
                requiresAuth: true,
                authMethod: "NTLM",
                auth: {
                    user: authUser,
                    pass: authPass
                },
                tls: { rejectUnauthorized: false },
                debug: false
            };
        }
        else {
            mailerOptions = {
                transport: "SMTP",
                secure: true,
                requiresAuth: true,
                host: host,
                port: port,
                auth: {
                    user: authUser,
                    pass: authPass
                },
                debug: false
            };
        }
        this.transporter = nodemailer.createTransport(mailerOptions);
    }
    Mailer.prototype.sendMail = function (subject, html, to, from) {
        // 邮件信息配置
        from = from || this.smtpUsername; // 部分邮件服务商要求SMTP发信人和SMTP username一致
        var mailOptions = {
            from: '"Alipay-Supervisor ♥" <' + from + ">",
            to: to,
            subject: subject,
            //text: '', // plaintext body
            html: html
        };
        // 发送邮件
        this.transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return console.log(error);
            }
            console.log("Message sent: " + info.response);
        });
    };
    return Mailer;
}());
exports.default = Mailer;

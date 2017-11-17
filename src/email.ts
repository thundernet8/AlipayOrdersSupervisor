import * as nodemailer from "nodemailer";

export default class Mailer {
    private transporter;
    private smtpUsername: string;

    public constructor(
        host: string,
        port: number,
        authUser: string,
        authPass: string
    ) {
        this.smtpUsername = authUser;

        let mailerOptions;
        if (port == 587) {
            mailerOptions = {
                transport: "SMTP",
                host,
                port,
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
        } else {
            mailerOptions = {
                transport: "SMTP",
                secure: true,
                requiresAuth: true,
                host,
                port,
                auth: {
                    user: authUser,
                    pass: authPass
                },
                debug: false
            };
        }

        this.transporter = nodemailer.createTransport(mailerOptions);
    }

    public sendMail(subject: string, html: string, to: string, from?: string) {
        // 邮件信息配置
        from = from || this.smtpUsername; // 部分邮件服务商要求SMTP发信人和SMTP username一致
        const mailOptions = {
            from: '"Alipay-Supervisor ♥" <' + from + ">",
            to,
            subject,
            //text: '', // plaintext body
            html
        };
        // 发送邮件
        this.transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                return console.log(error);
            }
            console.log("Message sent: " + info.response);
        });
    }
}

// # Alipay-Supervisor Configuration

export default {
    version: "1.6",

    debug: false,

    // 接收通知服务器API地址
    // 示例 https://www.webapproach.net/site/apsvnotify
    pushStateAPI: "https://www.xxx.com/site/apsvnotify",

    // 推送方的应用ID(本程序), 用于区分和辨别合法的发送方
    pushAppId: "",

    // 推送方的应用密钥
    pushAppKey: "",

    // 服务器验证签名参数, 此密钥用于按既定签名算法生成签名
    pushStateSecret: "",

    // 支付宝登录成功后的cookies, 用于请求订单列表页的身份验证(获取方式: 首先访问你的个人支付宝, 进入到https://consumeprod.alipay.com/record/advanced.htm订单列表页面, 使用chrome按F12打开调试工具, 进console选项卡, 输入document.cookie回车, 返回的字符串即为cookies, 复制全部, 不包含包含首尾双引号, 粘贴到此处双引号中)
    alipayCookies: "",

    // 爬取订单任务间隔(秒)，不推荐过小的任务间隔
    interval: 60,

    // 开启异常邮件通知(cookies过期异常忽略该选项并始终都会通知)
    enableExNotify: false,

    // 异常通知邮箱地址(多个邮箱以逗号分隔)
    email: "",

    // SMTP配置 - Host
    smtpHost: "",

    // SMTP配置 - Port
    smtpPort: 465,

    // SMTP配置 - username
    smtpUsername: "",

    // SMTP配置 - password
    smtpPassword: ""
};

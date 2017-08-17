// # Alipay-Supervisor

process.env.UV_THREADPOOL_SIZE = 64; //https://www.fedepot.com/cong-node-request-esockettimedoutcuo-wu-shuo-kai-lai/

var config = require("./config");
var logger = require("./logger");
var Email = require("./email");
var email = new Email(
    config.smtpHost,
    config.smtpPort,
    config.smtpUsername,
    config.smtpPassword
);
var Push = require("./push");
var push = new Push(
    config.pushStateAPI,
    config.pushAppId,
    config.pushAppKey,
    config.pushStateSecret
);

var request = require("request").defaults({
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36"
    }
});
//var FileCookieStore = require('tough-cookie-filestore');
var j = request.jar();
request = request.defaults({ jar: j }); // 开启cookies支持
var crypto = require("crypto");
var cheerio = require("cheerio");
var iconv = require("iconv-lite");
var BufferHelper = require("bufferhelper");
var fs = require("fs");
var _ = require("lodash");

// 即时Cookie
var cookies = config.alipayCookies;

// 已推送成功的订单列表
function restoreOrderList() {
    var date = new Date();
    var filename =
        "Orders_" +
        date.getFullYear().toString() +
        "_" +
        (date.getMonth() + 101).toString().substr(1) +
        "_" +
        (date.getDate() + 100).toString().substr(1) +
        ".json";
    // 先add空值确保文件存在
    fs.writeFileSync("./orders/" + filename, "", { flag: "a" });
    var ordersString = fs.readFileSync("./orders/" + filename);
    try {
        return JSON.parse(ordersString);
    } catch (error) {
        return {};
    }
}
function backupOrderList() {
    var ordersString = JSON.stringify(orderList);
    var date = new Date();
    var filename =
        "Orders_" +
        date.getFullYear().toString() +
        "_" +
        (date.getMonth() + 101).toString().substr(1) +
        "_" +
        (date.getDate() + 100).toString().substr(1) +
        ".json";
    fs.writeFileSync("./orders/" + filename, ordersString);
}
var orderList = restoreOrderList();

// Util - 打印log添加时间前缀
function timePrefixLog(text) {
    if (!config.debug) {
        return;
    }
    var date = new Date();
    var prefix = date.toLocaleString();
    console.log(prefix + " - " + text.toString());
}

// Util - 恢复被转义的unicode字符 (\\uXXXX)
function decodeUnic(s) {
    return unescape(s.replace(/\\(u[0-9a-fA-F]{4})/gm, "%$1"));
}

// 请求订单页面并获取页面HTML字符串
function checkOrderListPageHtmlString() {
    timePrefixLog("Start fetch orders");
    var r = request.defaults({ headers: { Cookie: cookies } });
    // 先请求个人主页
    r.get("https://my.alipay.com/portal/i.htm", { timeout: 1500 }, function(
        err,
        response
    ) {
        // error
        if (err) {
            timePrefixLog(err.code);
            // Email报告
            if (config.enableExNotify) {
                email.sendMail(
                    "Alipay Supervisor Service Notice",
                    "<b>An web request error happened in your alipay supervisor</b><br>" +
                        err.message,
                    config.email
                );
            }
        }
        // ok
        if (!err && response.statusCode == 200) {
            // 再请求订单页面
            var r2 = r.get(
                "https://consumeprod.alipay.com/record/advanced.htm?fundFlow=in&_input_charset=utf-8",
                { timeout: 1500 }
            );
            // error
            r2.on("error", function(error) {
                timePrefixLog(error.code);
                // Email报告
                if (config.enableExNotify) {
                    email.sendMail(
                        "Alipay Supervisor Service Notice",
                        "<b>An web request error happened in your alipay supervisor</b><br>" +
                            error.message,
                        config.email
                    );
                }
            });
            // ok
            r2.on("response", function(res) {
                var bufferHelper = new BufferHelper();
                r2.on("data", function(chunk) {
                    bufferHelper.concat(chunk);
                });
                r2.on("end", function() {
                    var result = iconv.decode(bufferHelper.toBuffer(), "GBK");
                    result = result.replace('charset="GBK"', 'charset="utf-8"');
                    timePrefixLog("Fetch orders page content successfully");
                    fs.writeFile("orders.html", result);
                    parseOrdersHtml(result);
                });
            });
        }
    });
}

// 解析订单页面HTML
function parseOrdersHtml(html) {
    timePrefixLog("Star parse page content");

    var $ = cheerio.load(html);

    // 检查是否含有列表form以判断是否订单列表页(例如cookies无效时是返回登录页的内容)
    var form = $("#J-submit-form");
    if (form.length < 1) {
        timePrefixLog("Response html is not valid");
        // Email报告
        email.sendMail(
            "Alipay Supervisor Service Notice",
            "<b>An error happened in your alipay supervisor</b><br>Maybe the cookies has expired, please update it and restart the supervisor",
            config.email
        );
        return false;
    }

    var orderTable = $("#tradeRecordsIndex>tbody");
    var orderRows = orderTable.find("tr");

    orderRows.each(function(index, ele) {
        var orderData = {};
        var orderRow = $(this);
        // 订单时间
        var timeSel = orderRow.children("td.time").children("p");
        orderData.time =
            _.trim(timeSel.first().text()) +
            " " +
            _.trim(timeSel.last().text());
        // 备注
        orderData.memo = _.trim(orderRow.find(".memo-info").text());
        // 订单描述
        orderData.description = _.trim(
            orderRow.children("td.name").children("p").text()
        );
        // 订单商户流水号(商户独立系统)与订单交易号(支付宝系统)
        var orderNoData = orderRow
            .children("td.tradeNo")
            .children("p")
            .text()
            .split("|");
        if (orderNoData.length > 1) {
            orderData.orderId = _.trim(orderNoData[0].split(":")[1]);
            orderData.tradeNo = _.trim(orderNoData[1].split(":")[1]);
        } else {
            orderData.tradeNo = _.trim(orderNoData[0].split(":")[1]);
        }

        // 对方支付宝用户名
        orderData.username = _.trim(
            decodeUnic(orderRow.children("td.other").children("p").text())
        );
        // 金额
        var amountText = orderRow
            .children("td.amount")
            .children("span")
            .text()
            .replace(" ", ""); // + 100.00 / - 100.00 / 100.00
        orderData.amount = parseFloat(amountText);
        // 订单状态
        orderData.status = orderRow.children("td.status").children("p").text();

        // 推送通知
        if (orderData.amount > 0) {
            pushStateToServer(orderData); // 仅对收入做处理
        }
    });

    timePrefixLog("Parse content completed");

    //fs.writeFile('orders.json', JSON.stringify(orderList));
}

// 通知服务器
function pushStateToServer(orderData) {
    if (orderList[orderData["tradeNo"]]) {
        timePrefixLog("Order has been handled successfully, ignore this time");
        return;
    }

    var callback = function(resp) {
        if (typeof resp == "object" && resp.isError) {
            // Email报告
            if (config.enableExNotify) {
                email.sendMail(
                    "Alipay Supervisor Service Notice",
                    "<b>An error happened in your alipay supervisor</b><br>Push state to remote server with error returned, please check your server configuration.<br>The error info is: " +
                        resp.code +
                        ", " +
                        resp.message,
                    config.email
                );
            }
        }
        if (resp == "success") {
            orderList[orderData["tradeNo"]] = orderData;
            backupOrderList(); //将orderList保存到文件
            // Email报告
            email.sendMail(
                "[Success]Alipay Supervisor Service Notice",
                "<b>A order is handled successfully in your alipay supervisor</b><br>The order info is: <pre>" +
                    JSON.stringify(orderData) +
                    "</pre>",
                config.email
            );
        }
    };

    timePrefixLog("Start push order status to server");
    push.pushState(orderData, callback);
}

// 每日通过邮件报告
function dailyReport() {
    // Email报告
    var date = new Date();
    email.sendMail(
        "Alipay Supervisor Service Daily Report(" + date.toLocaleString() + ")",
        "<b>Currently handled orders:</b><br><pre>" +
            JSON.stringify(orderList) +
            "</pre>",
        config.email
    );
}

// 版本检查
function checkVersion() {
    request.get(
        "https://webapproach.net/apsv/version.json",
        { timeout: 1500, rejectUnauthorized: false },
        function(err, response, body) {
            if (!err && response.statusCode == 200) {
                // ok
                var checkInfo = JSON.parse(body.toString());
                if (checkInfo.version != config.version) {
                    var msg =
                        "AlipaySupervisor已更新至" +
                        checkInfo.version +
                        ", 当前版本为" +
                        config.version +
                        "<br> 请访问" +
                        checkInfo.url +
                        "查看更多详情";
                    email.sendMail("AlipaySupervisor已更新", msg, config.email);
                }
            }
        }
    );
}

// Test - 使用本地文件解析测试
// fs.readFile('orders.html','utf-8', function(err,data){
//     if(err){
//         console.log(err);
//     }else{
//         parseOrdersHtml(data);
//     }
// });

// Test - logger
//logger('test content');

// Test - mailer
//email.sendMail('event notice', '<b>an event happened in your alipay supervisor</b>', config.email);

// Test - push
// var testOrderData = {
//     time: "2016.11.29 21:51",
//     memo: "转账",
//     description: "转账",
//     tradeNo: "20161129XXXXXXXXXXXXXXXXX2354351",
//     username: "XXXXX",
//     amount: 150,
//     status: "交易成功"
// };
// var callback = function(body){
//     console.log(body);
// };
// push.pushState(testOrderData, callback);

var Supervisor = {
    startUp: checkOrderListPageHtmlString,
    dailyReport: dailyReport,
    checkVersion: checkVersion
};

module.exports = Supervisor;

// # Alipay-Supervisor

import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as iconv from "iconv-lite";
import * as moment from "moment";
import axios from "axios";
import config from "./config";
import Mailer from "./email";
import Pusher from "./push";
// import logger from "./logger";
import IOrderData from "./IOrderData";
import spiderWorker from "./spiderWorker";

const mailer = new Mailer(
  config.smtpHost,
  config.smtpPort,
  config.smtpUsername,
  config.smtpPassword
);

const pusher = new Pusher(
  config.pushStateAPI,
  config.pushAppId,
  config.pushAppKey,
  config.pushStateSecret
);

const ax = axios.create({
  timeout: 3000,
  withCredentials: true,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  responseType: "arraybuffer",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36",
    Cookie: config.alipayCookies
  }
});

// 订单列表页面是GBK编码，特殊处理
ax.interceptors.response.use(function(response) {
  const ctype: string = response.headers["content-type"];
  response.data = ctype.includes("charset=GBK")
    ? iconv.decode(response.data, "GBK")
    : iconv.decode(response.data, "utf-8");
  return response;
});

// 已推送成功的订单列表
function restoreOrderList() {
  const filename = `${moment().format("YYYY_MM_DD")}.json`;
  // 先add空值确保文件存在
  fs.writeFileSync(path.resolve(__dirname, "../orders/" + filename), "", {
    flag: "a"
  });
  const ordersString = fs.readFileSync(
    path.resolve(__dirname, "../orders/" + filename)
  );
  try {
    return JSON.parse(ordersString ? ordersString.toString() : "{}");
  } catch (error) {
    return {};
  }
}

function backupOrderList() {
  const ordersString = JSON.stringify(orderList);
  const filename = `${moment().format("YYYY_MM_DD")}.json`;
  fs.writeFileSync(
    path.resolve(__dirname, "../orders/" + filename),
    ordersString
  );
}

let orderList: { [tradeNo: string]: IOrderData } = restoreOrderList();

// Util - 打印log添加时间前缀
function timePrefixLog(text) {
  if (!config.debug || !text) {
    return;
  }
  console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${text.toString()}`);
}

// 请求订单页面并获取页面HTML字符串
function checkOrderListPageHtmlString() {
  timePrefixLog("Start fetch orders");
  spiderWorker()
    .then(result => {
      timePrefixLog("Fetch orders page content successfully");
      fs.writeFile(path.resolve(__dirname, "../orders.json"), result, () => {});
      parseOrdersJSON(result);
    })
    .catch(err => {
      timePrefixLog(err.code || err.message || err.toString());
      // Email报告
      if (config.enableExNotify) {
        mailer.sendMail(
          "Alipay Supervisor Service Notice",
          "<b>An web request error happened in your alipay supervisor</b><br>" +
            err.message,
          config.email
        );
      }
    });
}

// 解析订单查询列表JSON
function parseOrdersJSON(results) {
  const list = JSON.parse(results).result.detail;

  list.forEach(function(item) {
    const orderData = {} as IOrderData;
    // 订单时间
    orderData.time = item.gmtCreate;
    // 备注
    orderData.memo = item.goodsMemo;

    // 订单描述
    orderData.description = item.goodsTitle;

    // 订单商户流水号(商户独立系统)与订单交易号(支付宝系统)
    orderData.orderId = item.outTradeNo;
    orderData.tradeNo = item.tradeNo;

    // 对方支付宝用户名
    orderData.username = item.consumerName;
    // 金额
    const amountText = item.tradeConfirmAmount; // + 100.00 / - 100.00 / 100.00
    orderData.amount = parseFloat(amountText);
    // 订单状态
    orderData.status =
      item.tradeStatus === "成功" ? "交易成功" : item.tradeStatus;

    // 推送通知
    if (orderData.amount > 0) {
      pushStateToServer(orderData); // 仅对收入做处理
    }
  });

  timePrefixLog("Parse content completed");
}

// 通知服务器
function pushStateToServer(orderData) {
  if (orderList[orderData["tradeNo"]]) {
    timePrefixLog("Order has been handled successfully, ignore this time");
    return;
  }

  const callback = function(err, resp) {
    if (err) {
      // Email报告
      if (config.enableExNotify) {
        mailer.sendMail(
          "Alipay Supervisor Service Notice",
          "<b>An error happened in your alipay supervisor</b><br>Push state to remote server with error returned, please check your server configuration.<br>The error info is: " +
            resp.code +
            ", " +
            resp.message,
          config.email
        );
      }
    } else if (resp == "success") {
      orderList[orderData["tradeNo"]] = orderData;
      backupOrderList(); //将orderList保存到文件
      // Email报告
      mailer.sendMail(
        "[Success]Alipay Supervisor Service Notice",
        "<b>A order is handled successfully in your alipay supervisor</b><br>The order info is: <pre>" +
          JSON.stringify(orderData) +
          "</pre>",
        config.email
      );
    }
  };

  timePrefixLog("Start push order status to server");
  pusher.pushState(orderData, callback);
}

// 每日通过邮件报告
function dailyReport() {
  // Email报告
  const now = moment();
  mailer.sendMail(
    "Alipay Supervisor Service Daily Report(" +
      now.format("YYYY-MM-DD HH:mm:ss") +
      ")",
    "<b>Currently handled orders:</b><br><pre>" +
      JSON.stringify(orderList) +
      "</pre>",
    config.email
  );
}

// 版本检查
function checkVersion() {
  ax.get("https://webapproach.net/apsv/version.json").then(response => {
    if (Number(response.status) === 200) {
      // ok
      var checkInfo = JSON.parse(response.data.toString());
      if (checkInfo.version !== config.version) {
        var msg =
          "AlipaySupervisor已更新至" +
          checkInfo.version +
          ", 当前版本为" +
          config.version +
          "<br> 请访问" +
          checkInfo.url +
          "查看更多详情";
        mailer.sendMail("AlipaySupervisor已更新", msg, config.email);
      }
    }
  });
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

export default {
  startUp: checkOrderListPageHtmlString,
  dailyReport: dailyReport,
  checkVersion: checkVersion
};

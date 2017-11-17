"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// # Alipay-Supervisor Startup
var schedule = require("node-schedule");
var alipay_1 = require("./alipay");
// 每分钟第30秒执行check order
function scheduleCronCheckOrdersTask() {
    schedule.scheduleJob("30 * * * * *", function () {
        alipay_1.default.startUp();
    });
}
// 每天的23点59 daily report
function scheduleCronReportTask() {
    schedule.scheduleJob({ hour: 23, minute: 59 }, function () {
        alipay_1.default.dailyReport();
    });
}
// 每天的08点检查更新
function scheduleCronVersionCheckTask() {
    schedule.scheduleJob({ hour: 8, minute: 0 }, function () {
        alipay_1.default.checkVersion();
    });
}
scheduleCronCheckOrdersTask();
scheduleCronReportTask();
scheduleCronVersionCheckTask();

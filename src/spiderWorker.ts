import * as childProcess from "child_process";
import * as moment from "moment";
import config from "./config";

const cookieObj: any = config.alipayCookies
  .split(";")
  .map(a => a.trim())
  .map(a => {
    var y = a.split("=");
    return y;
  })
  .reduce((prev, current) => {
    prev[current[0]] = current[1];
    return prev;
  }, {});

const scripts = `curl 'https://mbillexprod.alipay.com/enterprise/tradeListQuery.json' -H 'Cookie: ${
  config.alipayCookies
}' -H 'Origin: https://mbillexprod.alipay.com' -H 'Accept-Encoding: gzip, deflate, br' -H 'Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' -H 'Accept: application/json, text/javascript' -H 'Referer: https://mbillexprod.alipay.com/enterprise/tradeListQuery.htm?fundFlow=in&_input_charset=utf-8' -H 'X-Requested-With: XMLHttpRequest' -H 'Connection: keep-alive' -H 'DNT: 1' --data 'queryEntrance=1&billUserId=${
  config.userId
}&status=ALL&entityFilterType=0&precisionValue=&activeTargetSearchItem=tradeNo&tradeFrom=ALL&startTime=${moment().format(
  "YYYY-MM-DD"
)}+00%3A00%3A00&endTime=${moment()
  .add("1 days")
  .format(
    "YYYY-MM-DD"
  )}+00%3A00%3A00&pageSize=20&pageNum=1&sortTarget=gmtCreate&order=descend&sortType=0&\_input_charset=gbk&ctoken=${
  cookieObj.ctoken
}' --compressed`;

export default function work() {
  return new Promise((resolve, reject) => {
    childProcess.exec(
      scripts,
      { encoding: "GBK" },
      (error, stdout, _stderr) => {
        if (error !== null) {
          reject(error);
        } else {
          resolve(stdout.toString());
        }
      }
    );
  });
}

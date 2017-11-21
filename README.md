## GUI版 (Update 2017-08-17)

现已推出GUI版客户端，由Java+Swing编写，项目地址[AlipayOrdersSupervisor-GUI](https://github.com/thundernet8/AlipayOrdersSupervisor-GUI)

## Alipay Orders Supervisor [![Build Status](https://travis-ci.org/thundernet8/AlipayOrdersSupervisor.svg?branch=master)](https://travis-ci.org/thundernet8/AlipayOrdersSupervisor)

### 支付宝免签约支付接口实现脚本 - NodeJS版本

## 功能介绍

通过NodeJS爬取个人支付宝交易订单列表，分析订单中的备注，然后将订单数据推送至指定服务器，实现支付宝交易接口


自带了简单的日志和邮件通知功能，对系统异常及时报告以及记录


## 如何使用

* 1. 请配置`lib/config.js`中的参数，如邮件SMTP，推送服务器地址，以及`pushStateSecret`，`alipayCookies`等。

`pushStateSecret`用于数据的加盐保证安全以及验证推送来源的合法性

`pushAppId`和`pushAppKey`暂时无用

`alipayCookies`必须填写，这是为了爬取订单时保证登录状态

* 2. 安装必要的npm包

```
npm install
```


* 3. 使用`forever`循环运行脚本

``` typescript
forever start index.js
```
或者使用script
``` typescript
npm start
```

脚本会每分钟爬取一次订单列表


* 4. 服务端处理

请参考脚本中利用`pushStateSecret`生成签名的方法，验证数据合法性后进行业务处理


## 使用Tips

目前该脚本已在我的个人网站webapproach.net/shop上稳定生产运行，对于cookies过期问题，从上一次2017年2月25日更换cookies起至今(2017年6月13日)，已持续3个半月未遭遇cookies过期问题。因此可能建议：

 * 没事不要去登录访问网页版的订单界面，当你关闭网页或网页上直接退出或者在网页停留过久无操作可能会触发服务端session更新cookies内容失效

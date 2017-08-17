var request = require("request");
var logger = require("./logger");
var crypto = require("crypto");
var config = require("./config");

var Push = (function() {
    var _push = function(apiUrl, appId, appKey, secret) {
        this.url =
            apiUrl +
            "?appId=" +
            appId +
            "&appKey=" +
            appKey +
            "&event=new_order";
        this.secret = secret;
    };

    _push.prototype.pushState = function(orderData, callback) {
        // 签名
        var md5 = crypto.createHash("md5");
        var sig = [
            orderData.time.toString(),
            orderData.tradeNo.toString(),
            orderData.amount.toString(),
            orderData.status.toString(),
            this.secret.toString()
        ].join("|");
        sig = md5.update(sig, "utf8").digest("hex");
        // Post body
        orderData.sig = sig;
        orderData.version = config.version;
        var form = orderData;

        request.post(
            this.url,
            { timeout: 10000, rejectUnauthorized: false, form: form },
            function(error, response, body) {
                if (error) {
                    logger(error.code + "," + error.message, "pushError");
                    if (typeof callback == "function") {
                        error.isError = true;
                        callback.call(this, error);
                    }
                    //return false;
                } else if (!error && response.statusCode == 200) {
                    logger(
                        "push order: " +
                            orderData.tradeNo +
                            " completed, Response: " +
                            body,
                        "push"
                    );
                    //console.log(body);
                    if (typeof callback == "function") {
                        callback.call(this, body.toString());
                    }
                    // if(body == 'success'){
                    //     return true;
                    // }else{
                    //     return false;
                    // }
                } else {
                    logger(
                        "push order: " +
                            orderData.tradeNo +
                            " completed, Response(Not 200 OK): " +
                            body,
                        "push"
                    );
                }
            }
        );
    };

    return _push;
})();

module.exports = Push;

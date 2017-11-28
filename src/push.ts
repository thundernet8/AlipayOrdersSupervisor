import axios from "axios";
import * as crypto from "crypto";
import * as https from "https";
import * as qs from "qs";
import IOrderData from "./IOrderData";
import config from "./config";
import logger from "./logger";

export default class Pusher {
    private api: string;
    private secret: string;
    private ax;

    public constructor(apiUrl, appId, appKey, secret) {
        this.api =
            apiUrl +
            "?appId=" +
            appId +
            "&appKey=" +
            appKey +
            "&event=new_order";
        this.secret = secret;
        this.ax = axios.create({
            timeout: 10000,
            withCredentials: true,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }),
            headers: {
                "Content-type": "application/x-www-form-urlencoded"
            }
        });
    }

    public pushState(
        orderData: IOrderData,
        callback: (err, result: string) => void
    ) {
        // 签名
        const md5 = crypto.createHash("md5");
        let sig = [
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
        const form = qs.stringify(orderData);

        this.ax
            .post(this.api, form)
            .then(response => {
                if (Number(response.status) !== 200) {
                    logger(
                        "push order: " +
                            orderData.tradeNo +
                            " completed, Response(Not 200 OK): " +
                            response.data.toString(),
                        "push"
                    );
                } else {
                    logger(
                        "push order: " +
                            orderData.tradeNo +
                            " completed, Response: " +
                            response.data.toString(),
                        "push"
                    );
                    //console.log(body);
                    if (typeof callback === "function") {
                        callback.call(this, null, response.data.toString());
                    }
                }
            })
            .catch(err => {
                logger(err.code + "," + err.message, "pushError");
                if (typeof callback === "function") {
                    callback.call(this, err);
                }
            });
    }
}

import * as moment from "moment";
import * as fs from "fs";

export default function(log: string, type?: string) {
    const filename = `${moment().format("YYYY_MM_DD")}${type
        ? "_" + type
        : ""}.txt`;
    log = `${moment().format("[YYYY-MM-DD HH:mm:ss] ")}${log.toString()}\n\n`;
    fs.writeFile("./logs/" + filename, log, { flag: "a" }, () => {
        // ignore
    });
}

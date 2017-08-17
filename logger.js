var fs = require("fs");
var logger = function(log /*, type*/) {
    var type = arguments.length > 1 ? arguments[1] : "";
    var date = new Date();
    var filename =
        date.getFullYear().toString() +
        "_" +
        (date.getMonth() + 101).toString().substr(1) +
        "_" +
        (date.getDate() + 100).toString().substr(1) +
        (type ? ["_", type].join("") : "") +
        ".txt";
    log = date.toLocaleString() + " - " + log.toString() + "\n\n";
    try {
        fs.writeFile("./logs/" + filename, log, { flag: "a" });
    } catch (e) {
        //ignore
    }
};

module.exports = logger;

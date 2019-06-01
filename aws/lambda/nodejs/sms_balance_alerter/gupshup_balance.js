"use strict";

var http = require("https");
var emailer = require("./emailer.js");
exports.handler = function(event, context, callback) {

  var options = {
    "method": "POST",
    "hostname": process.env.HOST_BASE_URL,
    "port": null,
    "path": "/apps/apis/accInfo?"+
            "userid=" + process.env.USER_NAME +
            "&password=" + process.env.PASSWORD +
            "&method=balanceCheck",
    "headers": {
      "content-type":   "application/json",
      "accept":         "application/x-httpd-php",
      "content-length": "0"
    }
  };

  var req = http.request(options, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      var body = Buffer.concat(chunks);
      console.log(body.toString());

      var balance = parseInt(body.toString().match(/\d+/)[0], 10);
      var threshold = parseInt(process.env.ALERT_THRESHOLD, 10);

      if(balance <= threshold){
        console.log("Balance below threshold! Sending alert email...");
        var msg = "Gupshup Balance has gone below " + process.env.ALERT_THRESHOLD +
                  " (" + balance + " left). Recharge Account #" + process.env.USER_NAME +
                  " ASAP!";
        emailer.send_email({
        "text":    msg,
        "to":      process.env.EMAIL_TO.split(","),
        "bcc":     process.env.EMAIL_BCC.split(","),
        "subject": "Gupshup SMS Balance Alert! " + balance + " left!",
        "from":    "bot@avanti.in"
        });
      }
    });

    req.on("error", function(err) {
        console.log("Req error");
        console.error(JSON.stringify(err));
        emailer.send_email({
        "text": "See AWS Lambda's logs! " + JSON.stringify(err),
        "to": process.env.EMAIL_TO.split(","),
        "bcc": process.env.EMAIL_BCC.split(","),
        "subject": "ERROR! Gupshup SMS Balance Alert! ",
        "from": process.env.EMAIL_FROM || "bot@avanti.in"
        });
    });
    
    res.on("error", function(err) {
        console.log("Resp error");
        console.error(JSON.stringify(err));
        emailer.send_email({
        "text": "See AWS Lambda's logs! " + JSON.stringify(err),
        "to": process.env.EMAIL_TO.split(","),
        "bcc": process.env.EMAIL_BCC.split(","),
        "subject": "ERROR! Gupshup SMS Balance Alert! ",
        "from": process.env.EMAIL_FROM || "bot@avanti.in"
        });
    });
  });

  req.end();
};
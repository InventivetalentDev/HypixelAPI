const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");


module.exports = function (vars, pool) {

    const fiveDaysInMillis = 4.32e+8;
    const thirtyOneHoursInMillis = 1.116e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = thirtyOneHoursInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;

    const webhookRunner = require("../../webhookRunner")(pool);
    let webhookSent = false;

    function queryDataFromDb(req, res, cb) {
        pool.query(
            "SELECT time FROM skyblock_bank_interest_events ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.status(500).json({
                        success: false,
                        msg: "sql error"
                    });
                    cb(err, null);
                    return;
                }

                if (!results || results.length <= 0) {
                    console.warn("[Bank Interest] No Data!");
                    res.status(404).json({
                        success: false,
                        msg: "There is no data available!"
                    });
                    cb(err, null);
                    return;
                }

                let now = Date.now();

                let lastEvent = results[0];
                let lastEventTime = lastEvent.time.getTime();

                let estimate = now;
                if (lastEventTime > 0) {
                    let eventsSinceLast = Math.floor((now - lastEventTime) / eventInterval);
                    eventsSinceLast++;

                    estimate = lastEventTime + (eventsSinceLast * eventInterval);
                }


                let estimateString = moment(estimate).fromNow();

                let theData = {
                    success: true,
                    msg: "",
                    type: "bankInterest",
                    queryTime: now,
                    latest: lastEventTime,
                    estimate: estimate,
                    estimateRelative: estimateString
                };
                cb(null, theData);


                let minutesUntilNextEvent = moment.duration(estimate - now).asMinutes();
                console.log("[BankInterest] Minutes until event: " + minutesUntilNextEvent);
                if (!webhookSent) {
                    if (minutesUntilNextEvent <= 10 && minutesUntilNextEvent >= 6) {
                        // console.log("[NewYear] Sending OneSignal push notification...");
                        //
                        // latestOneSignalNotification = new OneSignal.Notification({
                        //     template_id: "30e3e55e-a97b-4d0a-a6a6-aab55c93fe27"
                        // });
                        // latestOneSignalNotification.postBody["included_segments"] = ["Active Users"];
                        // latestOneSignalNotification.postBody["excluded_segments"] = ["Banned Users"];
                        //
                        // OneSignalClient.sendNotification(latestOneSignalNotification, function (err, response, data) {
                        //     if (err) {
                        //         console.warn("[NewYear] Failed to send OneSignal notification", err);
                        //     } else {
                        //         console.log("[NewYear] OneSignal notification sent!");
                        //         console.log(data);
                        //     }
                        // })

                        webhookSent = true;

                        console.log("[BankInterest] Posting webhooks...");
                        webhookRunner.queryWebhooksAndRun("bankInterest", theData);
                    }
                } else {
                    if (minutesUntilNextEvent <= 5 || minutesUntilNextEvent >= 20) {
                        webhookSent = null;
                    }
                }
            })
    }

    return function (req, res) {
        let now = Date.now();

        function sendCachedData() {
            let data = lastQueryResult;
            data.cached = true;
            data.time = now;
            res.set("X-Cached", "true");
            res.set("Cache-Control", "public, max-age=100");
            res.set("Last-Modified", (new Date(data.latest).toUTCString()));
            res.set("ETag", "\"" + lastQueryHash + "\"");
            res.json(data);
        }

        if (now - lastQueryTime > fiveMinsInMillis || !lastQueryResult) {// Load live data
            queryDataFromDb(req, res, (err, data) => {
                if (err) {
                    return;
                }
                if (data) {
                    lastQueryResult = data;
                    lastQueryTime = now;
                    lastQueryHash = crypto.createHash("md5").update("IAmSomeRandomData" + JSON.stringify(lastQueryResult)).digest("hex");

                    data.cached = false;
                    data.time = now;
                    res.set("X-Cached", "false");
                    res.set("Cache-Control", "public, max-age=100");
                    res.set("Last-Modified", (new Date(data.latest).toUTCString()));
                    res.set("ETag", "\"" + lastQueryHash + "\"");
                    res.send(data);
                } else {
                    sendCachedData();
                }
            });
        } else { // Send cached version instead
            sendCachedData();
        }
    }
};

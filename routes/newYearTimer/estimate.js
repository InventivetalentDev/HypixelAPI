const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");


module.exports = function (vars, pool) {

    // Current interval seems to be about 5 days and 4 hours

    const fiveDaysInMillis = 4.32e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = fiveDaysInMillis+fourHoursInMillis;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;

    function queryDataFromDb(req, res, cb) {
        pool.query(
            "SELECT type,time FROM skyblock_newyear_events ORDER BY time DESC LIMIT 5", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.json({
                        success: false,
                        msg: "sql error"
                    });
                    cb(err, null);
                    return;
                }
                console.log(results);

                if (!results || results.length <= 0) {
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
                let lastEventType = lastEvent.type;

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
                    queryTime: now,
                    latest: lastEventTime,
                    estimate: estimate,
                    estimateRelative: estimateString
                };
                cb(null, theData);


                // let minutesUntilNextSpawn = moment.duration(averageEstimate - now).asMinutes();
                // if (!latestOneSignalNotification && prioritizeWaves) {
                //     if (minutesUntilNextSpawn <= 10 && minutesUntilNextSpawn >= 8) {
                //         console.log("Sending OneSignal push notification...");
                //
                //         latestOneSignalNotification = new OneSignal.Notification({
                //             template_id: "bffa9fcd-c6a8-4922-87a4-3cdad28a7f05"
                //         });
                //         latestOneSignalNotification.postBody["included_segments"] = ["Active Users"];
                //         latestOneSignalNotification.postBody["excluded_segments"] = ["Banned Users"];
                //
                //         OneSignalClient.sendNotification(latestOneSignalNotification, function (err, response, data) {
                //             if (err) {
                //                 console.warn("Failed to send OneSignal notification", err);
                //             } else {
                //                 console.log("OneSignal notification sent!");
                //                 console.log(data);
                //             }
                //         })
                //
                //
                //         console.log("Posting webhooks...");
                //         webhookRunner.queryWebhooksAndRun(theData);
                //     }
                // } else {
                //     if (minutesUntilNextSpawn <= 5 || minutesUntilNextSpawn >= 20) {
                //         latestOneSignalNotification = null;
                //     }
                // }
            })
    }

    return function (req, res) {
        let now = Date.now();

        function sendCachedData() {
            let data = lastQueryResult;
            data.cached = true;
            data.time = now;
            res.set("X-Cached", "true");
            res.set("Cache-Control", "public, max-age=120");
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
                    res.set("Cache-Control", "public, max-age=120");
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

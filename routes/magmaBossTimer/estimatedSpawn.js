const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");

const PRIORITIZE_WAVES_THRESHOLD = 70;

module.exports = function (vars, pool) {

    const OneSignalClient = new OneSignal.Client({
        userAuthKey: vars.oneSignal.userKey,
        app: {
            appAuthKey: vars.oneSignal.restKey,
            appId: vars.oneSignal.appId
        }
    });

    const webhookRunner = require("../../webhookRunner")(pool);

    let latestOneSignalNotification;

    const twoHoursInMillis = 7.2e+6;
    const twentyMinsInMillis = 1.2e+6;
    const tenMinsInMillis = 600000;
    const fiveMinsInMillis = 300000;
    const twoMinsInMillis = 120000;
    const oneMinInMillis = 60000;
    const thirtySecsInMillis = 30000;

    let lastQueryTime = 0;
    let lastQueryResult;
    let lastQueryHash;

    function queryDataFromDb(req, res, cb) {
        pool.query(
            "SELECT type,time_rounded,confirmations,time_average,time_latest FROM skyblock_magma_timer_events WHERE confirmations >= 30 AND time_rounded >= NOW() - INTERVAL 4 HOUR ORDER BY time_rounded DESC, confirmations DESC LIMIT 20", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.status(500).json({
                        success: false,
                        msg: "sql error"
                    });
                    cb(err, null);
                    return;
                }

                let eventTimes = {
                    "blaze": 0,
                    "magma": 0,
                    "music": 0,
                    "spawn": 0,
                    "death": 0
                };
                let eventConfirmations = {
                    "blaze": 0,
                    "magma": 0,
                    "music": 0,
                    "spawn": 0,
                    "death": 0
                };

                if (!results || results.length <= 0) {
                    res.status(404).json({
                        success: false,
                        msg: "There is no data available!"
                    });
                    cb(err, null);
                    return;
                }

                for (let i = 0; i < results.length; i++) {
                    let result = results[i];

                    let type = result.type;
                    let averageTime = (result.time_average.getTime() + result.time_latest.getTime()) / 2;
                    let confirmations = result.confirmations;

                    let moreAccurateThanLast = (confirmations > eventConfirmations[type] && (Math.abs(eventTimes[type] - averageTime) < 240000));
                    if (eventTimes[type] <= 0 || moreAccurateThanLast) {
                        eventTimes[type] = averageTime;
                    }
                    if (eventConfirmations[type] <= 0 || moreAccurateThanLast) {
                        eventConfirmations[type] = confirmations;
                    }
                }

                let now = Date.now();


                let lastBlaze = eventTimes["blaze"];
                let lastMagma = eventTimes["magma"];
                let lastMusic = eventTimes["music"];
                let lastSpawn = eventTimes["spawn"];
                let lastDeath = eventTimes["death"];


                let averageEstimate = 0;
                let averageEstimateCounter = 0;

                let latestEvent = 0;

                let estimateSource = "none";

                let prioritizeWaves = false;


                if (lastBlaze > lastSpawn && lastBlaze > lastDeath && now - lastBlaze < twentyMinsInMillis) {
                    let estimate = lastBlaze + twentyMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["blaze"];
                    averageEstimateCounter += eventConfirmations["blaze"];

                    estimateSource = "blaze";

                    if (eventConfirmations["blaze"] > PRIORITIZE_WAVES_THRESHOLD) {
                        prioritizeWaves = true;
                    }

                    if (lastBlaze > latestEvent) {
                        latestEvent = lastBlaze;
                    }
                }
                if (lastMagma > lastSpawn && lastMagma > lastDeath && lastMagma > lastBlaze && now - lastMagma < tenMinsInMillis) {
                    let estimate = lastMagma + tenMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["magma"];
                    averageEstimateCounter += eventConfirmations["magma"];

                    estimateSource = "magma";

                    if (eventConfirmations["magma"] > PRIORITIZE_WAVES_THRESHOLD) {
                        prioritizeWaves = true;
                    }

                    if (lastMagma > latestEvent) {
                        latestEvent = lastMagma;
                    }
                }
                if (lastMusic > lastSpawn && lastMusic > lastDeath && lastMusic > lastBlaze && lastMusic > lastMagma && now - lastMusic < twoMinsInMillis) {
                    let estimate = lastMusic + twoMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["music"];
                    averageEstimateCounter += eventConfirmations["music"];

                    estimateSource = "music";

                    if (lastMusic > latestEvent) {
                        latestEvent = lastMusic;
                    }
                }

                if (!prioritizeWaves) {
                    if (lastSpawn > 0) {
                        let spawnsSinceLast = Math.floor((now - lastSpawn) / twoHoursInMillis);
                        spawnsSinceLast++;

                        let estimate = lastSpawn + (spawnsSinceLast * twoHoursInMillis);
                        averageEstimate += estimate * eventConfirmations["spawn"];
                        averageEstimateCounter += eventConfirmations["spawn"];

                        estimateSource = "spawn";

                        if (lastSpawn > latestEvent) {
                            latestEvent = lastSpawn;
                        }
                    }

                    if (lastDeath > 0) {
                        let deathsSinceLast = Math.floor((now - lastDeath) / twoHoursInMillis);
                        deathsSinceLast++;

                        let estimate = lastDeath + (deathsSinceLast * twoHoursInMillis);
                        averageEstimate += estimate * eventConfirmations["death"];
                        averageEstimateCounter += eventConfirmations["death"];

                        estimateSource = "death";


                        if (lastDeath > latestEvent) {
                            latestEvent = lastDeath;
                        }
                    }
                }


                if (averageEstimateCounter > 0) {
                    averageEstimate = Math.floor(averageEstimate / averageEstimateCounter);
                }

                // If the estimate source is still spawn/death, add another ~10mins
                // if (estimateSource === "spawn" || estimateSource === "death") {
                //     averageEstimate += tenMinsInMillis;
                // }

                let estimateString = moment(averageEstimate).fromNow();

                let theData = {
                    success: true,
                    msg: "",
                    queryTime: now,
                    latest: eventTimes,
                    latestEvent: latestEvent,
                    latestConfirmations: eventConfirmations,
                    estimate: averageEstimate,
                    estimateRelative: estimateString,
                    estimateSource: estimateSource,
                    prioritizingWaves: prioritizeWaves
                };
                cb(null, theData);


                let minutesUntilNextSpawn = moment.duration(averageEstimate - now).asMinutes();
                if (!latestOneSignalNotification && prioritizeWaves) {
                    if (minutesUntilNextSpawn <= 10 && minutesUntilNextSpawn >= 8) {
                        console.log("Sending OneSignal push notification...");

                        latestOneSignalNotification = new OneSignal.Notification({
                            template_id: "bffa9fcd-c6a8-4922-87a4-3cdad28a7f05"
                        });
                        latestOneSignalNotification.postBody["included_segments"] = ["Active Users"];
                        latestOneSignalNotification.postBody["excluded_segments"] = ["Banned Users"];

                        OneSignalClient.sendNotification(latestOneSignalNotification, function (err, response, data) {
                            if (err) {
                                console.warn("Failed to send OneSignal notification", err);
                            } else {
                                console.log("OneSignal notification sent!");
                                console.log(data);
                            }
                        })


                        console.log("Posting webhooks...");
                        webhookRunner.queryWebhooksAndRun("magmaBoss", theData);
                    }
                } else {
                    if (minutesUntilNextSpawn <= 5 || minutesUntilNextSpawn >= 20) {
                        latestOneSignalNotification = null;
                    }
                }
            })
    }

    return function (req, res) {
        let now = Date.now();

        function sendCachedData() {
            // fs.readFile("latestMagmaEstimate.json", "utf8", (err, data) => {
            //     try {
            //         data = JSON.parse(data);
            //     } catch (e) {
            //         console.warn("Failed to parse cached estimate JSON", e);
            //         lastQueryTime = 0;
            //         res.status(500).json({
            //             success: false,
            //             msg: "Failed to parse cached json data"
            //         });
            //         return;
            //     }
            //     data.cached = true;
            //     data.time = now;
            //     res.json(data);
            // })

            let data = lastQueryResult;
            data.cached = true;
            data.time = now;
            res.set("X-Cached", "true");
            res.set("Cache-Control", "public, max-age=90");
            res.set("Last-Modified", (new Date(data.latestEvent).toUTCString()));
            res.set("ETag", "\""+lastQueryHash+"\"");
            res.json(data);
        }

        if (now - lastQueryTime > thirtySecsInMillis || !lastQueryResult) {// Load live data
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
                    res.set("Last-Modified", (new Date(data.latestEvent).toUTCString()));
                    res.set("ETag", "\""+lastQueryHash+"\"");
                    res.send(data);
                    // fs.writeFile("latestMagmaEstimate.json", JSON.stringify(data), "utf8", (err) => {
                    //     if (err) {
                    //         console.warn(err);
                    //     } else {
                    //         lastQueryTime = now;
                    //     }
                    //     data.cached = false;
                    //     data.time = now;
                    //     res.send(data);
                    // })
                } else {
                    sendCachedData();
                }
            });
        } else { // Send cached version instead
            sendCachedData();
        }
    }
};



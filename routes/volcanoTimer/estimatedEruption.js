const moment = require("moment/moment");
const fs = require("fs");
const OneSignal = require("onesignal-node");
const crypto = require("crypto");
const util = require("../../util");

const CachedDatabaseQuery = require("../../classes/CachedDatabaseQuery");

const PRIORITIZE_WAVES_THRESHOLD = 20;

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
    const threeHoursInMillis = 1.08e+7;
    const twentyMinsInMillis = 1.2e+6;
    const tenMinsInMillis = 600000;
    const fiveMinsInMillis = 300000;
    const twoMinsInMillis = 120000;
    const oneMinInMillis = 60000;
    const thirtySecsInMillis = 30000;

    const maxFill = 225;

    let lastConfirmationWarning = 0;

    let data = {
        success: false,
        msg: "calculating data",
        type: "volcano",
        usingPreload: true
    };

    function loadData() {
        console.log("[volcano] Querying DB data...");
        pool.query(
            "SELECT type,fill_height,time_rounded,confirmations,time_average,time_latest FROM skyblock_volcano_timer_events WHERE confirmations >= 10 AND time_rounded >= NOW() - INTERVAL 8 HOUR ORDER BY time_rounded DESC, confirmations DESC LIMIT 20", function (err, results) {
                if (err) {
                    console.warn(err);
                    return;
                }

                let latestEruption = 0;
                let eruptionConfirmations = 0;

                if (!results || results.length <= 0) {
                    // util.postDiscordMessage("[volcano] There is no data!!");
                    console.error("[volcano] there is no data!!");
                    return;
                }

                let confidence = 0.5;

                let now = Date.now();

                if (now - results[0].time_latest.getTime() > threeHoursInMillis * 2) {
                    try {
                        util.postDiscordMessage("[volcano] Latest data is older than 6 hours!");
                        confidence = 0.1;
                    } catch (e) {
                        console.warn(e);
                    }
                }

                let fillsPerTime = {};
                let timePerFill = {};
                let latestFill = 0;
                let latestFillHeight = 0;
                let fillConfirmations = 0;

                let bestConfirmations = 0;
                for (let i = 0; i < results.length; i++) {
                    let result = results[i];

                    let type = result.type;
                    let averageTime = (result.time_average.getTime() + result.time_latest.getTime()) / 2;
                    let confirmations = result.confirmations;

                    if (confirmations > bestConfirmations) {
                        bestConfirmations = confirmations;


                        if (type === 'eruption') {
                            latestEruption = averageTime;
                            eruptionConfirmations = confirmations;
                        }
                        if (type === 'fill') {
                            latestFill = averageTime;
                            latestFillHeight = result.fill_height;
                            fillConfirmations = confirmations;
                            fillsPerTime[averageTime] = result.fill_height;
                            timePerFill[result.fill_height] = averageTime;
                        }
                    }


                    // let moreAccurateThanLast = (confirmations > eventConfirmations[type] && (Math.abs(eventTimes[type] - averageTime) < 240000));
                    // if (eventTimes[type] <= 0 || moreAccurateThanLast) {
                    //     eventTimes[type] = averageTime;
                    // }
                    // if (eventConfirmations[type] <= 0 || moreAccurateThanLast) {
                    //     eventConfirmations[type] = confirmations;
                    // }
                }

                console.log("[volcano] latest eruption: " + new Date(latestEruption));
                console.log("[volcano] latest fill: " + new Date(latestFill));

                // calculate fill speed
                let perSecond = 0;

                let fillHeights = Object.keys(timePerFill);
                for (let i = 0; i < fillHeights.length - 1; i++) {
                    let fillHeight = fillHeights[i];
                    let time = timePerFill[fillHeight] / 1000;
                    let nextHeight = fillHeights[i + 1];
                    let nextTime = timePerFill[fillHeights[i + 1]] / 1000;
                    let diff = nextHeight - fillHeight;
                    let diffTime = nextTime - time;
                    let speed = diff / diffTime;

                    perSecond = (perSecond + speed) / 2;
                }

                console.log("[volcano] fill per second: " + perSecond);

                let secondsUtilFull = 0;
                let tempFill = 0;
                if (perSecond > 0 && Date.now() - latestFill < twoHoursInMillis) {
                    for (let s = 0; s < 100000; s++) {
                        tempFill += perSecond;
                        secondsUtilFull++;
                        if (tempFill > maxFill) {
                            break;
                        }
                    }
                }

                console.log("[volcano] seconds until max height: " + secondsUtilFull);

                if (bestConfirmations < 50 && (Date.now() - lastConfirmationWarning > 1000 * 60 * 60)) {
                    try {
                        util.postDiscordMessage("[volcano] Best confirmation score was " + bestConfirmations);
                        lastConfirmationWarning = Date.now();
                    } catch (e) {
                        console.warn(e);
                    }
                }
                if (bestConfirmations < 30) {
                    confidence /= 2;
                }


                // let lastBlaze = eventTimes["blaze"];
                // let lastMagma = eventTimes["magma"];
                // let lastMusic = eventTimes["music"];
                // let lastSpawn = eventTimes["spawn"];
                // let lastDeath = eventTimes["death"];


                let averageEstimate = 0;
                let averageEstimateCounter = 0;

                let latestEvent = 0;

                let estimateSource = "none";

                let prioritizeWaves = false;


                if (latestEruption > 0) {


                    let eruptionsSinceLast = Math.floor((now - latestEruption) / twoHoursInMillis);
                    eruptionsSinceLast++;

                    let estimate = latestEruption + (eruptionsSinceLast * twoHoursInMillis);
                    averageEstimate += estimate * eruptionConfirmations;
                    averageEstimateCounter += eruptionConfirmations;

                    estimateSource = "eruption";


                }

                if (perSecond >0 && Date.now() - latestFill < twoHoursInMillis && secondsUtilFull > 0) {
                    let estimate = now + (secondsUtilFull * 1000);
                    averageEstimate += estimate * fillConfirmations;
                    averageEstimateCounter += fillConfirmations;

                    estimateSource = "fill";
                }

                // let gotBlaze = false;
                // let gotMagma = false;
                // if (lastBlaze > lastSpawn && lastBlaze > lastDeath && now - lastBlaze < twentyMinsInMillis) {
                //     let estimate = lastBlaze + twentyMinsInMillis;
                //     averageEstimate += estimate * eventConfirmations["blaze"];
                //     averageEstimateCounter += eventConfirmations["blaze"];
                //
                //     estimateSource = "blaze";
                //     gotBlaze = true;
                //
                //     if (eventConfirmations["blaze"] > eventConfirmations["spawn"] && eventConfirmations["blaze"] > PRIORITIZE_WAVES_THRESHOLD) {
                //         prioritizeWaves = true;
                //         confidence = 0.8;
                //     }
                //
                //     if (lastBlaze > latestEvent) {
                //         latestEvent = lastBlaze;
                //     }
                // }
                // if (lastMagma > lastSpawn && lastMagma > lastDeath && lastMagma > lastBlaze && now - lastMagma < tenMinsInMillis) {
                //     let estimate = lastMagma + tenMinsInMillis;
                //     averageEstimate += estimate * eventConfirmations["magma"];
                //     averageEstimateCounter += eventConfirmations["magma"];
                //
                //     estimateSource = "magma";
                //     gotMagma = true;
                //
                //     if (eventConfirmations["magma"] > eventConfirmations["spawn"] && eventConfirmations["magma"] > PRIORITIZE_WAVES_THRESHOLD) {
                //         prioritizeWaves = true;
                //         confidence = 0.7;
                //     }
                //
                //     if (lastMagma > latestEvent) {
                //         latestEvent = lastMagma;
                //     }
                // }
                //
                // if (gotBlaze && gotMagma) {
                //     confidence *= 2;
                // }
                //
                // if (lastMusic > lastSpawn && lastMusic > lastDeath && lastMusic > lastBlaze && lastMusic > lastMagma && now - lastMusic < twoMinsInMillis) {
                //     let estimate = lastMusic + twoMinsInMillis;
                //     averageEstimate += estimate * eventConfirmations["music"];
                //     averageEstimateCounter += eventConfirmations["music"];
                //
                //     estimateSource = "music";
                //
                //     if (lastMusic > latestEvent) {
                //         latestEvent = lastMusic;
                //     }
                // }
                //
                // if (!prioritizeWaves) {
                //     if (lastSpawn > 0) {
                //         let spawnsSinceLast = Math.floor((now - lastSpawn) / twoHoursInMillis);
                //         spawnsSinceLast++;
                //
                //         let estimate = lastSpawn + (spawnsSinceLast * twoHoursInMillis);
                //         averageEstimate += estimate * eventConfirmations["spawn"];
                //         averageEstimateCounter += eventConfirmations["spawn"];
                //
                //         estimateSource = "spawn";
                //
                //         if (lastSpawn > latestEvent) {
                //             latestEvent = lastSpawn;
                //             confidence = 0.6;
                //             if (spawnsSinceLast <= 1) {
                //                 confidence += 0.2;
                //             }else if (spawnsSinceLast > 2) {
                //                 confidence*=0.25;
                //             }
                //         }
                //     }
                //
                //     if (lastDeath > 0 && eventConfirmations["death"] > eventConfirmations["spawn"]) {
                //         let deathsSinceLast = Math.floor((now - lastDeath) / twoHoursInMillis);
                //         deathsSinceLast++;
                //
                //         let estimate = lastDeath + (deathsSinceLast * twoHoursInMillis);
                //         averageEstimate += estimate * eventConfirmations["death"];
                //         averageEstimateCounter += eventConfirmations["death"];
                //
                //         estimateSource = "death";
                //
                //
                //         if (lastDeath > latestEvent) {
                //             latestEvent = lastDeath;
                //             confidence = 0.6;
                //             if (deathsSinceLast <= 1) {
                //                 confidence += 0.2;
                //             }else if (deathsSinceLast > 2) {
                //                 confidence*=0.25;
                //             }
                //         }
                //     }
                // }


                if (averageEstimateCounter > 0) {
                    averageEstimate = Math.floor(averageEstimate / averageEstimateCounter);
                }

                // If the estimate source is still spawn/death, add another ~10mins
                // if (estimateSource === "spawn" || estimateSource === "death") {
                //     averageEstimate += tenMinsInMillis;
                // }

                // confidence *= eventConfirmations[estimateSource] / 50;
                // confidence = Math.max(0, Math.min(confidence, 1));

                let estimateString = moment(averageEstimate).fromNow();

                data = {
                    success: true,
                    msg: "",
                    type: "volcano",
                    queryTime: now,
                    latest: {
                        eruption: latestEruption,
                        fill: latestFill
                    },
                    latestEvent: latestEvent,
                    latestConfirmations: {
                        eruption: eruptionConfirmations,
                        fill: fillConfirmations
                    },
                    fillHeight: latestFillHeight,
                    estimate: averageEstimate,
                    estimateRelative: estimateString,
                    estimateSource: estimateSource,
                    confidence: confidence
                };


                // let minutesUntilNextSpawn = moment.duration(averageEstimate - now).asMinutes();
                // console.log("[MagmaBoss] Minutes until event: " + minutesUntilNextSpawn + " (" + estimateSource + ", " + confidence + ")");
                // if (!latestOneSignalNotification && prioritizeWaves) {
                //     if (minutesUntilNextSpawn <= 10 && minutesUntilNextSpawn >= 8) {
                //         console.log("[MagmaBoss] Sending OneSignal push notification...");
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
                //                 console.log("[MagmaBoss] OneSignal notification sent!");
                //                 console.log(data);
                //             }
                //         })
                //
                //
                //         console.log("[MagmaBoss] Posting webhooks...");
                //         webhookRunner.queryWebhooksAndRun("magmaBoss", data);
                //     }
                // } else {
                //     if (minutesUntilNextSpawn <= 5 || minutesUntilNextSpawn >= 20) {
                //         latestOneSignalNotification = null;
                //     }
                // }
            })
    }

    setInterval(() => loadData(), 20000);


    return function (req, res) {
        res.json(data);
    }
};



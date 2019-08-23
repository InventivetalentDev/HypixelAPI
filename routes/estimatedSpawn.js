const moment = require("moment");

module.exports = function (vars, pool) {
    return function (req, res) {
        pool.query(
            "SELECT type,time_rounded,confirmations,time_average,time_latest FROM hypixel_skyblock_magma_timer_events2 WHERE confirmations >= 30 AND time_rounded >= NOW() - INTERVAL 2 HOUR ORDER BY time_rounded DESC, confirmations DESC LIMIT 20", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.json({
                        success: false,
                        msg: "sql error"
                    });
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
                    return;
                }

                for (let i = 0; i < results.length; i++) {
                    let result = results[i];

                    let type = result.type;
                    let averageTime = (result.time_average.getTime() + result.time_latest.getTime()) / 2;
                    let confirmations = result.confirmations;

                    if (eventTimes[type] <= 0 || (confirmations > eventConfirmations[type] && (Math.abs(eventTimes[type] - averageTime) < 120000))) {
                        eventTimes[type] = averageTime;
                    }


                    if (eventConfirmations[type] <= 0) {
                        eventConfirmations[type] = confirmations;
                    }
                }

                let now = Date.now();

                let twoHoursInMillis = 7.2e+6;
                let twentyMinsInMillis = 1.2e+6;
                let tenMinsInMillis = 600000;
                let fiveMinsInMillis = 300000;
                let twoMinsInMillis = 120000;


                let lastBlaze = eventTimes["blaze"];
                let lastMagma = eventTimes["magma"];
                let lastMusic = eventTimes["music"];
                let lastSpawn = eventTimes["spawn"];
                let lastDeath = eventTimes["death"];


                let averageEstimate = 0;
                let averageEstimateCounter = 0;

                let estimateSource = "none";

                if (lastSpawn > 0) {
                    let spawnsSinceLast = Math.floor((now - lastSpawn) / twoHoursInMillis);
                    spawnsSinceLast++;

                    let estimate = lastSpawn + (spawnsSinceLast * twoHoursInMillis);
                    averageEstimate += estimate * eventConfirmations["spawn"];
                    averageEstimateCounter += eventConfirmations["spawn"];

                    estimateSource = "spawn";
                }

                if (lastDeath > 0) {
                    let deathsSinceLast = Math.floor((now - lastDeath) / twoHoursInMillis);
                    deathsSinceLast++;

                    let estimate = lastDeath + (deathsSinceLast * twoHoursInMillis);
                    averageEstimate += estimate * eventConfirmations["death"];
                    averageEstimateCounter += eventConfirmations["death"];

                    estimateSource = "death";
                }

                if (lastBlaze > lastSpawn && lastBlaze > lastDeath && now - lastBlaze < twentyMinsInMillis) {
                    let estimate = lastBlaze + twentyMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["blaze"];
                    averageEstimateCounter += eventConfirmations["blaze"];

                    estimateSource = "blaze";
                }
                if (lastMagma > lastSpawn && lastMagma > lastDeath && lastMagma > lastBlaze && now - lastMagma < tenMinsInMillis) {
                    let estimate = lastMagma + tenMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["magma"];
                    averageEstimateCounter += eventConfirmations["magma"];

                    estimateSource = "magma";
                }
                if (lastMusic > lastSpawn && lastMusic > lastDeath && lastMusic > lastBlaze && lastMusic > lastMagma && now - lastMusic < twoMinsInMillis) {
                    let estimate = lastMusic + twoMinsInMillis;
                    averageEstimate += estimate * eventConfirmations["music"];
                    averageEstimateCounter += eventConfirmations["music"];

                    estimateSource = "music";
                }


                if (averageEstimateCounter > 0) {
                    averageEstimate = Math.floor(averageEstimate / averageEstimateCounter);
                }

                // If the estimate source is still spawn/death, add another ~10mins
                // if (estimateSource === "spawn" || estimateSource === "death") {
                //     averageEstimate += tenMinsInMillis;
                // }

                let estimateString = moment(averageEstimate).fromNow();

                res.json({
                    success: true,
                    msg: "",
                    time: now,
                    latest: eventTimes,
                    latestConfirmations: eventConfirmations,
                    estimate: averageEstimate,
                    estimateRelative: estimateString,
                    estimateSource: estimateSource
                });
            })
    }
};
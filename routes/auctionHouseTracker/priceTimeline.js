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

    function queryDataFromDb(req, res, cb) {
        if (!req.params.item) {
            res.status(400).json({
                success: false,
                msg: "Please specify an item"
            });
            return;
        }

        let item = req.params.item.trim();
        pool.query(
            "SELECT * FROM skyblock_auction_items WHERE item=? ORDER BY end_time ASC", [item], function (err, results) {
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
                    res.status(404).json({
                        success: false,
                        msg: "There is no data available!"
                    });
                    cb(err, null);
                    return;
                }

                let now = Date.now();

                let lows = [];
                let highs = [];

                let items = {};
                for (let i = 0; i < results.length; i++) {
                    let item = results[i];
                    if (item.starting_bid !== 0) {
                        lows.push([item.end_time.getTime(), item.starting_bid]);
                    }
                    if (item.current_bid !== 0) {
                        highs.push([item.end_time.getTime(), item.current_bid]);
                    }
                }

                let theData = {
                    success: true,
                    msg: "",
                    timelines:{
                        lows: lows,
                        highs: highs
                    }
                };
                cb(null, theData);

            });
    }

    return function (req, res) {
        let now = Date.now();

        function sendCachedData() {
            let data = lastQueryResult;
            data.cached = true;
            data.time = now;
            res.set("X-Cached", "true");
            res.set("Cache-Control", "public, max-age=1000");
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
                    res.set("Cache-Control", "public, max-age=60");
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

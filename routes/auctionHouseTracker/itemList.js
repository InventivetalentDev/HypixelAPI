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
        pool.query(
            "SELECT * FROM skyblock_auction_items", function (err, results) {
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

                let items = {};
                for (let i = 0; i < results.length; i++) {
                    let item = results[i];
                    if (!items.hasOwnProperty(item.item)) {
                        items[item.item] = {
                            key: item.item,
                            tier: item.tier,
                            category: item.category,
                            modifier: item.modifier,
                            display: item.display_name,
                            bids: {
                                low: item.current_bid || item.starting_bid,
                                high: item.current_bid || item.starting_bid
                            }
                        }
                    } else {
                        if(item.current_bid!==0) {
                            if (item.current_bid > items[item.item].bids.high) {
                                items[item.item].bids.high = item.current_bid;
                            } else if (items[item.item].bids.low===0||item.current_bid < items[item.item].bids.low) {
                                items[item.item].bids.low = item.current_bid;
                            }
                        }
                    }
                }

                let theData = {
                    success: true,
                    msg: "",
                    items: items
                };
                cb(null, theData);

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

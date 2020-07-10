import { Pool } from "mysql";
import { Request, Response } from "express";
import { Callback } from "../../util";
import { createHash } from "crypto";
import { Vars } from "../../vars";

export default function(_: Vars, pool: Pool) {

    const fiveDaysInMillis = 4.32e+8;
    const thirtyOneHoursInMillis = 1.116e+8;
    const fourHoursInMillis = 1.44e+7;
    const twoHoursInMillis = 7.2e+6;
    const oneHourInMillis = 3.6e+6;
    const fiveMinsInMillis = 300000;
    const thirtySecsInMillis = 30000;

    const eventInterval = thirtyOneHoursInMillis;

    let lastQueryTime = 0;
    let lastQueryResult: any;
    let lastQueryHash: any;

    function queryDataFromDb(req: Request, res: Response, cb: Callback) {
        pool.query(
            "SELECT * FROM skyblock_auction_items", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.status(500).json({
                        success: false,
                        msg: "sql error"
                    });
                    cb(err, undefined);
                    return;
                }

                if (!results || results.length <= 0) {
                    res.status(404).json({
                        success: false,
                        msg: "There is no data available!"
                    });
                    cb(err, undefined);
                    return;
                }

                let now = Date.now();

                let items: any = {};
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
                                low: item.starting_bid !== 0 ? item.starting_bid : item.first_bid !== 0 ? item.first_bid : item.current_bid,
                                high: item.current_bid,
                                avg: item.current_bid
                            }
                        }
                    } else {
                        if (item.current_bid !== 0) {
                            if (item.current_bid > items[item.item].bids.high) {
                                items[item.item].bids.high = item.current_bid;
                            } else if (items[item.item].bids.low === 0 || item.current_bid < items[item.item].bids.low) {
                                items[item.item].bids.low = item.current_bid;
                            }
                            items[item.item].bids.avg = (items[item.item].bids.avg + item.current_bid) / 2;
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

    return function (req: Request, res: Response) {
        let now = Date.now();

        function sendCachedData() {
            let data = lastQueryResult;
            data.cached = true;
            data.time = now;
            res.set("X-Cached", "true");
            res.set("Cache-Control", "public, max-age=2000");
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
                    lastQueryHash = createHash("md5").update("IAmSomeRandomData" + JSON.stringify(lastQueryResult)).digest("hex");

                    data.cached = false;
                    data.time = now;
                    res.set("X-Cached", "false");
                    res.set("Cache-Control", "public, max-age=2000");
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

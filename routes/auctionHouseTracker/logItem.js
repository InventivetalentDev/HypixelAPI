const crypto = require("crypto");
const moment = require("moment");
const util = require("../../util");

const nbt = require("../../nbtHelper");

module.exports = function (vars, pool) {
    return function (req, res) {
        /// 1
        console.log("logItem");
        console.log(req.body);

        res.set("Cache-Control", "public, max-age=20");

        if (!req.body.nbtJson) {
            res.status(400).json({
                success: false,
                msg: "Missing nbt"
            });
            return;
        }

        // console.log(JSON.stringify(req.headers));

        let cfIp = req.header("Cf-Connecting-Ip");
        if (!cfIp) {
            res.status(403).json({
                success: false,
                msg: "Missing ip header"
            });
            return;
        }
        let userAgent = req.header("User-Agent");
        console.log(userAgent);

        // let isMod = (typeof req.body.minecraftUser !== "undefined") && (userAgent.startsWith("BossTimerMod/") || userAgent.startsWith("SkyblockAddons/")) && req.body.isModRequest === "true";
        let isMod = true;////TODO
        console.log("isMod: " + isMod);

        let modName = isMod ? userAgent : "";
        let username = req.body.minecraftUser;

        if (!isMod) {
            return;
        }

        let date = new Date();
        let time = date.getTime();


        pool.getConnection(function (err, connection) {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "Failed to get connection from pool"
                });
                return;
            }

            function nameCallback() {
                /// 4

                let inserts = [];

                for (let i = 0; i < req.body.nbtJson.length; i++) {
                    let originalNbt = req.body.nbtJson[i];
                    let simplifiedNbt = {};

                    if (!originalNbt.hasOwnProperty("tagMap")) {
                        console.warn("Missing tagMap in root");
                        continue;
                    }
                    simplifiedNbt = nbt.simplifyNbtMap(originalNbt);

                    let extraAttributes = simplifiedNbt["ExtraAttributes"];

                    let uuid = extraAttributes["uuid"];
                    let item = extraAttributes["id"];
                    let amount = 1;//TODO
                    let startingBid = 0;
                    let currentBid = 0;
                    let bids = 0;
                    let bidder = "";
                    let endTime = 0;
                    let reportTime = date;
                    let seller = "";
                    let modifier = extraAttributes["modifier"] || "";
                    let enchantments = JSON.stringify(extraAttributes["enchantments"]) || "{}";
                    let runes = JSON.stringify(extraAttributes["runes"]) || "{}";
                    let hotPotatoCount = extraAttributes["hot_potato_count"] || 0;
                    let hotPotatoBonus = extraAttributes["hotPotatoBonus"] || "";
                    let origin = extraAttributes["originTag"] || "UNKNOWN";
                    let anvilUses = extraAttributes["anvil_uses"] || 0;
                    let timestamp = extraAttributes["timestamp"]||"";

                    let lore = simplifiedNbt["display"]["Lore"];
                    for (let j = 0; j < lore.length; j++) {
                        let line = stripColorCodes(lore[j]);
                        if (line.startsWith("Seller: ")) {
                            seller = line.substring("Seller: ".length).trim();
                        }
                        if (line.startsWith("Bidder: ")) {
                            bidder = line.substring("Bidder: ".length).trim();
                        }
                        if (line.startsWith("Bids: ")) {
                            bids = parseInt(line.substring("Bids: ".length).replace("bids", "").replace(/[, ]+/g, "").trim());
                        }
                        if (line.startsWith("Top bid: ")) {
                            currentBid = parseInt(line.substring("Top bid: ".length).replace("coins", "").replace(/[, ]+/g, "").trim())
                        }
                        if (line.startsWith("Starting bid: ")) {
                            startingBid = parseInt(line.substring("Starting bid: ".length).replace("coins", "").replace(/[, ]+/g, "").trim())
                        }

                        if (line.startsWith("Ends in: ")) {
                            let endsIn = line.substring("Ends in: ".length).trim();

                            let d = 0;
                            let h = 0;
                            let m = 0;
                            let s = 0;

                            let str = endsIn;

                            let dSplit = str.split("d");
                            if (dSplit.length > 1) {// has days
                                d = parseInt(dSplit[0]);
                                str = dSplit[1];
                            }

                            let hSplit = str.split("h");
                            if (hSplit.length > 1) {
                                h = parseInt(hSplit[0]);
                                str = hSplit[1];
                            }

                            let mSplit = str.split("m");
                            if (mSplit.length > 1) {
                                m = parseInt(mSplit[0]);
                                str = mSplit[1];
                            }

                            let sSplit = str.split("s");
                            if (sSplit.length > 1) {
                                s = parseInt(sSplit[0]);
                                str = mSplit[1];
                            }

                            let mom = moment().add({
                                days: d,
                                hours: h,
                                minutes: m,
                                seconds: s
                            });
                            endTime = new Date(mom.valueOf());
                        }
                    }

                    let insert = [
                        uuid,
                        item,
                        amount,
                        startingBid,
                        currentBid,
                        bids,
                        bidder,
                        endTime,
                        reportTime,
                        seller,
                        modifier,
                        enchantments,
                        runes,
                        hotPotatoCount,
                        hotPotatoBonus,
                        origin,
                        anvilUses,
                        timestamp
                    ];
                    console.log(insert);
                    inserts.push(insert);
                }

                connection.query(
                    "INSERT INTO skyblock_auction_items (uuid,item,amount,starting_bid,current_bid,bids,bidder,end_time,report_time,seller,modifier,enchantments,runes,hot_potato_count,hot_potato_bonus,origin,anvil_uses,timestamp_str) VALUES ? ON DUPLICATE KEY UPDATE current_bid=VALUES(current_bid), bids=VALUES(bids), bidder=VALUES(bidder)",
                    [inserts], function (err, results) {
                        if (err) {
                            console.warn(err);
                            res.status(500).json({
                                success: false,
                                msg: "SQL error"
                            });
                            return;
                        }

                        console.log("Added");
                        res.json({
                            success: true,
                            msg: "Added!"
                        });
                        console.log(" ");

                        connection.release();
                    });


            }

            util.verifyMinecraftUsername(username, function (err, nameRes) {
                if (nameRes) {
                    nameCallback();
                } else {
                    console.warn("Invalid username provided");
                    res.status(400).json({
                        success: false,
                        msg: "LOL. Nope."
                    })
                }
            })


        })
    };

    function stripColorCodes(str) {
        if (typeof str === "string")
            return str.replace(/\xA7[0-9A-FK-OR]/ig, "");
        return str;
    }

    function stripColorCodesFromArray(arr) {
        let stripped = [];
        for (let i = 0; i < arr.length; i++) {
            stripped[i] = stripColorCodes(arr[i]);
        }
        return stripped;
    }

};



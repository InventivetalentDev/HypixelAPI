module.exports = function (vars, pool) {
    return function (req, res) {
        // console.log(JSON.stringify(req.headers));
        // console.log(JSON.stringify(req.body));

        let cfIp = req.header("Cf-Connecting-Ip");
        if (!cfIp) {
            res.status(403).json({
                success: false,
                msg: "Missing ip header"
            });
            return;
        }
        // console.log(cfIp);

        let userAgent = req.header("User-Agent");
        // console.log(userAgent);


        let lastFocused = parseInt(req.body.lastFocused || "0") || 0;
        let username = req.body.minecraftUser || "";

        let date = new Date();
        let activeDate = lastFocused > 0 ? new Date(lastFocused) : date;

        let isMod = (typeof req.body.minecraftUser !== "undefined") && (userAgent.startsWith("BossTimerMod/")||userAgent.startsWith("SkyblockAddons/")) && req.body.isModRequest === "true";
        // console.log("isMod: " + isMod);
        let modName = isMod ? userAgent : "";

        pool.query(
            "INSERT INTO skyblock_magma_timer_pings (ip,time,active_time,minecraftName,isMod,modName) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE time=?, active_time=?, minecraftName=?, isMod=?, modName=?",
            [cfIp, date, activeDate, username, isMod, modName, date, activeDate, username, isMod, modName], function (err, results) {
                if (err) {
                    console.warn(err);
                    res.status(500).json({
                        success: false,
                        msg: "SQL error"
                    })
                    return;
                }

                res.json({
                    success: true,
                    msg: "pong"
                })
            })

    };
};
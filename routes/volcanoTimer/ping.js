module.exports = function (vars, pool) {

    let queue = [];
    setInterval(function () {
        let queries = queue.splice(0,50);
        if (queries && queries.length>0) {
            pool.query(
                "INSERT INTO skyblock_volcano_timer_pings (ip,time,active_time,minecraftName,isMod,modName) VALUES ? ON DUPLICATE KEY UPDATE time=values(time), active_time=values(active_time), minecraftName=values(minecraftName), isMod=values(isMod), modName=values(modName)",
                [queries], function (err, results) {
                    if (err) {
                        console.warn(err);
                        return;
                    }
                })
        }
    }, 500);
    setInterval(function () {
        console.log("Magma Timer Ping queue length: " + queue.length);
    }, 30000);

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
        let activeDate = lastFocused > 0 ? new Date(lastFocused>9999999999?lastFocused:(lastFocused*1000)) : date;

        let isMod = (typeof req.body.minecraftUser !== "undefined") && (userAgent.startsWith("BossTimerMod/")||userAgent.startsWith("SkyblockAddons/") || userAgent.startsWith("BadlionClient ")) /*&& req.body.isModRequest === "true"*/ ;
        // console.log("isMod: " + isMod);
        let modName = isMod ? userAgent : "";

        queue.push([cfIp, date, activeDate, username, isMod ? 1 : 0, modName]);

        res.json({
            success: true,
            msg: "pong"
        });

    };
};

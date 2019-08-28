module.exports = function (vars, pool) {
    return function (req, res) {
        pool.query("SELECT type,time_rounded,confirmations FROM skyblock_magma_timer_events WHERE confirmations > 10 AND time_rounded > NOW() - INTERVAL 4 HOUR ORDER BY time_rounded ASC", function (err, results) {
            if (err) {
                console.warn(err);
                res.json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }

            let events = {
                blaze: [],
                magma: [],
                music: [],
                spawn: [],
                death: []
            };

            for (let i = 0; i < results.length; i++) {
                let result = results[i];

                let t = result.time_rounded.getTime();

                if (result.type === "blaze" && result.confirmations>100) {
                    events[result.type].push([t - 1.8e+6, 0]);
                }

                events[result.type].push([t, result.confirmations]);

                if (result.type === "death" && result.confirmations>100) {
                    events[result.type].push([t + 1.8e+6, 0]);
                }
            }

            let mapped = [];
            for (let k in events) {
                mapped.push({
                    name: k,
                    data: events[k]
                })
            }

            res.set("Cache-Control","public, max-age=120");
            res.json({
                success: true,
                msg: "",
                series: mapped
            })
        })
    }
};
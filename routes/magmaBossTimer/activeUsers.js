module.exports = function (vars, pool) {
    return function (req, res) {
        pool.query("SELECT COUNT(id) AS total FROM skyblock_magma_timer_pings WHERE active_time > NOW() - INTERVAL 2 MINUTE", function (err, results) {
            if (err) {
                console.warn(err);
                res.json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }

            res.set("Cache-Control","public, max-age=60");
            res.json({
                success: true,
                msg: "",
                activeUsers: results[0].total
            })
        })
    }
};
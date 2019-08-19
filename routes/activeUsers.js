module.exports = function (vars, pool) {
    return function (req, res) {
        pool.query("SELECT COUNT(*) AS total FROM hypixel_skyblock_magma_timer_pings WHERE active_time > NOW() - INTERVAL 2 MINUTE", function (err, results) {
            if (err) {
                res.json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }

            res.json({
                success: true,
                msg: "",
                activeUsers: results[0].total
            })
        })
    }
};
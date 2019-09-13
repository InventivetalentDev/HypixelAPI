module.exports = function (vars, pool) {
    return function (req, res) {
        pool.query("SELECT minecraftName,COUNT(*) as count FROM skyblock_magma_timer_ips GROUP BY minecraftName ORDER BY count DESC", function (err, results) {
            if (err) {
                console.warn(err);
                res.json({
                    success: false,
                    msg: "sql error"
                });
                return;
            }

            let max = 0;
            let users = {};
            let grouped = {};
            for (let i = 0; i < results.length; i++) {
                let name = results[i].minecraftName;
                if (name.length <= 0) continue;
                let count = results[i].count;
                if (count < 5) continue;

                if (count > max) max = count;
                if (count < max - 100) continue;

                // users[name] = count;

                if (!grouped[count]) {
                    grouped[count] = [];
                }
                grouped[count].push(name);
            }

            let groupedArray = [];
            for (let i in grouped) {
                groupedArray.push([i, grouped[i]]);
            }
            groupedArray.sort(function (a, b) {
                return b[0] - a[0];
            });

            let ranking = [];
            for (let i = 0; i < groupedArray.length; i++) {
                ranking[i] = {
                    ranking: i + 1,
                    count: parseInt(groupedArray[i][0]),
                    users: groupedArray[i][1]
                };
            }

            res.set("Cache-Control", "public, max-age=60000");
            res.json({
                success: true,
                msg: "",
                // users: users,
                // grouped: grouped,
                ranking: ranking
            })
        })
    }
};

module.exports = function (vars, pool) {
    return function (req, res) {
        let date = new Date();

        res.set("Cache-Control", "public, max-age=30");
        res.json({
            timestamp: date.getTime(),
            utc: date.toUTCString()
        })

    };
};

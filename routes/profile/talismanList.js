const request = require("request");
const nbt = require("prismarine-nbt");

const nbtKeys = [
    "talisman_bag",
    "inv_contents",
    "potion_bag",
    "quiver",
    "fishing_bag",
    "ender_chest_contents",
    "inv_armor",
    "candy_inventory_contents"
];

module.exports = function (vars, pool) {
    return function (req, res) {

        pool.query(
            "SELECT key_id,name,skull_id,skull_texture FROM skyblock_talismans ", function (err, results) {
                if (err) {
                    console.warn(err);
                    res.json({
                        success: false,
                        msg: "sql error"
                    }, null);
                    return;
                }

                res.set("Cache-Control", "public, max-age=" + 86400);
                res.json(results);
            });
    };
};

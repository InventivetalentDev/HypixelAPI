import { Pool } from "mysql";
import { Request, Response } from "express";
import { Vars } from "../../vars";

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

// TODO: Structure this under hypixel
export default function(vars: Vars, pool: Pool) {
    return function (req: Request, res: Response) {

        if (!req.query.user) {
            res.status(400).json({
                success: false,
                msg: "Missing user"
            });
            return;
        }
        let user = (req.query.user as string).trim();

        if (!req.query.profile) {
            res.status(400).json({
                success: false,
                msg: "Missing profile"
            });
            return;
        }
        let profile = (req.query.profile as string).trim();


        let date = new Date();
        let time = date.getTime();


        console.log("Querying Hypixel API for " + user + "...");
        request({
            url: "https://api.hypixel.net/skyblock/profile?key=" + vars.hypixel.key + "&profile=" + profile,
            json: true,
            headers: {
                'User-Agent': 'inventive-profile-proxy'
            }
        }, function (err: Error, response: Response, body: any) {
            if (err) {
                console.warn(err);
                res.status(500).json({
                    success: false,
                    msg: "Failed to query Hypixel API"
                });
                return;
            }
            if (response.statusCode !== 200) {
                res.status(500).json({
                    success: false,
                    msg: "Hypixel API returned non-ok status code (" + response.statusCode + ")"
                });
                return;
            }
            if (!body.success) {
                res.status(500).json({
                    success: false,
                    msg: "Hypixel API returned success:false"
                });
                return;
            }
            if (!body.profile) {
                res.status(404).json({
                    success: false,
                    msg: "Profile not found"
                });
                return;
            }

            let memberData = body.profile.members[user];
            if (!memberData) {
                res.status(404).json({
                    success: false,
                    msg: "Player not found in profile"
                });
                return;
            }
            memberData.user = user;
            memberData.profile = profile;

            let promises = [];

            if (req.query.parseNbt && (req.query.parseNbt as any).length > 0) {
                let keys;
                if (req.query.parseNbt === "true" || req.query.parseNbt === "all") {
                    keys = nbtKeys;
                } else {
                    keys = (req.query.parseNbt as any).split(",");
                }
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if (memberData.hasOwnProperty(key)) {
                        memberData[key + "_"] = memberData[key];
                        let data = new Buffer(memberData[key].data, "base64");
                        promises.push(new Promise((resolve, reject) => {
                            nbt.parse(data, function (err: any, parsed: any) {
                                if (err) {
                                    console.warn(err);
                                    memberData[key] = "_NBT_PARSE_ERROR_";
                                    resolve();
                                } else {
                                    memberData[key] = parsed;
                                    resolve();


                                    if (key === "talisman_bag") {
                                        let values = [];
                                        let list = parsed["value"]["i"]["value"]["value"];
                                        for (let j = 0; j < list.length; j++) {
                                            try {
                                                let item = list[j];
                                                if (!item.hasOwnProperty("tag")) continue;
                                                let tag = item["tag"]["value"];

                                                let name = tag["display"]["value"]["Name"]["value"];
                                                let description = tag["display"]["value"]["Lore"]["value"]["value"].join("\r\n");
                                                let key = tag["ExtraAttributes"]["value"]["id"]["value"];
                                                let skullId = tag.hasOwnProperty("SkullOwner") ? tag["SkullOwner"]["value"]["Id"]["value"] : "";
                                                let skullTexture = tag.hasOwnProperty("SkullOwner") ? tag["SkullOwner"]["value"]["Properties"]["value"]["textures"]["value"]["value"][0]["Value"]["value"] : "";

                                                if (tag["ExtraAttributes"]["value"].hasOwnProperty("modifier")) {
                                                    name=name.replace(new RegExp(tag["ExtraAttributes"]["value"]["modifier"]["value"]+" ","i"),"");
                                                }

                                                values.push([key, name, description, skullId, skullTexture]);
                                            } catch (e) {
                                                console.warn(e)
                                            }
                                        }
                                        pool.query(
                                            "INSERT IGNORE INTO skyblock_talismans (key_id,name,description,skull_id,skull_texture) VALUES ?",
                                            [
                                                values
                                            ],
                                            function (err, results) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                            }
                                        );
                                    }
                                }
                            });
                        }))
                    }
                }
            }

            function respond() {
                res.set("Cache-Control", "public, max-age=" + 86400);
                res.set("Last-Modified", (new Date(memberData.last_save).toUTCString()));
                res.set("ETag", new Buffer(memberData.last_save + memberData.profile + memberData.user).toString("base64"));

                res.json(memberData);
            }

            if (promises.length === 0) {
                respond();
            } else {
                Promise.all(promises).then(respond);
            }
        });
    };
};

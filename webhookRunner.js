const request = require("request");
const moment = require("moment");

const IMG_CLOCK = "https://i.imgur.com/4PEZvZY.png";
const IMG_MAGMA_CUBE = "https://i.imgur.com/4lPcwlJ.png";
const IMG_CAKE = "https://i.imgur.com/6vhmsmC.png";
const IMG_PUMPKIN = "https://i.imgur.com/hNMiWDs.png";
const IMG_AUCTION = "https://i.imgur.com/Afek3Te.png";

function doPost(context, data, url, format, connection, targetId) {
    console.log("POST (" + context + "/" + format + ") " + url);

    // let timestampText = new Date(data.time).toUTCString();

    let extraOptions = JSON.parse(data.extraOptions || "{}") || {};

    let postData = data;
    if (format === "discord") {
        let messageContent = "@here";
        if (extraOptions.discord) {
            if (extraOptions.discord.message) {
                messageContent = extraOptions.discord.message;
            }
        }

        if (context === "magmaBoss") {
            let webUrl = "https://hypixel.inventivetalent.org/skyblock-magma-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";

            postData = {
                content: messageContent,
                embeds: [
                    {
                        title: "Skyblock **Magma Boss** will spawn soon!",
                        description:  "The Hypixel Skyblock **Magma Boss** should spawn in less than 10 minutes!\n",
                        url: webUrl,
                        // timestamp: data.time,
                        color: 16611336,
                        fields: [
                            {
                                name: "⏳",
                                value: "[**Open The Timer**](" + webUrl + ")",
                                inline: true
                            },
                            {
                                name: "⌚",
                                value: moment(data.estimate).utc().format("HH:mm z"),
                                inline: true
                            }
                        ],
                        author: {
                            name: "Hypixel Skyblock Timer",
                            url: webUrl,
                            icon_url: IMG_CLOCK
                        },
                        thumbnail: {
                            url: IMG_MAGMA_CUBE
                        },
                        footer: {
                            text: "hypixel.inventivetalent.org",
                            icon_url: IMG_CLOCK
                        }
                    }
                ]
            };
        }
        if (context === "newYear") {
            let webUrl = "https://hypixel.inventivetalent.org/skyblock-newyear-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";

            postData = {
                content: messageContent,
                embeds: [
                    {
                        title: "Skyblock **New Year's** will begin soon!",
                        description: "The Hypixel Skyblock **New Year's Event** will begin in less than 10 minutes!\n",
                        url: webUrl,
                        // timestamp: data.time,
                        color: 12123133,
                        fields: [
                            {
                                name: "⏳",
                                value: "[**Open The Timer**](" + webUrl + ")",
                                inline: true
                            },
                            {
                                name: "⌚",
                                value: moment(data.estimate).utc().format("HH:mm z"),
                                inline: true
                            }
                        ],
                        author: {
                            name: "Hypixel Skyblock Timer",
                            url: webUrl,
                            icon_url: IMG_CLOCK
                        },
                        thumbnail: {
                            url: IMG_CAKE
                        },
                        footer: {
                            text: "hypixel.inventivetalent.org",
                            icon_url: IMG_CLOCK
                        }
                    }
                ]
            }
        }
        if (context === "darkAuction") {
            let webUrl = "https://hypixel.inventivetalent.org/skyblock-dark-auction-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";

            postData = {
                content: messageContent,
                embeds: [
                    {
                        title: "Skyblock **Dark Auction** will begin soon!",
                        description: "The Hypixel Skyblock **Dark Auction** will begin in less than 10 minutes!\n",
                        url: webUrl,
                        // timestamp: data.time,
                        color: 12123133,
                        fields: [
                            {
                                name: "⏳",
                                value: "[**Open The Timer**](" + webUrl + ")",
                                inline: true
                            },
                            {
                                name: "⌚",
                                value: moment(data.estimate).utc().format("HH:mm z"),
                                inline: true
                            }
                        ],
                        author: {
                            name: "Hypixel Skyblock Timer",
                            url: webUrl,
                            icon_url: IMG_CLOCK
                        },
                        thumbnail: {
                            url: IMG_AUCTION
                        },
                        footer: {
                            text: "hypixel.inventivetalent.org",
                            icon_url: IMG_CLOCK
                        }
                    }
                ]
            }
        }
        if (context === "spookyEvent") {
            let webUrl = "https://hypixel.inventivetalent.org/skyblock-spooky-festival-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";

            postData = {
                content: messageContent,
                embeds: [
                    {
                        title: "Skyblock **Spooky Festival** will begin soon!",
                        description: "The Hypixel Skyblock **Spooky Festival** will begin in less than 10 minutes!\n",
                        url: webUrl,
                        // timestamp: data.time,
                        color: 12123133,
                        fields: [
                            {
                                name: "⏳",
                                value: "[**Open The Timer**](" + webUrl + ")",
                                inline: true
                            },
                            {
                                name: "⌚",
                                value: moment(data.estimate).utc().format("HH:mm z"),
                                inline: true
                            }
                        ],
                        author: {
                            name: "Hypixel Skyblock Timer",
                            url: webUrl,
                            icon_url: IMG_CLOCK
                        },
                        thumbnail: {
                            url: IMG_PUMPKIN
                        },
                        footer: {
                            text: "hypixel.inventivetalent.org",
                            icon_url: IMG_CLOCK
                        }
                    }
                ]
            }
        }
    }

    console.log(JSON.stringify(postData));

    request({
        method: "POST",
        url: url,
        json: postData
    }, function (err, response, body) {
        if (err) {
            console.warn(err);
            return;
        }
        console.log(response.statusCode);
        console.log(body);

        if (response.statusCode < 200 || response.statusCode > 230) {// error
            connection.query("UPDATE skyblock_webhooks SET errorCounter = errorCounter+1 WHERE id=?", [targetId], function (err, results) {
            })
        } else {// success
            connection.query("UPDATE skyblock_webhooks SET successCounter = successCounter+1 WHERE id=?", [targetId], function (err, results) {
            })
        }
    });
}

module.exports = function (pool) {
    let stack = [];

    let queryWebhooks = function queryWebhooks(context, cb) {
        console.log("Querying webhooks for " + context);
        pool.query("SELECT * FROM skyblock_webhooks WHERE context = ? AND errorCounter < 5", [context], function (err, results) {
            if (err) {
                console.warn("Failed to query webhooks");
                console.warn(err);
                return;
            }
            console.log(results);

            stack = stack.concat(results);
            cb();
        })
    };


    let data = [];

    let intervalId;
    let run = function run() {
        console.log("Running Webhooks for a stack of " + stack.length);

        clearInterval(intervalId);
        let currentData = data.shift();

        pool.getConnection(function (err, connection) {
            setTimeout(function () {
                console.log("Releasing Webhook SQL connection");
                connection.release();
            }, stack.length * 1000);

            intervalId = setInterval(function () {
                let currentTarget = stack.shift();
                if (currentTarget) {
                    console.log(currentTarget);
                    doPost(currentTarget.context, currentData, currentTarget.url, currentTarget.format, connection, currentTarget.id)
                }
            }, 10);


        })

    };

    return {
        stack: stack,
        queryWebhooks: queryWebhooks,
        queryWebhooksAndRun: function (context, data_) {
            if (data_) {
                data.push(data_);
            }
            queryWebhooks(context, function () {
                run();
            });
        },
        data: data,
        run: run
    }
};

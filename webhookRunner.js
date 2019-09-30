const request = require("request");
const moment = require("moment");

function doPost(context, data, url, format, connection, targetId) {
    console.log("POST (" + context + "/" + format + ") " + url);

    // let timestampText = new Date(data.time).toUTCString();

    let postData = data;
    if (format === "discord") {
        let webUrl = "https://hypixel.inventivetalent.org/skyblock-magma-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";

        postData = {
            content: "@here",
            embeds: [
                {
                    title: "Skyblock **Magma Boss** will spawn soon!",
                    description: "The Hypixel Skyblock **Magma Boss** should spawn in less than 10 minutes!\n",
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
                            value: moment(data.estimate).format("HH:mm z"),
                            inline: true
                        }
                    ],
                    author: {
                        name: "Hypixel Skyblock Boss Timer",
                        url: webUrl,
                        icon_url: "https://i.imgur.com/ABtIkSp.png"
                    },
                    thumbnail: {
                        url: "https://i.imgur.com/4lPcwlJ.png"
                    },
                    footer: {
                        text: "hypixel.inventivetalent.org",
                        icon_url: "https://i.imgur.com/ABtIkSp.png"
                    }
                }
            ]
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

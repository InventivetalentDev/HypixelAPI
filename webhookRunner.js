const request = require("request");
const moment = require("moment");

function doPost(data, url, format) {
    console.log("POST (" + format + ") " + url);

    let webUrl = "https://hypixel.inventivetalent.org/skyblock-magma-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";
    // let timestampText = new Date(data.time).toUTCString();

    let postData = data;
    if (format === "discord") {
        postData = {
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
    });
}

module.exports = function (pool) {
    let stack = [];

    let queryWebhooks = function queryWebhooks(cb) {
        pool.query("SELECT * FROM skyblock_magma_timer_webhooks", function (err, results) {
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

        intervalId = setInterval(function () {
            let currentTarget = stack.shift();
            if (currentTarget) {
                console.log(currentTarget);
                doPost(currentData, currentTarget.url, currentTarget.format)
            }
        }, 10);
    };

    return {
        stack: stack,
        queryWebhooks: queryWebhooks,
        queryWebhooksAndRun: function (data_) {
            if (data_) {
                data.push(data_);
            }
            queryWebhooks(function () {
                run();
            });
        },
        data: data,
        run: run
    }
};
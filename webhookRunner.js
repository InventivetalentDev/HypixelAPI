const request = require("request");

function doPost(data, url, format) {
    console.log("POST (" + format + ") " + url);

    let webUrl = "https://hypixel.inventivetalent.org/skyblock-magma-timer/?utm_campaign=DiscordWebhook&utm_source=discord_webhook&utm_medium=discord";
    let timestampText = new Date(data.time).toUTCString();

    let postData = data;
    if (format === "discord") {
        postData = {
            content: "",
            embeds: [
                {
                    title: "Skyblock Magma Boss will spawn soon!",
                    description: "The Hypixel Skyblock Magma Boss should spawn in less than 10 minutes!",
                    url: webUrl,
                    timestamp: timestampText,
                    color: 16611336,
                    author: {
                        name: "Hypixel Skyblock Boss Timer",
                        url: webUrl,
                        icon_url: "https://cdn.discordapp.com/attachments/618504408094867456/618746244164222977/Magma_Cube_48px.png"
                    },
                    thumbnail: {
                        url: "https://cdn.discordapp.com/attachments/618504408094867456/618746223637037057/Magma_Cube_256.png"
                    },
                    footer: {
                        text: "hypixel.inventivetalent.org"
                    }
                }
            ]
        }
    }

    request({
        method: "POST",
        url: url,
        json: postData
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

            stack.push(results);
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
import { Response, get, post } from "request";
import { Url } from "url";
import { createHash } from "crypto";
import vars from "./vars";

export type Callback = (error: Error | null, result?: any) => void;

export function verifyMinecraftUsername(username: string, cb: Callback): void {
    get({
        url: "https://api.mojang.com/users/profiles/minecraft/" + username
    }, function (err: Error, _: Response, body) {
        if (err) {
            console.warn(err);
            cb(err, undefined);
        } else {
            if (body.length > 0) {
                cb(null, JSON.parse(body));
            }else{
                cb(null, false);
            }
        }
    })
};

export function createUrlHash(parsedUrl: Url) {
  return createHash("sha256").update(parsedUrl.protocol + "_" + parsedUrl.host + "_" + parsedUrl.pathname + "_" + parsedUrl.href).digest("hex")
};

export function postDiscordMessage(content: string, channel: string = vars.discord.channel): void {
    if (!vars.discord || !vars.discord.token) return;

    post({
        url: "https://discordapp.com/api/channels/" + channel + "/messages",
        headers: {
            "Authorization": "Bot " + vars.discord.token,
            "User-Agent": "MineSkin"
        },
        json: {
            content: content
        }
    }, function (err: Error, res: Response, body) {
        if (err) {
            console.warn(err);
            return;
        }
        if (res.statusCode !== 200) {
            console.warn(res.statusCode);
            console.warn(body);
        }
    })
};

export function sendDiscordDirectMessage(content: string, receiver: string): void {
    if (!vars.discord || !vars.discord.token) return;

    post({
        url: "https://discordapp.com/api/users/@me/channels",
        headers: {
            "Authorization": "Bot " + vars.discord.token,
            "User-Agent": "MineSkin"
        },
        json: {
            recipient_id: receiver
        }
    }, function (err: Error, res: Response, body) {
        if (err) {
            console.warn(err);
            return;
        }
        if (res.statusCode !== 200) {
            console.warn(res.statusCode);
            console.warn(body);
        } else {
            module.exports.postDiscordMessage(content, body.id);
        }
    })
};

export interface WebhookResult {
    stack: any[];
    data: any[];
    run: () => void;
    queryWebhooks: (context: string, cb: Callback) => void;
    queryWebhooksAndRun: (context: string, data_: any) => void;
}

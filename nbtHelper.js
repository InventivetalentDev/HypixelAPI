function simplifyUnknownNbtValue(v) {
    let s;
    if (v.hasOwnProperty("tagMap")) {
        s = simplifyNbtMap(v);
    } else if (v.hasOwnProperty("tagList")) {
        s = simplifyNbtList(v);
    } else {
        s = simplifyNbtData(v);
    }
    return s;
}


function simplifyNbtMap(tagMap) {
    if (tagMap.hasOwnProperty("tagMap")) {
        tagMap = tagMap.tagMap;
    }

    let simple = {};
    for (let k in tagMap) {
        if (tagMap.hasOwnProperty(k)) {
            let v = tagMap[k];
            simple[k] = simplifyUnknownNbtValue(v);
        }
    }
    return simple;
}

function simplifyNbtList(tagList) {
    if (typeof tagList === "object" && tagList.hasOwnProperty("tagList")) {
        tagList = tagList.tagList;
    }

    let simple = [];
    for (let i = 0; i < tagList.length; i++) {
        let v = tagList[i];
        simple[i] = simplifyUnknownNbtValue(v);
    }
    return simple;
}

function simplifyNbtData(tag) {
    if (typeof tag === "object" && tag.hasOwnProperty("data")) {
        return tag.data;
    }
    return tag;
}


function test() {
    let inStr = "{\"tagMap\":{\"HideFlags\":{\"data\":254},\"display\":{\"tagMap\":{\"Lore\":{\"tagList\":[{\"data\":\"§5§lEPIC\"},{\"data\":\"§8§m-----------------\"},{\"data\":\"§7Seller: §a[VIP] Mit_Recht\"},{\"data\":\"§7Bids: §a1 bids\"},{\"data\":\"\"},{\"data\":\"§7Top bid: §640,000,000 coins\"},{\"data\":\"§7Bidder: §6[MVP§e++§6] Riplls\"},{\"data\":\"\"},{\"data\":\"§7Ends in: §e6d\"},{\"data\":\"\"},{\"data\":\"§eClick to inspect!\"}],\"tagType\":8},\"Name\":{\"data\":\"§f§f§5Overflux Capacitor\"}}},\"ExtraAttributes\":{\"tagMap\":{\"id\":{\"data\":\"OVERFLUX_CAPACITOR\"}}},\"AttributeModifiers\":{\"tagList\":[],\"tagType\":0}}}";
    let parsed = JSON.parse(inStr);
    console.log(parsed);
    let out = simplifyNbtMap(parsed);
    console.log(" ");
    console.log(" ");
    console.log(JSON.stringify(out));
}
test()

module.exports = {
    simplifyUnknownNbtValue,
    simplifyNbtData,
    simplifyNbtList,
    simplifyNbtMap
};

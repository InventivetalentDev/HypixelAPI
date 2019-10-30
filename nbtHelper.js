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
    let inStr = "{\"tagMap\":{\"HideFlags\":{\"data\":254},\"SkullOwner\":{\"tagMap\":{\"Id\":{\"data\":\"fef99b83-28bc-3bad-99e7-76a159a8aa96\"},\"Properties\":{\"tagMap\":{\"textures\":{\"tagList\":[{\"tagMap\":{\"Value\":{\"data\":\"eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvN2QzODljNTVlY2Y3ZGI1NzJkNjk2MWNlM2Q1N2I1NzJlNzYxMzk3YjY3YTJkNmQ5NGM3MmZjOTFkZGRkNzQifX19\"}}}],\"tagType\":10}}}}},\"display\":{\"tagMap\":{\"Lore\":{\"tagList\":[{\"data\":\"§7Keeps you alive when you are on\"},{\"data\":\"§7death\u0027s door, granting a short\"},{\"data\":\"§7period of invincibility.\"},{\"data\":\"§7Consumed on use.\"},{\"data\":\"\"},{\"data\":\"§7§cNOTE: ONLY WORKS ON THE END\"},{\"data\":\"§cISLAND§7.\"},{\"data\":\"\"},{\"data\":\"§5§lEPIC\"},{\"data\":\"§8§m-----------------\"},{\"data\":\"§7Seller: §a[VIP] Taeuschung\"},{\"data\":\"§7Starting bid: §6100,000 coins\"},{\"data\":\"\"},{\"data\":\"§7Ends in: §e12m49s\"},{\"data\":\"\"},{\"data\":\"§eClick to inspect!\"}],\"tagType\":8},\"Name\":{\"data\":\"§f§f§5Remnant of the Eye\"}}},\"ExtraAttributes\":{\"tagMap\":{\"originTag\":{\"data\":\"BOSS_SPAWN\"},\"id\":{\"data\":\"REMNANT_OF_THE_EYE\"},\"uuid\":{\"data\":\"f28278eb-cd2d-4527-9abd-f5d83512e3af\"},\"timestamp\":{\"data\":\"10/30/19 7:59 AM\"}}},\"AttributeModifiers\":{\"tagList\":[],\"tagType\":0}}}";
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

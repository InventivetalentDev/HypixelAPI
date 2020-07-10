// TODO: Include a custom typing for the nbt library
export function simplifyUnknownNbtValue(v: any): any {
    let s;
    if (v.hasOwnProperty("tagMap") || v.hasOwnProperty("field_74784_a")) {
        s = simplifyNbtMap(v);
    } else if (v.hasOwnProperty("tagList") || v.hasOwnProperty("field_74747_a")) {
        s = simplifyNbtList(v);
    } else {
        s = simplifyNbtData(v);
    }
    return s;
}


export function simplifyNbtMap(tagMap: any): any {
    if (tagMap.hasOwnProperty("tagMap")) {
        tagMap = tagMap.tagMap;
    }
    if (tagMap.hasOwnProperty("field_74784_a")) {
        tagMap = tagMap["field_74784_a"];
    }

    let simple: {[key: string]: any} = {};
    for (let k in tagMap) {
        if (tagMap.hasOwnProperty(k)) {
            let v = tagMap[k];
            simple[k] = simplifyUnknownNbtValue(v);
        }
    }
    return simple;
}

export function simplifyNbtList(tagList: any): any {
    if (typeof tagList === "object") {
        if (tagList.hasOwnProperty("tagList")) {
            tagList = tagList.tagList;
        }
        if (tagList.hasOwnProperty("field_74747_a")) {
            tagList = tagList["field_74747_a"];
        }
    }

    let simple = [];
    for (let i = 0; i < tagList.length; i++) {
        let v = tagList[i];
        simple[i] = simplifyUnknownNbtValue(v);
    }
    return simple;
}

export function simplifyNbtData(tag: any): any {
    if (typeof tag === "object") {
        let keys;
        if (tag.hasOwnProperty("data")) {
            return tag.data;
        } else if ((keys = Object.keys(tag)).length === 1) {
            return tag[keys[0]];
        }
    }

    return tag;
}


function test() {
    // let inStr = "{\"tagMap\":{\"HideFlags\":{\"data\":254},\"SkullOwner\":{\"tagMap\":{\"Id\":{\"data\":\"fef99b83-28bc-3bad-99e7-76a159a8aa96\"},\"Properties\":{\"tagMap\":{\"textures\":{\"tagList\":[{\"tagMap\":{\"Value\":{\"data\":\"eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvN2QzODljNTVlY2Y3ZGI1NzJkNjk2MWNlM2Q1N2I1NzJlNzYxMzk3YjY3YTJkNmQ5NGM3MmZjOTFkZGRkNzQifX19\"}}}],\"tagType\":10}}}}},\"display\":{\"tagMap\":{\"Lore\":{\"tagList\":[{\"data\":\"§7Keeps you alive when you are on\"},{\"data\":\"§7death\u0027s door, granting a short\"},{\"data\":\"§7period of invincibility.\"},{\"data\":\"§7Consumed on use.\"},{\"data\":\"\"},{\"data\":\"§7§cNOTE: ONLY WORKS ON THE END\"},{\"data\":\"§cISLAND§7.\"},{\"data\":\"\"},{\"data\":\"§5§lEPIC\"},{\"data\":\"§8§m-----------------\"},{\"data\":\"§7Seller: §a[VIP] Taeuschung\"},{\"data\":\"§7Starting bid: §6100,000 coins\"},{\"data\":\"\"},{\"data\":\"§7Ends in: §e12m49s\"},{\"data\":\"\"},{\"data\":\"§eClick to inspect!\"}],\"tagType\":8},\"Name\":{\"data\":\"§f§f§5Remnant of the Eye\"}}},\"ExtraAttributes\":{\"tagMap\":{\"originTag\":{\"data\":\"BOSS_SPAWN\"},\"id\":{\"data\":\"REMNANT_OF_THE_EYE\"},\"uuid\":{\"data\":\"f28278eb-cd2d-4527-9abd-f5d83512e3af\"},\"timestamp\":{\"data\":\"10/30/19 7:59 AM\"}}},\"AttributeModifiers\":{\"tagList\":[],\"tagType\":0}}}";
    let inStr = "{\"field_74784_a\":{\"ench\":{\"field_74747_a\":[],\"field_74746_b\":0},\"Unbreakable\":{\"field_74756_a\":1},\"HideFlags\":{\"field_74748_a\":254},\"display\":{\"field_74784_a\":{\"Lore\":{\"field_74747_a\":[{\"field_74751_a\":\"§7Damage: §c+130 §e(+20)\"},{\"field_74751_a\":\"§7Strength: §c+47 §e(+20) §8(Grand +17)\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§9Aiming V\"},{\"field_74751_a\":\"§9Cubism V\"},{\"field_74751_a\":\"§9Dragon Hunter III\"},{\"field_74751_a\":\"§9Infinite Quiver V\"},{\"field_74751_a\":\"§9Piercing I\"},{\"field_74751_a\":\"§9Power V\"},{\"field_74751_a\":\"§9Snipe III\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§6Item Ability: Stinger\"},{\"field_74751_a\":\"§8Fully charged shots while sneaking\"},{\"field_74751_a\":\"§7Slows the victim and deal §c35x\"},{\"field_74751_a\":\"§c§7your §cStrength ❁ §7as damage\"},{\"field_74751_a\":\"§7per second for §a6s§7.\"},{\"field_74751_a\":\"§8Mana Cost: §3150\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§c☠ §5Requires Spider LVL 3\"},{\"field_74751_a\":\"§5§lEPIC BOW\"},{\"field_74751_a\":\"§8§m-----------------\"},{\"field_74751_a\":\"§7Seller: §a[VIP§6+§a] askito\"},{\"field_74751_a\":\"§7Bids: §a3 bids\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§7Top bid: §611,000,000 coins\"},{\"field_74751_a\":\"§7Bidder: §b[MVP§c+§b] ZeSafe\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§7Ends in: §e01h13m31s\"},{\"field_74751_a\":\"\"},{\"field_74751_a\":\"§eClick to inspect!\"}],\"field_74746_b\":8},\"Name\":{\"field_74751_a\":\"§f§f§5Grand Scorpion Bow\"}}},\"ExtraAttributes\":{\"field_74784_a\":{\"hot_potato_count\":{\"field_74748_a\":10},\"hotPotatoBonus\":{\"field_74751_a\":\"STRENGTH\u003d20;DAMAGE\u003d20;\"},\"modifier\":{\"field_74751_a\":\"grand\"},\"originTag\":{\"field_74751_a\":\"CRAFTING_GRID_COLLECT\"},\"id\":{\"field_74751_a\":\"SCORPION_BOW\"},\"enchantments\":{\"field_74784_a\":{\"dragon_hunter\":{\"field_74748_a\":3},\"piercing\":{\"field_74748_a\":1},\"infinite_quiver\":{\"field_74748_a\":5},\"snipe\":{\"field_74748_a\":3},\"power\":{\"field_74748_a\":5},\"cubism\":{\"field_74748_a\":5},\"aiming\":{\"field_74748_a\":5}}},\"uuid\":{\"field_74751_a\":\"4ba776c2-3d28-466d-9237-535e76abcc91\"},\"anvil_uses\":{\"field_74748_a\":13},\"timestamp\":{\"field_74751_a\":\"10/30/19 10:18 AM\"}}},\"AttributeModifiers\":{\"field_74747_a\":[],\"field_74746_b\":0}}}";
    let parsed = JSON.parse(inStr);
    console.log(parsed);
    let out = simplifyNbtMap(parsed);
    console.log(" ");
    console.log(" ");
    console.log(JSON.stringify(out));
}

test()

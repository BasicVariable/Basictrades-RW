const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));
const fs = require("node:fs");

var setMilliseconds;

const fetchTimeout = (url, ms, { signal, ...options } = {}) => {
    const controller = new AbortController();
    const promise = fetch(url, { signal: controller.signal, ...options });
    const timeout = setTimeout(() => controller.abort(), ms);
    return promise.finally(() => clearTimeout(timeout));
};

// Add optional caching for images later?
const getUserThumbnail = async (id) => {
    let trys = 0;

    while (trys < 5){
        let response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`)
            .catch(async (err) => {
                await properOutput.error(`Failed to connect to /avatar-headshot:\n${err}`)
            });
        if (!response || response.status!=200) {
            await properOutput.reactiveError("Attempting to reconnect to /avatar-headshot in 10 seconds", 10_000);
            trys++
            continue
        };

        try{
            return (await response.json()).data[0].imageUrl
        }catch(err){
            await properOutput.reactiveError(`Failed to auth account ${cookie.substring(0, 5)}... retrying in 5 seconds`, 5_000)
            trys++
        }
    };

    return "https://cdn.discordapp.com/attachments/616460580991008771/1016848130442006639/unknown.png"
};

const getInventory = async (userId, cookie) => {
    let cursor="", fixedInv = [];

    while (cursor!=null) {
        let response = await fetchTimeout(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Asc&limit=100${cursor}`, 10_000, {
            headers: {'Content-Type': 'application/json', "cookie": ".ROBLOSECURITY="+cookie}
        }).catch((err) => properOutput.error(`Failed to connect to /collectibles:\n${err}`));
        // if this has issues with it getting stuck on one acc in the future I'll add a check for it :eyeroll:
        if (response==null || response.status!=200) {
            await properOutput.reactiveError("Attempting to reconnect to /collectibles in 10 seconds", 10_000)
            continue
        }; 

        try{
            let json = await response.json();
            await json.data.forEach(item => fixedInv.push({userAssetId: item.userAssetId, name: item.name, assetId: item.assetId, rap: item.recentAveragePrice}));

            if (!json.nextPageCursor) {cursor=null; continue};
            cursor=`&cursor=${json.nextPageCursor}`;
        }catch(err){
            await properOutput.reactiveError("Failed to get JSON of response on /collectibles, retrying in 10 seconds", 10_000);
            continue
        };
    };

    return fixedInv
};

const checkAccount = async (cookie) => {
    let trys = 0; while (trys<3){
        let response = await fetch("https://users.roblox.com/v1/users/authenticated", {
            method: "GET",
            headers: {'Content-Type': 'application/json',"cookie": ".ROBLOSECURITY="+cookie}
        }).catch(err => properOutput.error(err));

        if (!response || response.status!=200) {
            trys++
            continue
        };
    
        try{
            return (await response.json())
        }catch(err){
            await properOutput.reactiveError(`Failed to auth account ${cookie.substring(0, 5)}... retrying in 5 seconds`, 5_000)
            trys++
        }
    };
};

const getOwners = async (itemId, cursor, cookie) => {
    while (true) {
        let response = await fetch(`https://inventory.roblox.com/v2/assets/${itemId}/owners?sortOrder=Asc&limit=100${cursor}`, {
            method: "GET",
            headers: {'Content-Type': 'application/json', "cookie": ".ROBLOSECURITY="+cookie}
        }).catch(err => properOutput.error(err));

        if (!response || response.status!=200){
            await properOutput.reactiveError(`Failed to get owners of ${itemId}, retrying in 20 seconds`, 20_000);
            continue
        };

        try{
            return await response.json()
        }catch(err){
            await properOutput.reactiveError(`Failed to parse JSON for inventory API... retrying in 5 seconds`, 5_000)
        }
    };
};

const text2num = (text) => {
    let letter = text.replace(/\d+/, "").toLowerCase();
    let number = parseInt(text.replace(/^\D+/g));
    
    switch (letter) {
        case "d":
            setMilliseconds = 86_400_000;
            break;

        case "w":
            setMilliseconds = 604_800_000;
            break;

        case "m":
            setMilliseconds = 2.629746e+9;
            break;

        case "y":
            setMilliseconds = 33.1556952e+10;
            break;
    
        case "h":
            setMilliseconds = 3_600_000;
            break;
        
        default:
            // assume it's minutes
            if (isNaN(number)) setMilliseconds = 60_000; 
            return null;
    };

    return (setMilliseconds*number)
};

const getActive = async (id, cookie) => {
    if (!setMilliseconds) await text2num(config["mass-send"].lastOnline);

    let trys = 0;
    while (trys<5){
        trys++;
        try{
            let response = await fetchTimeout(`https://api.roblox.com/users/${id}/onlinestatus/`, 4_000, {
                method: "GET",
                headers: {'Content-Type': 'application/json', "cookie": ".ROBLOSECURITY="+cookie}
            }).catch(err => {});

            if (!response || response.status!=200) continue;

            let lastOnline = new Date((await response.json()).LastOnline);
            return (Date.now() - lastOnline.getTime()) <= setMilliseconds
        }catch(err){
            await properOutput.reactiveError(`Failed to check activity for ${id}, retrying in 10 seconds`, 10_000) 
        }
    }
};

const canTrade = async (id, cookie) => {
    let trys = 0;
    while (trys<5){
        trys++;

        let response = await fetchTimeout(`https://roblox.com/users/${id}/trade`, 10_000, {
            headers: {"cookie": ".ROBLOSECURITY="+cookie},
            method: "HEAD"
        }).catch(err => {});

        if (!response) continue;

        if (response.status==403) return false;
        if (response.status!=200) await properOutput.reactiveError(`Failed to check trade-ability of ${id}, retrying in 10 seconds`, 10_000);else{
            return true
        }
    }
};

// this isn't really a Roblox api butttt
const getRolimonsValues = async () => {
    while (true){
        try{
            let req = await fetch((config.auth.valueServer.length>0)?config.auth.valueServer:"https://www.rolimons.com/itemapi/itemdetails")
                .catch((err) => console.log(err)) || {};
            if (!req || req.status!=200) {
                await properOutput.reactiveError("Failed to get new values.\nRetrying in 10 seconds", 10_000); continue
            };

            try{
                let values = (await req.json()).items
                if (values) return values
            }catch(err){
                await properOutput.reactiveError("Failed to parse new values.\nRetrying in 40 seconds", 40_000);
                continue
            }
        }catch(err){
            console.log(err)
        }
    }
};

const getCsrfToken = async (cookie) => {
    while (true){
        let response = await fetch("https://auth.roblox.com/v1/xbox/disconnect", {
            method: "POST",
            headers: {'content-type': 'application/json;charset=UTF-8',"cookie": ".ROBLOSECURITY="+cookie}
        }).catch((err) => {});

        if (!response || response.status!= 403) continue;

        let token = await response.headers.get("x-csrf-token");
        if (!token) {await properOutput.reactiveError("Failed to get csrf token, retrying in 10 seconds"); continue};

        return token
    }
};

const sendTrade = async (tradeData, account) => {
    while (true) {
        let response = await fetchTimeout(`https://trades.roblox.com/v1/trades/send`, 5_000, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json", 
                "cookie": ".ROBLOSECURITY="+account.cookie, 
                'x-csrf-token': await getCsrfToken(account.cookie),
            },
            body: JSON.stringify({
                offers: [
                    {
                        userId: account.id,
                        userAssetIds: tradeData.trade.apiObject.offer,
                        robux: 0
                    },
                    {
                        userId: tradeData.ownerId,
                        userAssetIds: tradeData.trade.apiObject.request,
                        robux: 0
                    }
                ]
            })
        }).catch(err => {});

        if (!response) continue;

        switch (response.status) {
            case 200:
                return true;
        
            case 429:
                await properOutput.reactiveError(`Ratelimited on ${account.name}, timing out for an hour...`, 3.6e+6);
                return false;
                
            case 401:
                await properOutput.reactiveError(`Cookie for ${account.name} is invalid, timing out for an hour...`, 3.6e+6);
                break;

            case 503:
                await properOutput.reactiveError(`Trading system down, timing out for an hour...`, 3.6e+6);
                break;

            default:
                try{
                    let responseJSON = await response.json();
                    await properOutput.reactiveError(`Unknown error (${response.status}) skipping.\n${JSON.stringify(responseJSON, "\t")}`, 5_000);
                    return;
                }catch(err){
                    await properOutput.reactiveError(`Failed to parse JSON on unknown error (${response.status}) retrying in a minute.`, 60_000);
                    break;
                }
        }
    }
};

module.exports = {
    getRolimonsValues,
    checkAccount, 
    getInventory, 
    getUserThumbnail, 
    getOwners, 
    canTrade, 
    getActive, 
    sendTrade
}
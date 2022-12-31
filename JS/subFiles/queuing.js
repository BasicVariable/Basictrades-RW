const delay = ms => new Promise(res => setTimeout(res, ms));

const { QuickDB } = require("quick.db");
const cachedOwnerDB = new QuickDB({ filePath: './assets/cachedOwners_json.sqlite' });

// --- 
const rbxApi = require("./rblxLib.js");
const discordBot = require("./discordBot.js");
// --- 

const checkOwner = async (ownerId, account) => {
    if (!await rbxApi.canTrade(ownerId, account.cookie)) return;
    if (!await rbxApi.getActive(ownerId, account.cookie)) return;

    if (config.output.queueAdditions) properOutput.output(`Added ${ownerId} to sending queue.`, "blue");

    return true
};

const startQueue = async (trade, account, continueous) => {
    let cachedOwners = await cachedOwnerDB.get(`${trade.itemId}`) || [];
    let cycle = 0,  cursor;

    // interval cache of owners checked
    if (config.cache.sentTo) new Promise(async (resolve) => {
        while (robloxAccounts[account.id].scrapingQueue.includes(trade.itemId)){
            await delay(15_000);
            await cachedOwnerDB.set(`${trade.itemId}`, cachedOwners)
        };
        resolve()
    });

    robloxAccounts[account.id].scrapingQueue.push(trade.itemId);

    while (robloxAccounts[account.id].scrapingQueue.includes(trade.itemId)){

        // .reduce just didn't work w/ this for some reason
        let hasItems = [];
        robloxAccounts[account.id].inventory.forEach(item => {
            let hasItem = trade.apiObject.offer.filter(uaid => uaid == `${item.userAssetId}`);

            if (hasItem.length>0) hasItems.push(hasItem)
        });
        if (hasItems.length != trade.apiObject.offer.length) {
            properOutput.output(`Queuing for ${trade.itemId} stopped, you no longer have all the items in the trade`, "red");
            return
        };

        let ownersJSON = await rbxApi.getOwners(trade.itemId, (!cursor)?"":`&cursor=${cursor}`, account.cookie);
        let tradePromises = [];

        for (item of ownersJSON.data){
            if (!item.owner || item.owner.id == account.id || config["mass-send"].doNotSendTo.includes(item.owner.id)) continue;

            if (config.output.searchedPeople) properOutput.output(`Searching ${item.owner.id} (owner of ${trade.itemId})`, "yellow");

            // [time cached, owner]
            if (cachedOwners.includes(item.owner.id)){
                let cachedOwner = cachedOwners.filter(cache => (cache[1] == item.owner.id));
                if (Date.now() - cache[0] > 4.32e+7) {
                    let ownerIndex = cachedOwners.indexOf(cachedOwner);
                    cachedOwners.splice(ownerIndex, 1);

                }else continue
            }

            cachedOwners.push([Date.now(), item.owner.id]);

            tradePromises.push(
                new Promise(async (resolve) => {
                    let ownerId = item.owner.id, uaid = item.id, itemId = trade.itemId;
                    let sendTo = await checkOwner(ownerId, account);

                    if (sendTo) robloxAccounts[account.id].queue.push({trade: {
                        itemId,
                        apiObject: {
                            offer: trade.apiObject.offer,
                            request: [uaid]
                        } 
                    }, ownerId});
                    resolve();
                })
            )
        };

        if (tradePromises.length>0) await Promise.all(tradePromises);

        if (!ownersJSON.nextPageCursor){
            if (continueous){
                if (cycle > 5) await properOutput.reactiveError(`Waiting 4 hours before continuing search for new owners on ${trade.itemId}`, 1.8e+7);
                cycle++; cursor = null
            }else{
                let scrapingIndex = robloxAccounts[account.id].scrapingQueue.indexOf(trade.itemId);
                robloxAccounts[account.id].scrapingQueue.splice(scrapingIndex, 1)
            }
        }else cursor = ownersJSON.nextPageCursor
    }
};

const successfulTrade = async (tradeData, account) => {
    // .reduce also didn't work here, maybe I'm just using it wrong?
    let offerTotal = {
        value: 0,
        rap: 0,
        string: ""
    };
    robloxAccounts[account.id].inventory.forEach(item => {
        let hasItem = tradeData.trade.apiObject.offer.filter(uaid => uaid == item.userAssetId);

        if (hasItem.length>0) {
            offerTotal.value += rolimonsValues[item.assetId][4];
            offerTotal.rap += rolimonsValues[item.assetId][2];
            offerTotal.string += `${rolimonsValues[item.assetId][0]} (${rolimonsValues[item.assetId][4]}) ${(rolimonsValues[item.assetId][7]==1)?" ⚠️":""}\n`
        }
    });
    
    // const itemOwnerUsername = await rbxApi.getUsername(tradeData.ownerId);

    let embed = {
        color: 0x0044ff,
        title: `***Sent trade to ${tradeData.ownerId}: ***`,
        "author": {
            "name": `${account.name}`,
            "url": `https://www.rolimons.com/player/${account.id}`,
            "icon_url": await rbxApi.getUserThumbnail(account.id)
        },
        fields: [
            {
                name: '***Offer 📡:***',
                value: `${offerTotal.string}\n**Total Value:** ${offerTotal.value}\n**Total Rap:** ${offerTotal.rap}`,
                inline: true,
            },
            {
                name: '***Request 📲:***',
                value: `${rolimonsValues[tradeData.trade.itemId][0]}\n**Total Value:** ${rolimonsValues[tradeData.trade.itemId][4]}\n**Total Rap:** ${rolimonsValues[tradeData.trade.itemId][2]}`,
                inline: true,
            }
        ],
        thumbnail: {
            url: await rbxApi.getUserThumbnail(tradeData.ownerId),
            height: 0,
            width: 0
        },
        timestamp: new Date(),
        "footer": {
            "text": 'discord.gg/callie • Basic#2142',
            "icon_url": 'https://media.discordapp.net/attachments/616460506231865357/827917363969654784/Island_Logo_2.png',
        },
        url: `https://www.roblox.com/users/${tradeData.ownerId}/profile`
    };

    discordBot.sendMessage({embeds: [embed]}, config.input.discord.channels.output)
};

module.exports = startQueue;

// trade sender
var tradesSent = {};

new Promise(async () => {
    while (true){
        await delay(1000);
        for (account of Object.values(robloxAccounts)){
            if (!tradesSent[account.id]) tradesSent[account.id]=0;
            if (tradesSent[account.id]>15) continue;
    
            if (account.queue.length<1) continue;
    
            let tradeData = account.queue.shift();
            if (!tradeData) continue;
    
            // removes trades w/ items no longer owned
            let hasItems = [];
            robloxAccounts[account.id].inventory.forEach(item => {
                let hasItem = tradeData.trade.apiObject.offer.filter(uaid => uaid == `${item.userAssetId}`);

                if (hasItem.length>0) hasItems.push(hasItem)
            });
            if (hasItems.length != tradeData.trade.apiObject.offer.length) continue;

            successfulTrade(tradeData, account);
            let success = await rbxApi.sendTrade(tradeData, account);
            if (success==false) tradesSent[account.id] = 0;
    
            if (success==true){
                successfulTrade(tradeData, account);
    
                tradesSent[account.id]++;
                if (tradesSent[account.id]>15) setTimeout(() => {
                    tradesSent[account.id] = 0
                }, 3.6e+6)
            }
        }
    }
})
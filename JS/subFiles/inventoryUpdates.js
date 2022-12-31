const delay = ms => new Promise(res => setTimeout(res, ms));

// --- 
const rbxApi = require("./rblxLib.js");
const sendDiscordMessage = require("./discordBot.js").sendMessage;
// --- 

const sendUpdate = async (trade, account) => {
    const offerTotal = {
        value: trade[0].reduce((a, current) => a+=rolimonsValues[current.assetId][4]),
        rap: trade[0].reduce((a, current) => a+=rolimonsValues[current.assetId][2]),
        string: trade[0].reduce((a, current) => a+=`${current.name} (${rolimonsValues[current.assetId][4]}) ${(rolimonsValues[current.assetId][7]==1)?" ⚠️":""}\n`)
    };
    const requestTotal = {
        value: trade[1].reduce((a, current) => a+=rolimonsValues[current.assetId][4]),
        rap: trade[1].reduce((a, current) => a+=rolimonsValues[current.assetId][2]),
        string: trade[1].reduce((a, current) => a+=`${current.name} (${rolimonsValues[current.assetId][4]}) ${(rolimonsValues[current.assetId][7]==1)?" ⚠️":""}\n`)
    };

    let embed = {
        "title": `New Completed 🤑:`,
        "description": `Completeds are detected by the inventory API, if you see that more than 4 items are added to the request or offer side that is because more than one trade was completed within 10 seconds.`,
        "color": 0x0044ff,
        "author": {
            "name": `${account.name}`,
            "url": `https://www.rolimons.com/player/${account.id}`,
            "icon_url": await rbxApi.getUserThumbnail(account.id)
        },
        "fields": [
            {
                "name": `Offer 📡:`,
                "value": `${offerTotal.string}\n**Total Value:** ${offerTotal.value}\n**Total Rap:** ${offerTotal.rap}`,
                "inline": true
            },
            {
                "name": `Request 📲:`,
                "value": `${requestTotal.string}\n**Total Value:** ${requestTotal.value}\n**Total Rap:** ${requestTotal.rap}`,
                "inline": true
            },
            {
                "name": `Summary 📊:`,
                "value": `> **Profit:** ${requestTotal.value-offerTotal.value}\n> **%Increase:** ${Math.round(((offerTotal.value-requestTotal.value)/requestTotal.value*100)*-1)}`
            }
        ],
        "timestamp": Date.now(),
        "footer": {
            "text": 'discord.gg/callie • Basic#2142',
            "icon_url": 'https://media.discordapp.net/attachments/616460506231865357/827917363969654784/Island_Logo_2.png',
        }
    };

    sendDiscordMessage({embeds: [embed]}, config.input.discord.channels.completeds)
};

const loopCheck = async (account) => {
    let secondCheck;
    while (true){
        let newInventory = await rbxApi.getInventory(account.id, account.cookie);

        if (!newInventory || newInventory.length <= 0) return;

        if (robloxAccounts[account.id].inventory.length <= 0){
            robloxAccounts[account.id].inventory = newInventory; return
        };

        let offer = robloxAccounts[account.id].inventory.filter(item => 
            !newInventory.find(newItem => newItem.userAssetId == item.userAssetId)
        );
        let request = newInventory.filter(item => 
            !robloxAccounts[account.id].inventory.find(oldItem => oldItem.userAssetId == item.userAssetId)
        );

        if ((offer.length && request.length) > 0) {
            sendUpdate([offer, request], account)
        }else if ((offer.length || request.length) > 0 && !secondCheck){
            secondCheck = true;
            continue
        };

        robloxAccounts[account.id].inventory = newInventory;
        secondCheck = null;

        await delay(10_000)
    }
};

const start = () => {
    for (account of Object.values(robloxAccounts)){
        loopCheck(account)
    }
};

module.exports = start;
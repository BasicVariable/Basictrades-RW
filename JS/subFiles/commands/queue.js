const stringSimilarity = require("string-similarity");
const readline = require('node:readline');
// ----
const queue = require("../queuing.js");
const rbxApi = require("../rblxLib.js");
// ----

var commmands = {};

const rankSimilarity = async (string, array) => {
    let distanceMap = new Map();

    for (comparable in array){
        let distance = stringSimilarity.compareTwoStrings(comparable, string.toLowerCase());
        
        distanceMap.set(
            comparable,
            distance
        )
    };

    let sortedMap = [...distanceMap.entries()].sort((a, b) => b[1]-a[1]);
    let closest = sortedMap.entries().next().value[1];

    if (closest[1] > 0.2) return closest[0]
};

const confirmTrade = async (offer, request, account, message) => {
    let uaids2ids = offer.reduce((a, c) => a[a.length+1]=(account.inventory.filter(item => item.userAssetId == c)[0]) || null, []);
    if (uaids2ids.length != offer.length  && !"name" in uaids2ids) return [`Not all items offered are owned by ${account.name}`, false];

    // No idea why it decides it's an object when it's initial value is an array wtff
    if ("name" in uaids2ids) uaids2ids = [uaids2ids];

    const offerTotal = {
        value: uaids2ids.reduce((a, current) => a+=rolimonsValues[current.assetId][4], 0),
        rap: uaids2ids.reduce((a, current) => a+=rolimonsValues[current.assetId][2], 0),
        string: uaids2ids.reduce((a, current) => a+=`${rolimonsValues[current.assetId][0]} (${rolimonsValues[current.assetId][4]}) ${(rolimonsValues[current.assetId][7]==1)?" ⚠️":""}\n`, "")
    };

    if (!message){
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await rl.question(`Send trade (yes/no)? [${uaids2ids}] (${offerTotal.value}) => [${rolimonsValues[current][0]}] (${rolimonsValues[current][4]})`);
        rl.close();

        return (answer)?["Queuing trade to be sent", true]:["Canceled trade", false]
    };
    let prompt = await message.channel.send({
        components: [
            {
                "type": 1,
                "components": [
                {
                    "style": 1,
                    "label": `✅`,
                    "custom_id": `accept`,
                    "disabled": false,
                    "type": 2
                },
                {
                    "style": 1,
                    "label": `❌`,
                    "custom_id": `decline`,
                    "disabled": false,
                    "type": 2
                }
                ]
            }
        ],
        embeds: [
            {
                color: 0x0044ff,
                title: `***Send trade?***`,
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
                        value: `${rolimonsValues[request][0]}\n**Total Value:** ${rolimonsValues[request][4]}\n**Total Rap:** ${rolimonsValues[request][2]}`,
                        inline: true,
                    }
                ],
                timestamp: new Date(),
                "footer": {
                    "text": 'discord.gg/callie • Basic#2142',
                    "icon_url": 'https://media.discordapp.net/attachments/616460506231865357/827917363969654784/Island_Logo_2.png',
                }
            }
        ]
    });

    return await new Promise(async (resolve) => {
        const filter = (i) => i.componentType == 2;

        prompt.awaitMessageComponent({filter, time: 60_000, errors: ['time']})
            .then(i => {
                i.deferUpdate();

                if (i.customId==="accept") resolve(["Queuing trade to be sent", true]); else
                    resolve(["Canceled trade", false]);
            })
            .catch(() => resolve(["Ran out of time to respond", false]));
    })
};

commmands.clearqueue = async (args) => {
    let account;
    if (!args[1]) account = (Object.values(robloxAccounts))[0];else{
       let accountMatches = Object.values(robloxAccounts).filter(acc => (acc.name).toLowerCase() === args[1]); 
       if (accountMatches.length<1) return "Failed to find account";
    };

    account.scrapingQueue = [];
    account.queue = [];

    return `Cleared queue for ${account.name}`
};

commmands["mass-send"] = async (args, content, message) => {
    let continuous = args[1], account, request = args[3], offer = (content.substring(content.indexOf(args[4]))).split(",");

    if (!Boolean(continuous)) return "Continuous isn't set to true/false";

    let accountMatches = Object.values(robloxAccounts).filter(acc => (acc.name).toLowerCase() === args[2]);
    if (accountMatches.length>0) account = accountMatches[0]; else return "Couldn't find account";

    if (isNaN(request) == true){
        let itemNames = (Object.values(rolimonsValues).reduce((a, c) => a[a.length+1] = c[0], []));
        let similarItem = await rankSimilarity(request, itemNames);

        if (!similarItem) return "Couldn't find a similar item name to the one requested";

        let name2id = Object.keys(rolimonsValues).filter(id => rolimonsValues[id][0] === similarItem);
        request = name2id[0];
    }else if (!rolimonsValues[request]) return "Item entered doesn't exist";

    if (account.scrapingQueue.includes(request)) return "Item is already being queued";

    let confirmationResponse = await confirmTrade(offer, request, account, message);
    if (confirmationResponse[1]) queue({
        itemId: request,
        apiObject: {offer}
    }, account, continuous)

    return confirmationResponse[0]
};

const reaction = async (args, content, message) => {
    let response = await commmands[(args[0]).toLowerCase()](args, content, message) || `Command failed to respond`;

    if (!message) return response;

    let feedback = await message.reply(response)
        .catch(err => {
            // incase I reply in an interaction function already
            message.editReply(response)
                .catch(err2 => console.log(err, err2));
        });

    setTimeout(()=>{
        feedback.delete()
            .catch(err => console.log(err));
    }, 10000);

    return false
};

module.exports = {
    data: [
        {
            name: "mass-send",
            description: "Mass sends a specific trade to the owners of an item. Seperate items with commmas in the offer section",
            options: "[continuous sending? (true/false)] [account] [request] [offer]",
            permissions: []
        },
        {
            name: "clearQueue",
            description: "Clears the sending queue for an account, default for account is the first account in the cookies list.",
            options: "[account]",
            permissions: []
        }
    ],
    reaction
}
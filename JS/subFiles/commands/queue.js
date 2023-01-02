const stringSimilarity = require("string-similarity");
const readline = require('node:readline');
// ----
const queue = require("../queuing.js");
const rbxApi = require("../rblxLib.js");
// ----

var commmands = {};

const rankSimilarity = async (string, array) => {
    let distanceMap = new Map();

    for (comparable of array){
        let distance = stringSimilarity.compareTwoStrings(comparable, string);
        
        distanceMap.set(
            comparable,
            distance
        )
    };

    let sortedMap = [...distanceMap.entries()].sort((a, b) => b[1]-a[1]);
    let closest = sortedMap.entries().next().value[1];

    if (closest[1] > 0.2) return closest[0]
};

const createQuestion = async (message, question) => {
    const embed = {
        content: `${question}\n*Action automatically cancels in 60 seconds*`,
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
        ]
    };

    let botQuestion = await message.reply(embed)
        .catch(async (err) => properoutput.error(`Failed to ask questio\n${err}`));

    return await new Promise(async (resolve) => {
        if (!botQuestion) resolve();

        const filter = (i) => i.componentType == 2;
        botQuestion.awaitMessageComponent({filter, time: 60_000, errors: ['time']})
            .then(i => {
                i.deferUpdate();

                if (i.user.id != message.author.id) return;

                if (i.customId==="accept") resolve(true); else
                    resolve(false);
            })
            .catch(() => resolve(false));
    })
};

const confirmTrade = async (offer, request, account, message) => {
    let uaids2ids = [];

    for (uaid of offer){
        let hasItem = account.inventory.filter(item => item.userAssetId == uaid)[0];
        if (!hasItem) continue;

        uaids2ids.push(hasItem.assetId)
    };

    if (uaids2ids.length < offer.length) return [`Some of the offer items aren't owned by ${account.name}`, false];

    const offerTotal = {
        value: uaids2ids.reduce((a, current) => a+=rolimonsValues[current][4], 0),
        rap: uaids2ids.reduce((a, current) => a+=rolimonsValues[current][2], 0),
        string: uaids2ids.reduce((a, current) => a+=`${rolimonsValues[current][0]} (${rolimonsValues[current][4]}) ${(rolimonsValues[current][7]==1)?" ⚠️":""}\n`, "")
    };

    if (!message){
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await rl.question(`Send trade (yes/no)? [${uaids2ids}] (${offerTotal.value}) => [${rolimonsValues[request][0]}] (${rolimonsValues[request][4]})`);
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

                if (i.user.id != message.author.id) return;

                if (i.customId==="accept") resolve(["Queuing trade to be sent", true]); else
                    resolve(["Canceled trade", false]);
            })
            .catch(() => resolve(["Ran out of time to respond", false]));
    })
};

commmands.clearqueue = async (args, content, message) => {
    let account;

    if (!args[1]){
        let accounts = Object.values(robloxAccounts);
        for (account of accounts){
            robloxAccounts[account.id].scrapingQueue = [];
            robloxAccounts[account.id].queue = [];
        };

        return "Cleared the queue for all accounts"
    };

    let accountMatches = Object.values(robloxAccounts).filter(acc => (acc.name).toLowerCase() === (args[1] || "").toLowerCase());
    if (accountMatches.length > 0) account = accountMatches[0]; else{
        let accountNames = Object.values(robloxAccounts).reduce((a, current) => a[a.length+1] = current.name, []);
        // some reason it converts to an string even though the initial is an array??
        if (typeof accountNames === "string") accountNames = [accountNames];

        let similarName = await rankSimilarity(args[1], accountNames);
        if (!similarName) return "Couldn't similar username to the one requested";

        let userConfirmation = await createQuestion(message, `**"${args[1]}"** wasn't found, did you mean **"${similarName}"**?`);
        if (!userConfirmation) return "Mass-send request canceled";

        account = (Object.values(robloxAccounts).filter(acc => acc.name === similarName))[0]
    };

    robloxAccounts[account.id].scrapingQueue = [];
    robloxAccounts[account.id].queue = [];

    return `Cleared queue for ${account.name}`
};

commmands["mass-send"] = async (args, content, message) => {
    // args: [0] = command name [1] = account name [2] = item to request [3] = items to send
    let account, 
        request = args[2], 
        continuous, 
        offer = content.substring(content.indexOf(request)+request.length)
            .replace(/[ ]/g, "")
            .split(",");

    let accountMatches = Object.values(robloxAccounts).filter(acc => (acc.name).toLowerCase() === (args[1]).toLowerCase());
    if (accountMatches.length > 0) account = accountMatches[0]; else{
        let accountNames = Object.values(robloxAccounts).reduce((a, current) => a[a.length+1] = current.name, []);
        // some reason it converts to an string even though the initial is an array??
        if (typeof accountNames === "string") accountNames = [accountNames];

        let similarName = await rankSimilarity(args[1], accountNames);
        if (!similarName) return "Couldn't similar username to the one requested";

        let userConfirmation = await createQuestion(message, `**"${args[1]}"** wasn't found, did you mean **"${similarName}"**?`);
        if (!userConfirmation) return "Mass-send request canceled";

        account = (Object.values(robloxAccounts).filter(acc => acc.name === similarName))[0]
    };

    if (isNaN(request)){
        let itemNames = (Object.values(rolimonsValues).reduce((a, c) => a[a.length+1] = c[0], []));

        let similarItem = await rankSimilarity(request, itemNames);
        if (!similarItem) return "Couldn't find a similar item name to the one requested";

        let userConfirmation = await createQuestion(message, `**"${request}"** wasn't found, did you mean **"${similarItem}"**?`);
        if (!userConfirmation) return "Mass-send request canceled";

        request = (Object.keys(rolimonsValues).filter(id => rolimonsValues[id][0] === similarItem))[0];
    }else if (!rolimonsValues[request]) return "Item entered doesn't exist";

    if (account.scrapingQueue.includes(request)) return "Item is already being queued";

    let beContinuous = await createQuestion(message, `Would you like BT to constantly check for new owners on this item or just send to all the recently online owners?\n✅=continuous/❌=one time`);
    continuous = (beContinuous)?true:false;

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
            options: "[account] [request] [offer]",
            permissions: []
        },
        {
            name: "clearQueue",
            description: "Clears the sending queue for an account, default for account is all accounts in the cookies list.",
            options: "[account]",
            permissions: []
        }
    ],
    reaction
}

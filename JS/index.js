const fs = require("node:fs");
const delay = ms => new Promise(res => setTimeout(res, ms));

const chalk = require("chalk");
const yaml = require('js-yaml');

// --- 
const rbxApi = require("./subFiles/rblxLib.js");
// --- 

global.robloxAccounts = {};

global.properOutput = {
    output: (text, style) => {
        console.log(chalk.keyword(style)(`[${(new Date()).toLocaleString('en-US')}] - ${text}`));

        return (update, newStyle) => {
            console.log(
                "    >",
                chalk.keyword(newStyle)(` [${(new Date()).toLocaleString('en-US')}] - ${update}`)
            );
        }
    },
    error: (text) => properOutput.output(text, "red"),
    reactiveError: async (text, msDelay, reaction) => await new Promise((resolve) => {
        properOutput.error(text);
        setTimeout(() => {
            if (reaction) reaction(); 
            resolve()
        }, msDelay);
    })
};

fs.readFile("./config.yml", 'utf-8', async (err, res) => {
    if (err) await properOutput.reactiveError(`Failed to read config.yml\nStopping process in 20 seconds...`, 20_000, process.exit);
    
    try{
        // Gave up trying to make it a var, pretty much ever file needs it
        global.config = yaml.load(res)
    }catch(err){
        await properOutput.reactiveError(`Failed to read config.yml\nStopping process in 20 seconds...`, 20_000, process.exit);
    };

    for (cookie of config.auth.cookies){
        if (cookie.length<10) continue;
        
        let authResponse = await rbxApi.checkAccount(cookie);
        if (!authResponse) continue;

        robloxAccounts[authResponse.id] = {
            name: authResponse.name,
            id: authResponse.id,
            scrapingQueue: [],
            queue: [],
            inventory: [],
            cookie: cookie
        }
    };

    if (Object.keys(robloxAccounts).length < 1) properOutput.reactiveError(
        "All the cookies listed in your config are invalid.\nStopping process in 20 seconds...",
        20_000, 
        process.exit()
    );

    // Couldn't think of anything else atm
    properOutput.output(`Authenticated: [${
        Object.values(robloxAccounts).reduce((a, current) => a[a.length+1] = current.name, [])
    }]`.replace(/,/g, ", "), "green");

    // Values 
    let gettingValues = properOutput.output("Getting values...", "yellow");
    new Promise(async () => {
        while (true){
            await delay(50_000);
            global.rolimonsValues = await rbxApi.getRolimonsValues();
        }
    });
    global.rolimonsValues = await rbxApi.getRolimonsValues();
    gettingValues("Got values!", "green");

    // Discord bot
    let startingDiscordBot = properOutput.output("Starting Discord bot...", "yellow");
    await require("./subFiles/discordBot.js").start();;
    startingDiscordBot("Started Discord bot!", "green")

    // Inventory checker
    await require("./subFiles/inventoryUpdates.js")();
    properOutput.output("Started inventory checking for all accounts", "green");
})  
const fs = require("node:fs");
const readline = require('node:readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const { Client, Events, Collection, GatewayIntentBits } = require('discord.js');

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});
global.discordCommands = new Collection();

const setupCommands = async () => {
    for (file of fs.readdirSync("./JS/subFiles/commands")){
        if (!file.endsWith(".js")) continue;

        const commandFile = require(`./commands/${file}`);
        const commands = commandFile.data;

        for (command of commands){
            if (!("name" && "reaction" && "permissions") in command) continue;
            discordCommands.set(command.name, {
                data: command,
                reaction: commandFile.reaction
            })
        };
    };
};

const embedToText = (embed) => {
    if (typeof embed === "String") return embed;

    embed = embed.embeds[0];
    let textualizedEmbed = `${embed.title}${
        (embed.description)?"\n\t> "+embed.description:""
    }\n\n`

    for (let i = 0; embed.fields.length>i; i++){
        let field = embed.fields[i], nextField = embed.fields[i+1];

        if (field.skip) continue;

        // In lines
        if (nextField && (nextField.inline && field.inline)){
            textualizedEmbed+=`---------\n${field.name}\t | ${nextField.name}\n\t> ${field.value} | \t> ${nextField.value}\n---------`;
            nextField.skip = true;
            continue
        };

        textualizedEmbed+=`---------\n${field.name}\n\t> ${field.value}\n---------`
    };

    return textualizedEmbed
};

const sendMessage = async (message, channelId) => {
    for (guild of discordClient.guilds.cache){
        console.log(guild,guild[1],channelId)
        let channel = guild[1].channels.cache.get(channelId);
        if (!channel) continue;

        let sentMessage = channel.send(message)
            .catch(err => console.log(err));

        return sentMessage;
    }
};

const start = async () => await new Promise((resolve) => {  
    let token = config.input.discord.botToken, prefix = config.input.botPrefix;
    try{

        setupCommands();

        if (token.length<10) {
            rl.on('line', async (input) => {
                if (!input.substring(0, prefix.length)  === prefix) return;

                let fixedContent = input.substring(prefix.length);
                let arguments = fixedContent.split("\s");
                let command = discordCommands.get(arguments[0]);
            
                if (!command) return;
            
                let commandResponse; 
                try{
                    commandResponse = await command.reaction(arguments, fixedContent)
                }catch(err){
                    properOutput.error(err)
                };

                let textEmbed = embedToText(commandResponse);

                properOutput.output(textEmbed, "blue")
            });
            resolve(); return
        };

        discordClient.once(Events.ClientReady, () => {

            discordClient.on("messageCreate", async (message) => {  
                if (message.author.bot) return;
                if (message.content.substring(0, prefix.length)  != prefix) return;

                let fixedContent = message.content.substring(prefix.length);
                let arguments = fixedContent.split(" ");
                let command = discordCommands.get(arguments[0]);

                if (!command) {
                    properOutput.error(`Command (${arguments[0]}) is invalid`);
                    return
                };

                let user = message.guild.members.cache.get(message.author.id);
                if (user==null) return;

                // if the premissions array is empty it's only for the guild owner
                if (command.data.permissions.length>0 && !user.roles.cache.some(role => command.data.permissions.includes(role.name))) {
                    interaction.reply({content:`You aren't allowed to use ${interaction.commandName}`, ephemeral: true})
                        .catch(err => console.log(err));
                    return
                };

                if (command.data.permissions.length<=0 && message.author.id != message.guild.ownerId) return;

                let commandResponse; 
                try{
                    commandResponse = await command.reaction(arguments, fixedContent, message)
                }catch(err){
                    properOutput.error(err)
                };

                if (commandResponse != false) message.channel.send(commandResponse || `<@${message.author.id}>, ${arguments[0]} failed to respond.`)
                    .catch(err => properOutput.error(err));
            });

            resolve()
        });

        discordClient.login(token)
    }catch(err){
        properOutput.reactiveError(`Failed to start discord bot.\nClosing process in 20 seconds\n${err}`, 20_000, process.exit())
    }
});

module.exports = {start, sendMessage}
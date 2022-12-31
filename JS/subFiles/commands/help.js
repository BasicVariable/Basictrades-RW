var pages = [];

const filter = (interaction) => interaction.componentType == 2;

const updatePages = () => {
    for (command of global.discordCommands.entries()){
        command = command[1];

        // creates new page if there are no pages or if there are 5 commands on the current page
        if (pages.length<=0) pages[0]=[];
        if (pages[pages.length-1].length >= 5) pages[pages.length]=[];

        pages[pages.length-1].push({
            "name": `• ${command.data.name} ${command.data.options}`,
            "value": `${command.data.description}${(command.data.permissions.length>0)?`\n> [${command.data.permissions}]`.replace(/,/g, ", "):""}`
        });
    };
};

const reaction = async (args, content, message) => {
    let helpEmbed = {
        "components": [
            {
                "type": 1,
                "components": [
                {
                    "style": 1,
                    "label": `◀`,
                    "custom_id": `backPage`,
                    "disabled": false,
                    "type": 2
                },
                {
                    "style": 1,
                    "label": `▶`,
                    "custom_id": `frontPage`,
                    "disabled": false,
                    "type": 2
                }
                ]
            }
        ],
        "embeds": [
            {
                "type": "rich",
                "title": `Command List (Page: 0)`,
                "description": `Current list of commands that can be given to Basictrades.`,
                "color":  0x0044ff,
                "fields": [
                {
                    "name": `• AAAA`,
                    "value": `AAAAAAAAAAAAAAAAAAAAA`
                }
                ],
                "timestamp": new Date(),
                "author": {
                "name": `Basictrades-RW`,
                "url": `https://github.com/BasicVariable/Basictrades-RW`,
                "icon_url": `https://cdn.discordapp.com/attachments/616460506231865357/1050421211752058910/Untitled_Artwork.png`
                },
                "footer": {
                "text": `discord.gg/callie • Basic#2142`,
                "icon_url": `https://cdn.discordapp.com/attachments/616460506231865357/1050421211752058910/Untitled_Artwork.png`
                }
            }
        ],
        fetchReply: true
    };
    
    if (pages.length<=0) updatePages();

    let page = parseInt(args[1]);

    helpEmbed.embeds[0].fields=pages[
        (()=>{
            if (page && isNaN(page) && page<=pages.length) {
                helpEmbed.embeds[0].title=helpEmbed.embeds[0].title.slice(0, helpEmbed.embeds[0].title.indexOf("Page: ")+6)+`${page})`;
                return page
            };

            return 0
        })()
    ];

    if (!message) return helpEmbed;
    let reply = await message.reply(helpEmbed);

    reply.createMessageComponentCollector({ filter, time: 120_000 }).on('collect', i =>  {
        if (i.user.id != message.author.id) i.reply({content:`You aren't allowed to interact with this embed.`, ephemeral: true});

        i.deferUpdate()
            .catch(err => console.log(`Interaction failed.`, err));

        let currentPage = parseInt(helpEmbed.embeds[0].title.slice(helpEmbed.embeds[0].title.indexOf("Page: ")+6, helpEmbed.embeds[0].title.length-1));

        if (i.customId==="frontPage" && currentPage+1<=pages.length-1) {
            currentPage=currentPage+1;
            helpEmbed.embeds[0].fields=pages[currentPage]
        };
        if (i.customId==="backPage" && currentPage-1>=0) {
            currentPage=currentPage-1;
            helpEmbed.embeds[0].fields=pages[currentPage]
        };

        helpEmbed.embeds[0].title=helpEmbed.embeds[0].title.slice(0, helpEmbed.embeds[0].title.indexOf("Page: ")+6)+`${currentPage})`;
        helpEmbed.components[0].components[1].disabled=(currentPage>=pages.length-1)?true:false;
        helpEmbed.components[0].components[0].disabled=(currentPage<=0)?true:false;

        reply.editMessage(helpEmbed)
            .catch(err=>console.log(err));
    });

    return "Sent command list!"
};

module.exports = {
    data: [
        {
            name: "help",
            description: "Lists every command.",
            options: "[page]",
            permissions: ["@everyone"]
        }
    ],
    reaction
}
# Basictrades-RW
Basictrades is a trading assistant that currently helps you send trades to active owners of a specific item, the entire project will remain open-source and updated throughout time.

# Installation
BT is known to work on Linux and Windows 10+ at the moment, for additional support on other OSes check the discord server (bottom of readme)
```
1. Download all the files in this repository through the code button and by clicking "download zip"
2. Extract the zip and open the folder the files are in
3. Run the "run.sh" file (Linux users follow 3a-3c) 
  3a. Linux users will need to right click the file
  3b. Click "Properties"
  3c. Go to permissions and click "Allow executing files as program"
```

# Discord Bot Token
```
1. Go to "https://discord.com/developers/applications" and login to your discord account
2. Press "New Application" and name the bot anything you'd like
3. Click the three bars at the top right of the screen and click the "Bot" tab (if you don't see the 3 dots just click the "bot" tab omfg)
4. Create a bot and click "reveal token"
5. Copy the token and paste it into the string that follows "bot_token": in the config.json file
6. Go back to the sub-menu that you got through step 3 and pess "OAuth2" then press "URL Generator"
7. Click the "Bot" check-mark under scopes and give the bot "Administrator" permisisons.
8. Copy the Generated link and use it to invite the bot to your server
```

# Config Documentation

auth > cookies
  - Roblox roblosecurity cookies for the accounts you would like to use, cookies should be adding like this:
```
auth: 
  cookies:
  - "cookie"
  - "cookie"
```

auth > valueServer
  - link to a personal/private value server which would output values you'd like the bot to use in "https://www.rolimons.com/itemapi/itemdetails" format, you don't NEED to add anything in here for now.
  
input > botPrefix
  - The prefix your commands will start with
  
input > discord > botToken
  - Discord bot token
  
input > discord > channels
  - Channel IDs for the channel you'd like to have sent trades output to and completeds notifications sent to
  
mass-send > doNotSendTo
  - List of people you don't want the bot sending trades to in Roblox userIds, formatted like:
```
mass-send:
  doNotSendTo
  - 0
  - 1
  - 2
```

mass-send > lastOnline
  - The maximum amount of time, in number{w/m/d/y/h/none for minutes} format, from the last time a item owner was online to have a trade sent to them. For example, if a Roblox madness owner was last online yesterday and "lastOnline" is set to 1w (a week) they will have a trade sent to them

output > queueAdditions
  - Whether or not you'd like trades that are added to queue to be output in the console (as a bool)
  
output > searchedPeople
  - Whether or not you'd like people that are being scraped to be output in the console (as a bool)
  
cache > sentTo
  - Whether or not you'd like the people you've sent to (item specfic) to be cached so that if the bot restarts it wont send to the same people (unless 12 hours have passed)


------------
By discord.gg/callie / Basic#2142

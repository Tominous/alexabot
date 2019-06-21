const Discord = require('discord.js');
 const client = new Discord.Client();
 const config = require('./config.json');
 const user = new Discord.Message();
 const broadcast = client.createVoiceBroadcast();
 const ytdl = require('ytdl-core');
 const streamOptions = { seek: 0, volume: 1 };
 const ytSearch = require( 'yt-search' )
const SQLite = require("better-sqlite3");
const sql = new SQLite('./db/game.sqlite');
const bannedChannelsSql = new SQLite('./db/bannedChannels.sqlite');
const serverVolumeSql = new SQLite('./db/serverVolume.sqlite');
const traders = new SQLite('./db/traders.sqlite');
const portfolios = new SQLite('./db/portfolios.sqlite');
const leaderboard = new SQLite('./db/leaderboard.sqlite');
const songQueue = new SQLite('./db/songQueue.sqlite');
let userCooldowns = {};

const Game = {
    prep: function(client) {
        const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'game';").get();
        if (!table['count(*)']) {
            sql.prepare("CREATE TABLE game (id TEXT PRIMARY KEY, userId TEXT, username TEXT, avatarUrl TEXT, guild TEXT, stage INTEGER, xp INTEGER, level INTEGER, skillPoints INTEGER, strength INTEGER, constitution INTEGER, dexterity INTEGER, intelligence INTEGER, wisdom INTEGER, charisma INTEGER, currency INTEGER, stealCoinsCooldown INTEGER, flipCoinCooldown INTEGER);").run();
            sql.prepare("CREATE UNIQUE INDEX idx_game_id ON game (id);").run();
            sql.pragma("synchronous = 1");
            sql.pragma("journal_mode = wal");
        }

        const bannedTable = bannedChannelsSql.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'bannedChannels';").get();
        if (!bannedTable['count(*)']) {
            bannedChannelsSql.prepare("CREATE TABLE bannedChannels (id TEXT PRIMARY KEY, guildId TEXT, channelId TEXT);").run();
            bannedChannelsSql.prepare("CREATE UNIQUE INDEX idx_game_id ON bannedChannels (id);").run();
            bannedChannelsSql.pragma("synchronous = 1");
            bannedChannelsSql.pragma("journal_mode = wal");
        }

        const tradersTable = traders.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'traders';").get();
        if (!tradersTable['count(*)']) {
            traders.prepare("CREATE TABLE traders (userId TEXT PRIMARY KEY, money INTEGER, username TEXT);").run();
            traders.prepare("CREATE UNIQUE INDEX idx_game_id ON traders (userId);").run();
            traders.pragma("synchronous = 1");
            traders.pragma("journal_mode = wal");
        }

        const portfoliosTable = portfolios.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'portfolios';").get();
        if (!portfoliosTable['count(*)']) {
            portfolios.prepare("CREATE TABLE portfolios (userId TEXT, symbol TEXT, companyName TEXT, qty INTEGER, purchasePrice INTEGER);").run();
            portfolios.prepare("CREATE UNIQUE INDEX idx_game_id ON traders (userId);").run();
            portfolios.pragma("synchronous = 1");
            portfolios.pragma("journal_mode = wal");
        }

        const leaderboardTable = leaderboard.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'leaderboard';").get();
        if (!leaderboardTable['count(*)']) {
            leaderboard.prepare("CREATE TABLE leaderboard (userId TEXT PRIMARY KEY, username TEXT, portfolioValue INTEGER);").run();
            leaderboard.prepare("CREATE UNIQUE INDEX idx_game_id ON leaderboard (userId);").run();
            leaderboard.pragma("synchronous = 1");
            leaderboard.pragma("journal_mode = wal");
        }

        const serverVolumeTable = serverVolumeSql.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'serverVolume';").get();
        if (!serverVolumeTable['count(*)']) {
            serverVolumeSql.prepare("CREATE TABLE serverVolume (guildId TEXT PRIMARY KEY, volume INTEGER);").run();
            serverVolumeSql.prepare("CREATE UNIQUE INDEX idx_serverVolume_id ON serverVolume (guildId);").run();
            serverVolumeSql.pragma("synchronous = 1");
            serverVolumeSql.pragma("journal_mode = wal");
        }

        const songQueueTable = songQueue.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'songQueue';").get();
        if (!songQueueTable['count(*)']) {
            songQueue.prepare("CREATE TABLE songQueue (guildId TEXT, videoId TEXT, videoTitle TEXT, videoUploader TEXT, videoLength INTEGER, requestedBy TEXT, sortOrder INTEGER);").run();
            songQueue.prepare("CREATE UNIQUE INDEX idx_songQueue_id ON songQueue (guildId);").run();
            songQueue.pragma("synchronous = 1");
            songQueue.pragma("journal_mode = wal");
        }

        client.getProfile = sql.prepare("SELECT * FROM game WHERE userId = ? AND guild = ?");
        client.setProfile = sql.prepare("INSERT OR REPLACE INTO game (id, userId, username, avatarUrl, guild, stage, xp, level, skillPoints, strength, constitution, dexterity, intelligence, wisdom, charisma, currency, stealCoinsCooldown, flipCoinCooldown) VALUES (@id, @userId, @username, @avatarUrl, @guild, @stage, @xp, @level, @skillPoints, @strength, @constitution, @dexterity, @intelligence, @wisdom, @charisma, @currency, @stealCoinsCooldown, @flipCoinCooldown);");

        client.getServerVolume = serverVolumeSql.prepare("SELECT * FROM serverVolume WHERE guildId = ?");
        client.setServerVolume = serverVolumeSql.prepare("INSERT OR REPLACE INTO serverVolume (guildId, volume) VALUES (@guildId, @volume)")
    },

    profile: function(client,message) {
        profile = client.getProfile.get(message.author.id, message.guild.id)
        if (!profile) {
            profile = {
                id: `${message.guild.id}-${message.author.id}`,
                userId: message.author.id,
                username: message.author.username,
                avatarUrl: message.author.avatarURL,
                guild: message.guild.id,
                stage: 0,
                xp: 0,
                level: 1,
                skillPoints: 0,
                strength: 0,
                constitution: 0,
                dexterity: 0,
                intelligence: 0,
                wisdom: 0,
                charisma: 0,
                currency: 100,
                stealCoinsCooldown: 0,
                flipCoinCooldown: 0
              }
        }
        profile.xp++;
        if (profile.xp >= 50) {
            profile.level++;
            profile.skillPoints = profile.skillPoints + 5;
            message.channel.send("Congrats! You've leveled up to level " + profile.level);
            profile.xp = 0;
        };
        setTimeout(function(){client.setProfile.run(profile);}, 500);

        const serverVolumeCheck = client.getServerVolume.get(message.guild.id)
        if (!serverVolumeCheck) {
            setServerVolume = {
                guildId: message.guild.id,
                volume: 0.5
            };
            client.setServerVolume.run(setServerVolume);
        }
    },

    test: function(message) {
        message.channel.send(`You currently have ${profile.xp} XP and are level ${profile.level} with ${profile.skillPoints} skill points and $${profile.currency}. You are on stage ${profile.stage}.`);
        console.log(profile);
    },

    flipCoin: function(message) {
        function flipTheCoin() {
            let currentTime = new Date();
            let difference = currentTime - userCooldowns[message.member.id].flipCoin;

            if (difference > 60000) {
                let random = Math.random();
                let coin;
                if (random >= 0.5) {
                    coin = "heads"
                } else {coin = "tails"}
                console.log(random);
                console.log(coin);
                message.channel.send(`Heads or tails?`);
                const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 5000 });
                collector.on("collect", message => {
                    if (!message.content.toLowerCase().startsWith("heads") && !message.content.toLowerCase().startsWith("tails")) {
                        message.channel.send(`You must've typed the wrong thing. Try again!`)
                        collector.stop();
                        return;
                    } else if (message.content.toLowerCase() === coin) {
                        profile.currency = profile.currency + 10;
                        message.channel.send(`It's ${coin}. You win $10!`);
                        collector.stop();
                    } else {
                        message.channel.send(`It's ${coin}. You win nada, nothing!`);
                        collector.stop();
                    }
                    collector.stop();

                    userCooldowns[message.member.id].flipCoin = new Date();
                })
                collector.on("end", (collected,reason) => {
                    if (reason === 'time') {
                        message.channel.send(`You took too much time!`)
                    } else {return;}
                })
            } else {
                message.channel.send(`Cool those heels, slim thicc queen. There's a 60-second cooldown and you fondled my coin ${(difference / 1000).toFixed(0)} seconds ago.`)
            }
        }

        if (userCooldowns[message.member.id] && userCooldowns[message.member.id].flipCoin) {
            flipTheCoin();
        } else {
            let currentTime = new Date();
            let subtract61 = currentTime - 61000;
            if (!userCooldowns[message.member.id]) {
                userCooldowns[message.member.id] = {};
            }
            userCooldowns[message.member.id].flipCoin = subtract61;
            flipTheCoin();
        }
    },

    stealCoins: function(client, message) {
        function stealTheCoins() {
            let currentTime = new Date();
            let difference = currentTime - userCooldowns[message.member.id].stealCoins;

            if (difference > 60000) {
                let instigatorId = message.author.id;
                let victimId;
                console.log(message.mentions.users.array())
                if (message.mentions.users.array()[0]) {
                    if (message.mentions.users.array()[0].bot) {
                        message.channel.send("You can't steal from a bot. C'mon. They're defenseless. What's wrong with you?")
                        return;
                    } else if (message.mentions.users.array()[0].id === instigatorId) {
                        message.channel.send("You can't steal from yourself, smarty pants");
                        return;
                    } else {victimId = message.mentions.users.array()[0].id}
                } else {
                    message.channel.send("You need to tag somebody");
                    return;
                }

                getVictim = sql.prepare("SELECT currency FROM game WHERE userId = ?")
                victim = getVictim.get(victimId);
                console.log(victim)
                if (!victim) {
                    message.channel.send(`They don't have a profile!`)
                } else if (victim.currency < 50) {
                    message.channel.send(`Take it easy. They have to be holding at least $50 before you can steal from them.`)
                } else {
                    userCooldowns[message.member.id].stealCoins = new Date();
                    giveCoins = sql.prepare("UPDATE game SET currency = currency + ? WHERE userId = ?");
                    takeCoins = sql.prepare("UPDATE game SET currency = currency - ? WHERE userId = ?");

                    let randomNumber = Math.random();
                    if (randomNumber < 0.05) {
                        console.log("Random number: " + randomNumber)
                        console.log("instigator: ", instigatorId, typeof instigatorId);
                        console.log("victim: ", victimId, typeof victimId);
                        profile.currency = profile.currency + 50;
                        takeCoins.run(50,victimId);
                        message.channel.send(`Damn! You got super lucky. You managed to get $50 off of them! They're gonna be pissed.`);
                    }
                    if (randomNumber < 0.65) {
                        console.log("Random number: " + randomNumber)
                        console.log("instigator: ", instigatorId, typeof instigatorId);
                        console.log("victim: ", victimId, typeof victimId);
                        profile.currency = profile.currency - 10;
                        takeCoins.run(instigatorId);
                        giveCoins.run(10,victimId);
                        message.channel.send(`Oof. Ya got caught and had to pay them off with $10.`)
                    } else {
                        console.log("Random number: " + randomNumber)
                        console.log("instigator: ", instigatorId);
                        console.log("victim: ", victimId);
                        profile.currency = profile.currency + 10;
                        giveCoins.run(instigatorId);
                        takeCoins.run(10,victimId);
                        message.channel.send(`Look at you, you sneaky boi. You managed to get $10 off of them.`)
                    }
                    client.instigatorCoins.run(instigator);
                    client.victimCoins.run(victim);
                }
            } else {
                message.channel.send(`You've gotta wait a little longer, bro. There's a 60-second cooldown and you were *just* thieving ${(difference / 1000).toFixed(0)} seconds ago.`)
            }
        }

        if (userCooldowns[message.member.id] && userCooldowns[message.member.id].stealCoins) {
            stealTheCoins();
        } else {
            let currentTime = new Date();
            let subtract61 = currentTime - 61000;
            if (!userCooldowns[message.member.id]) {
                userCooldowns[message.member.id] = {};
            }
            userCooldowns[message.member.id].stealCoins = subtract61;
            stealTheCoins();
        }
    },

    createCharacter: function(message) {
        const statsEmbed = new Discord.RichEmbed();
        const embed = new Discord.RichEmbed();
        message.channel.send(embed
            .addField(`We use the DnD style of assigning attribute points.`,`You have six set numbers: **15, 14, 13, 12, 10 and 8**. Each number can be assigned to an attribute. \n List the attributes you would like them to be assigned to, in that order.\n For example, "str con dex int wis cha" would give you 15 Strength, 14 Constitution, 13 Dexterity, 12 Intelligence, 10 Wisdom and 8 Charisma.`))
        const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 });
        collector.on("collect", message => {
            if (message.content.includes("str") && message.content.includes("con") && message.content.includes("dex") && message.content.includes("int") && message.content.includes("wis") && message.content.includes("cha")) {
            messageArray = message.content.split(" ");
            messageArray = messageArray.map(function (element) {
                if (element.startsWith("str")) {
                    return "strength";
                }

                if (element.startsWith("con")) {
                    return "constitution";
                }

                if (element.startsWith("dex")) {
                    return "dexterity";
                }

                if (element.startsWith("int")) {
                    return "intelligence";
                }

                if (element.startsWith("wis")) {
                    return "wisdom";
                }

                if (element.startsWith("cha")) {
                    return "charisma";
                }
            })
            console.log(messageArray);
            if (!messageArray.includes(undefined)) {
                message.channel.send(statsEmbed
                .addField(`You want to set your attributes like so:`,
                `${messageArray[0].charAt(0).toUpperCase() + messageArray[0].slice(1)}: **15** \n
                ${messageArray[1].charAt(0).toUpperCase() + messageArray[1].slice(1)}: **14** \n
                ${messageArray[2].charAt(0).toUpperCase() + messageArray[2].slice(1)}: **13** \n
                ${messageArray[3].charAt(0).toUpperCase() + messageArray[3].slice(1)}: **12** \n
                ${messageArray[4].charAt(0).toUpperCase() + messageArray[4].slice(1)}: **10** \n
                ${messageArray[5].charAt(0).toUpperCase() + messageArray[5].slice(1)}: **8**`)
                .addField(`Is this correct?`,`Type "yes" or "no"`));
                yesOrNo = true;

            } else if (messageArray.includes(undefined)) {
                message.channel.send("You typed something wrong. Try again!")
                collector.stop();
            }
        } else if (yesOrNo) {
            if (message.content.startsWith("yes")) {
                profile[messageArray[0]] = profile[messageArray[0]] + 15;
                profile[messageArray[1]] = profile[messageArray[1]] + 14;
                profile[messageArray[2]] = profile[messageArray[2]] + 13;
                profile[messageArray[3]] = profile[messageArray[3]] + 12;
                profile[messageArray[4]] = profile[messageArray[4]] + 10;
                profile[messageArray[5]] = profile[messageArray[5]] + 8;
                yesOrNo = false;
                message.channel.send(`Your points have been assigned`);
                collector.stop();
            } else if (message.content.startsWith("no")) {
                message.channel.send(`Okie dokie. Use the create character command to try again.`)
                yesOrNo = false;
                collector.stop();
            }
        } else {
            message.channel.send("You typed something wrong. Try again!");
        }
    
    })
    },

    createCharacter: function(message) {
        const statsEmbed = new Discord.RichEmbed();
        const embed = new Discord.RichEmbed();
        message.channel.send(embed
            .addField(`We use the DnD style of assigning attribute points.`,`You have six set numbers: **15, 14, 13, 12, 10 and 8**. Each number can be assigned to an attribute.`)
            .addField(`List the attributes you would like them to be assigned to, in that order.`,`For example, \`\`str con dex int wis cha\`\` would give you 
            **15** Strength 
            **14** Constitution 
            **13** Dexterity 
            **12** Intelligence 
            **10** Wisdom 
            **8** Charisma.`))
        const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 });
        collector.on("collect", message => {
            if (message.content.includes("str") && message.content.includes("con") && message.content.includes("dex") && message.content.includes("int") && message.content.includes("wis") && message.content.includes("cha")) {
            messageArray = message.content.split(" ");
            messageArray = messageArray.map(function (element) {
                if (element.startsWith("str")) {
                    return "strength";
                }

                if (element.startsWith("con")) {
                    return "constitution";
                }

                if (element.startsWith("dex")) {
                    return "dexterity";
                }

                if (element.startsWith("int")) {
                    return "intelligence";
                }

                if (element.startsWith("wis")) {
                    return "wisdom";
                }

                if (element.startsWith("cha")) {
                    return "charisma";
                }
            })
            collector.stop()
            if (!messageArray.includes(undefined)) {
                message.channel.send(statsEmbed
                .addField(`You want to set your attributes like so:`,
                `${messageArray[0].charAt(0).toUpperCase() + messageArray[0].slice(1)}: **15** 
                ${messageArray[1].charAt(0).toUpperCase() + messageArray[1].slice(1)}: **14** 
                ${messageArray[2].charAt(0).toUpperCase() + messageArray[2].slice(1)}: **13** 
                ${messageArray[3].charAt(0).toUpperCase() + messageArray[3].slice(1)}: **12** 
                ${messageArray[4].charAt(0).toUpperCase() + messageArray[4].slice(1)}: **10** 
                ${messageArray[5].charAt(0).toUpperCase() + messageArray[5].slice(1)}: **8**`)
                .addField(`Is this correct?`,`Type "yes" or "no"`));
                yesOrNo = true;

                const newCollector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 5000 });
                newCollector.on("collect", message => {
                    if (message.content.startsWith("yes")) {
                        profile[messageArray[0]] = profile[messageArray[0]] + 15;
                        profile[messageArray[1]] = profile[messageArray[1]] + 14;
                        profile[messageArray[2]] = profile[messageArray[2]] + 13;
                        profile[messageArray[3]] = profile[messageArray[3]] + 12;
                        profile[messageArray[4]] = profile[messageArray[4]] + 10;
                        profile[messageArray[5]] = profile[messageArray[5]] + 8;
                        yesOrNo = false;
                        message.channel.send(`Your points have been assigned`);
                        newCollector.stop();
                    } else if (message.content.startsWith("no")) {
                        message.channel.send(`Okie dokie. Use the create character command to try again.`)
                        yesOrNo = false;
                        newCollector.stop();
                    }
                    
                })
                newCollector.on("end", (collected,reason) => {
                    if (reason === 'time') {
                        message.channel.send(`You took too much time!`)
                    } else {return;}
                })

            } else if (messageArray.includes(undefined)) {
                message.channel.send("You typed something wrong. Try again!")
                collector.stop();
            }
        } else {
            message.channel.send("You typed something wrong. Try again!");
        }
    
    })
    collector.on("end", (collected,reason) => {
        if (reason === 'time') {
            message.channel.send(`You took too much time!`)
        } else {return;}
    })
    },

    profileReset: function(message) {
        profile.stage = 0;
        profile.xp = 0;
        profile.level = 1;
        profile.skillPoints = 30;
        profile.strength = 0;
        profile.constitution = 0;
        profile.dexterity = 0;
        profile.intelligence = 0;
        profile.wisdom = 0;
        profile.charisma = 0;
        profile.currency = 100;
        message.channel.send(`Your profile has been reset to default values!`);
    },

    emojiTest: function(message) {
        const requestedBy = message.author.id
        message.channel.send(`This is an emoji test`)
        .then(message => {message.react('💪')})
        const filter = (reaction, user) => reaction.emoji.name === '💪' && user.id === requestedBy
        const emojiCollector = message.createReactionCollector(filter, { time: 5000 });
        emojiCollector.on('collect', r => console.log(`Collected ${r.emoji.name}`));
        emojiCollector.on('end', collected => console.log(`Collected ${collected.size} items`));
    },

    spendSkillPoints: function(message) {
        const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 5000 });
        const embed = new Discord.RichEmbed();
        const addAttributePoints = function(message,attribute) {
            let addPoints = parseInt(message.content);
            if (addPoints < profile.skillPoints) {
                profile[attribute] = profile[attribute] + addPoints;
                profile.skillPoints = profile.skillPoints - addPoints;
                message.channel.send(`You have successfully added ${addPoints} points to ${attribute}`);
                if (profile.skillPoints > 0) {
                    message.channel.send(`You still have ${profile.skillPoints} left over! Use "alexa spend skill points" again to continue spending them.`);
                } else {
                    message.channel.send(`You've spent all of your skill points! Continue leveling up to earn more.`)
                };
            } else if (addPoints > profile.skillPoints) {
                message.channel.send(`You don't have enough skill points to do that!`)
            }
        }
        message.channel.send(embed
            .setAuthor(`${profile.username}`,message.author.avatarURL)
            .setThumbnail(message.author.avatarURL)
            .addField(`__Attributes__`,`Strength: **${profile.strength}** \n Constitution: **${profile.constitution}** \n Dexterity: **${profile.dexterity}** \n Intelligence: **${profile.intelligence}** \n Wisdom: **${profile.wisdom}** \n Charisma: **${profile.charisma}**`)
            .addField(`__Skill points__`,`You have **${profile.skillPoints}** skill points to spend.`)
            .setFooter("Reply with how many points you want to spend, followed by the attribute. For example \"4 Strength\" or \"3 Intelligence\". Shorthand using the first 3 letters can be used, such as \"4 str\" or \"3 int\". Only one attribute can be updated in the reply."));
            collector.on('collect', message => {
                if (message.content.toLowerCase().endsWith("str") || message.content.toLowerCase().endsWith("strength")) {
                    addAttributePoints(message,"strength");
                }

                if (message.content.toLowerCase().endsWith("con") || message.content.toLowerCase().endsWith("constitution")) {
                    addAttributePoints(message,"constitution");
                }

                if (message.content.toLowerCase().endsWith("dex") || message.content.toLowerCase().endsWith("dexterity")) {
                    addAttributePoints(message,"dexterity");
                }

                if (message.content.toLowerCase().endsWith("int") || message.content.toLowerCase().endsWith("intelligence")) {
                    addAttributePoints(message,"intelligence");
                }

                if (message.content.toLowerCase().endsWith("wis") || message.content.toLowerCase().endsWith("wisdom")) {
                    addAttributePoints(message,"wisdom");
                }

                if (message.content.toLowerCase().endsWith("cha") || message.content.toLowerCase().endsWith("charisma")) {
                    addAttributePoints(message,"charisma");
                }

                else {message.channel.send(`You must've typed something incorrectly, please try again.`)}
            });
    },

    getProfile: function(message) {
        if (message.content.includes("<@")) {
            let getName = message.content.slice(16,-1);
            let getNameRequest = sql.prepare("SELECT * FROM game WHERE userId = ?")
            let getNameDb = getNameRequest.get(getName);
            if (!getNameDb) {
                message.channel.send(`They don't have a profile yet. Tell them to say something!`)
            } else {
                const profileEmbed = new Discord.RichEmbed();
                message.channel.send(profileEmbed
                    .setAuthor(`${getNameDb.username}`,getNameDb.avatarUrl)
                    .setThumbnail(getNameDb.avatarUrl)
                    .addField(`__Level__`,`Level: **${getNameDb.level}** \n XP: **${getNameDb.xp}/50**`)
                    .addField(`__Attributes__`,`Strength: **${getNameDb.strength}** \n Constitution: **${getNameDb.constitution}** \n Dexterity: **${getNameDb.dexterity}** \n Intelligence: **${getNameDb.intelligence}** \n Wisdom: **${getNameDb.wisdom}** \n Charisma: **${getNameDb.charisma}**`)
                    .addField(`__Skill points__`,`They have **${getNameDb.skillPoints}** skill points to spend.`)
                    .addField(`__Currency__`,`They have **$${getNameDb.currency}** stashed in their prison wallet.`));
            }
        } else {
        const profileEmbed = new Discord.RichEmbed();
        message.channel.send(profileEmbed
            .setAuthor(`${profile.username}`,message.author.avatarURL)
            .setThumbnail(message.author.avatarURL)
            .addField(`__Level__`,`Level: **${profile.level}** \n XP: **${profile.xp}/50**`)
            .addField(`__Attributes__`,`Strength: **${profile.strength}** \n Constitution: **${profile.constitution}** \n Dexterity: **${profile.dexterity}** \n Intelligence: **${profile.intelligence}** \n Wisdom: **${profile.wisdom}** \n Charisma: **${profile.charisma}**`)
            .addField(`__Skill points__`,`You have **${profile.skillPoints}** skill points to spend.`)
            .addField(`__Currency__`,`You have **$${profile.currency}** stashed in your prison wallet.`));
        }
    },

    stage: function(client,message) {
        const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 5000 });
        if (profile.stage === 0) {
            message.channel.send(`Would you like to begin the game?`)
                collector.on('collect', message => {
                    if (message.content.includes("yes") || message.content.includes("yeah") || message.content.includes("ya")) {
                        profile.stage++;
                        message.channel.send(`The game has begun and automatically been saved.`);
                        console.log(profile)
                    } else if (message.content.includes("no") || message.content.includes("nah") || message.content.includes("nope")) {
                        message.channel.send(`Yeah I don't blame you`);
                    }
                })
        }

        if (profile.stage === 1) {
            message.channel.send(`Would you like to proceed to the next stage?`);
                collector.on('collect', message => {
                    if (message.content.includes("yes") || message.content.includes("yeah")) {
                        profile.stage++;
                        message.channel.send(`You have entered the next stage.`);
                        console.log(profile);
                    } else if (message.content.includes("no")) {
                        message.channel.send(`Okay. You've stayed still`);
                    }
                })
            
        }
    }
};

module.exports = Game;

const Discord = require('discord.js');
// const client = new Discord.Client();
// const config = require('./config.json');
// const user = new Discord.Message();
// const broadcast = client.createVoiceBroadcast();
const ytdl = require('ytdl-core');
const streamOptions = { seek: 0, volume: 0.5 };
const ytSearch = require( 'yt-search' );
// const SQLite = require("better-sqlite3");
// const sql = new SQLite('./scores.sqlite');
const embed = new Discord.RichEmbed();

const Commands = {
    test: function(message) {
            message.channel.send("this is a test message");
    },

    volume: function(message) {
        const volumeEmbed = new Discord.RichEmbed();
        if (message.content.toLowerCase().includes("down") && !message.content.toLowerCase().includes("up")) {
            streamOptions.volume = streamOptions.volume - 0.1;
            message.channel.send("Volume has been turned down for future songs");
        }

        else if (message.content.toLowerCase().includes("up") && !message.content.toLowerCase().includes("down")) {
            streamOptions.volume = streamOptions.volume - 0.1;
            message.channel.send("Volume has been turned up for future songs");
        } else {
            message.channel.send(volumeEmbed
                .addField("Setting volume for the \"Alexa play\" command","**Alexa volume down:** turns volume down 10% \n **Alexa volume up**: turns volume up 10%")
                .setFooter(`The volume is currently at ${streamOptions.volume * 100}%`));
        }
    },

    play: function(message,msgContent) {
// FUNCTION FOR PLAYING A SONG, ALL THREE OF THE FUNCTION ARGUMENTS ARE STRINGS
        function playSong(title,imageUrl,youtubeUrl,youtubeThumb,youtubeTitle) {
            message.channel.send(embed
                .setAuthor(`${title}, ${message.author.username}`)
                .setThumbnail(imageUrl)
                .setImage(youtubeThumb)
                .setFooter(youtubeTitle));
            const channel = message.member.voiceChannel;
            channel.join()
            .then(connection => {
                const stream = ytdl(youtubeUrl, { filter : 'audioonly' })
                const dispatcher = connection.playStream(stream, streamOptions);}
                )
            .catch(console.error);
            console.log(msgContent);
        }
// ALEXA PLAY COMMAND RESPONSE
        if (typeof message.member.voiceChannel !== 'undefined') {
            let searchQuery = msgContent.slice(11);
            ytSearch(searchQuery, function (err,r ) {
            if (err) throw err
            const videos = r.videos
            firstResult = videos[0]
            playSong("Let's get jiggy with it","https://media.giphy.com/media/kLM9I1g8jsiAM/giphy.gif",`https://www.youtube.com/watch?v=${firstResult.videoId}`,`https://i.ytimg.com/vi/${firstResult.videoId}/default.jpg`,firstResult.title);
            console.log(firstResult)
            } )
        }
        else {
                message.reply(`get in a voice channel, ya bonehead`);
        }
    },
    buy: function(message,client) {
// PULLS RANDOM MEMBER FROM THE SERVER/GUILD MEMBER LIST FOR USE WITH THE "ALEXA BUY" COMMAND
        let everyoneArray = message.guild.members.array();
        let randomMember = everyoneArray[Math.floor(Math.random() * everyoneArray.length)];
// ALEXA, BUY COMMAND WHICH USES THE RANDOM MEMBER
        client.fetchUser(randomMember).then(myUser => {message.reply(`your purchase was successful. The credit card charge has been applied to ${myUser.username}'s Amazon™ account.`)});
    },
    stfu: function(message) {
        if (message.guild.voiceConnection) {
            message.channel.send(`Well fine, fuck you too`);
            message.guild.voiceConnection.disconnect();
        } else {
            message.channel.send(`I'm not even doing anything, asshole`)
        }
    },
    thatsSoSad: function(message) {
        message.reply(`sorry you're sad. Would you like me to play Despacito?`);
            const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 5000 });
                //console.log(collector)
                collector.on('collect', message => {
                    if (message.content.toLowerCase().includes("yes") || message.content.toLowerCase().includes("yeah") || message.content.toLowerCase().includes("ya") || message.content.toLowerCase().includes("sure")) {
                        collector.stop();
                        if (typeof message.member.voiceChannel !== 'undefined') {
                            collector.stop();
                            Commands.play(message,"alexa play despacito");
                        }
                        else {
                            collector.stop();
                            message.reply(`get in a voice channel, ya bonehead`);
                        }
                    } else if (message.content.toLowerCase().includes("no") || message.content.toLowerCase().includes("nah") || message.content.toLowerCase().includes("nope")) {
                        collector.stop();
                        message.channel.send("Okie dokie. Hope you feel better.");
                    }
                })
    },
    dadBot: function(message,msgContent) {
        const dadEmbed = new Discord.RichEmbed();
        //message.channel.send(`Hi, ${msgContent.slice(3)}, I'm Dad!`);
        message.channel.send(dadEmbed.setTitle(`Hi, ${msgContent.slice(3)}, I'm Dad!`).setThumbnail('https://i.imgur.com/H0ciQWN.png'));
    }
};

module.exports = Commands
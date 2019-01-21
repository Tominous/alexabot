const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const user = new Discord.Message();
//const SQLite = require("better-sqlite3");
//const sql = new SQLite('./scores.sqlite');
const Commands = require('./commands.js');
const Game = require('./game.js');
var thatsSoSad = false;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(client.debug);
    Game.prep(client);
});

client.on('message', message => {
// REMOVES SPECIFIC COMMON PUNCTUATION, LIKE SAYING "ALEXA, PLAY ____" OR "ALEXA PLAY ____."
    let msgContent = message.content.toLowerCase().replace(/[,!'.]/gi,"");

// NOT-BOT CHECK
    if (!message.author.bot) {
        Game.profile(client,message);
    
//
// ALEXA POINTS / SQL TEST
//
        if (msgContent.includes(`alexa points`)) {
            //message.reply(`You currently have ${score.points} points and are level ${score.level}!`);
            //console.log(score)
            Game.test(client,message)
        }

        if (msgContent.includes(`alexa stage`)) {
            Game.stage0(client,message);

        }
//
// ALEXA TEST COMMAND
//
        if (msgContent.includes(`alexa test`)) {
                message.channel.send("See or Change?");
                const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 });
                console.log(collector)
                collector.on('collect', message => {
                    if (message.content === "See") {
                        message.channel.send("You Want To See Someones Spec OK!");
                    } else if (message.content === "Change") {
                        message.channel.send("You Want To Change Your Spec OK!");
                    }
                })
        
        }

        if (msgContent.includes(`alexa play`)) {
           Commands.play(message,msgContent);
        }
        
        if (msgContent.includes("alexa stfu") || msgContent.includes("alexa shut up") || msgContent.includes("alexa fuck off")) {
            Commands.stfu(message);
        }
        
        if (msgContent.includes("alexa buy")) {
            Commands.buy(message,client);
        }

        //
        // THAT'S SO SAD COMMAND, WHICH PROMPTS ALEXA TO ASK IF YOU WANT TO PLAY DESPACITO
        //
        if (msgContent.replace(/[o]/gi,"").includes("thats s sad") || msgContent.replace(/[o]/gi,"").includes("that is s sad") || msgContent.replace(/[o]/gi,"").includes("that is just s sad")) {
            Commands.thatsSoSad(message);
        }

        // DAD BOT COMMAND
        if (msgContent.startsWith("im ")) {
            Commands.dadBot(message,msgContent);
        }
    }
});

var d = new Date();
console.log(d.getTime());
client.login(config.token);
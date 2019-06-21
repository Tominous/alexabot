const Discord = require('discord.js');
const config = require('./config.json');
const blizzardToken = require('./blizzardToken.json');
const BlizzardMatching = require('./blizzardMatching.js');
const blizzard = require('blizzard.js').initialize({
	origin: 'us',
	locale: 'en-US',
	key: config.blizzardKey,
	secret: config.blizzardSecret,
	token: blizzardToken.access_token
    });

const BlizzardCmd = {
    test: function(message, msgContent, client) {
        if (msgContent === "alexa wow profile") {
			console.log(config.blizzardToken);
            const wowProfileHelp = new Discord.RichEmbed();
            message.channel.send(wowProfileHelp
                .addField(`Looking up a WoW profile`,`Use \`\`Alexa WoW profile [realm name] [character name]\`\``)
                .setFooter(`Without the brackets, obviez.`));
			return;
        } else {
			const wowProfile = new Discord.RichEmbed();
			const wowProfileTalents = new Discord.RichEmbed();
            var messageArray = msgContent.split(" ");
            var characterName = messageArray.pop();
            messageArray.shift(); messageArray.shift(); messageArray.shift();
            if (messageArray[1]) {
                realmName = messageArray.join("-");
            } else {realmName = messageArray.toString();};

			blizzard.wow.character(['talents'], {origin: 'us', realm: realmName, name: characterName})
			.catch(function(err) {console.log(err); message.channel.send("That character doesn't exist, or you may have typed something wrong.\n```css\n Alexa WoW profile [realm name] [character name]\n```")})
			.then(response => {
				characterSpec = response.data.talents[0].spec.name;
				characterSpecRole = response.data.talents[0].spec.role;
				characterTalents = [];
				for (i = 0 ; i < 7; i++) {
					let characterTalentsRaw = {tier: response.data.talents[0].talents[i].tier, name: response.data.talents[0].talents[i].spell.name, description: response.data.talents[0].talents[i].spell.description};
					characterTalents.push(characterTalentsRaw);
					characterTalents[i].description = characterTalents[i].description.replace("\n\n\n\n"," ");
					characterTalents.sort(function (a, b) {
						return a.tier - b.tier;
					});
				}
				characterTalentsRaw = {tier: response.data.talents[0].talents[1].tier, name: response.data.talents[0].talents[1].spell.name}
				BlizzardMatching.talents(characterTalentsRaw);
				setTimeout(() => {console.log(characterTalents);}, 1000)
			})
			.then(() => {
				blizzard.wow.character(['stats'], {origin: 'us', realm: realmName, name: characterName})
				.catch(function() {message.channel.send("That character doesn't exist, or you may have typed something wrong.\n```css\n Alexa WoW profile [realm name] [character name]\n```")})
				.then(response => {
                    characterStats = {health: response.data.stats.health, 
                        powerType: response.data.stats.powerType.charAt(0).toUpperCase() + response.data.stats.powerType.slice(1), 
                        power: response.data.stats.power, 
                        str: response.data.stats.str, 
                        agi: response.data.stats.agi, 
                        int: response.data.stats.int, 
                        sta: response.data.stats.sta, 
                        crit: response.data.stats.critRating, 
                        critPercent: response.data.stats.crit, 
                        haste: response.data.stats.hasteRating, 
                        hastePercent: response.data.stats.haste, 
                        mastery: response.data.stats.masteryRating, 
                        masteryPercent: response.data.stats.mastery, 
                        versatility: response.data.stats.versatility, 
                        versatilityDpsBonus: response.data.stats.versatilityDamageDoneBonus, 
                        versatilityDpsTaken: response.data.stats.versatilityDamageTakenBonus, 
                        leech: response.data.stats.leechRating, 
                        leechPercent: response.data.stats.leech, 
                        armor: response.data.stats.armor, 
                        dodgePercent: response.data.stats.dodge, 
                        parryPercent: response.data.stats.parry, 
                        blockPercent: response.data.stats.block};
				})

			})
			.then(() => {
				blizzard.wow.character(['items'], { origin: 'us', realm: realmName, name: characterName })
				.catch(function() {message.channel.send("That character doesn't exist, or you may have typed something wrong.\n```css\n Alexa WoW profile [realm name] [character name]\n```")})
				.then(response => {
					console.log(response.data);
					
					var characterClass = BlizzardMatching.classes(response);
					var characterRace = BlizzardMatching.races(response);
					var characterColor = BlizzardMatching.classColor(characterClass);
					var characterFaction = BlizzardMatching.faction(response);
					var testDate = new Date()
					console.log(testDate);
					
					setTimeout(() => {message.channel.send(wowProfile
						.setColor(characterColor)
						.setThumbnail(`http://render-us.worldofwarcraft.com/character/${response.data.thumbnail.slice(0,-10).concat("","avatar.jpg")}`)
						.setImage(`http://render-us.worldofwarcraft.com/character/${response.data.thumbnail.slice(0,-10).concat("","inset.jpg")}`)
						.setAuthor(`${response.data.name} (${response.data.realm})`,`${characterFaction}`,`https://worldofwarcraft.com/en-us/character/${realmName}/${characterName}`)
						.setTitle(`WoW Armory page`)
						.setURL(`https://worldofwarcraft.com/en-us/character/${realmName}/${characterName}`)
						.setDescription(`Level ${response.data.level} ${characterRace} ${characterSpec} ${characterClass}`)
						.addField(`Main Statistics`,`**Health:** ${characterStats.health}
						**${characterStats.powerType}:** ${characterStats.power}
						**Strength:** ${characterStats.str}
						**Agility:** ${characterStats.agi}
						**Intellect:** ${characterStats.int}
						**Stamina:** ${characterStats.sta}`,true)
						.addField(`Secondary Statistics`,`**Crit:** ${characterStats.critPercent.toFixed(2)}% \`\`(${characterStats.crit})\`\`
						**Haste:** ${characterStats.hastePercent.toFixed(2)}% \`\`(${characterStats.haste})\`\`
						**Mastery:** ${characterStats.masteryPercent.toFixed(2)}% \`\`(${characterStats.mastery})\`\`
						**Versatility:** ${characterStats.versatility}
						**Leech:** ${characterStats.leechPercent.toFixed(2)}% \`\`(${characterStats.leech})\`\`
						**Armor:** ${characterStats.armor}
						**Dodge:** ${characterStats.dodgePercent.toFixed(2)}%
						**Parry:** ${characterStats.parryPercent.toFixed(2)}%
						**Block:** ${characterStats.blockPercent.toFixed(2)}%`, true)
						.addField(`Average Item Level`,`${response.data.items.averageItemLevel}`, true)
						.addField(`Achievement Points`,`${response.data.achievementPoints}`, true)
						.addField(`Level 15`, `**${characterTalents[0].name}** \`\`(${characterTalents[0].description})\`\``, true)
						.addField(`Level 30`, `**${characterTalents[1].name}** \`\`(${characterTalents[1].description})\`\``, true)
						.addField(`Level 45`, `**${characterTalents[2].name}** \`\`(${characterTalents[2].description})\`\``, true)
						.addField(`Level 60`, `**${characterTalents[3].name}** \`\`(${characterTalents[3].description})\`\``, true)
						.addField(`Level 75`, `**${characterTalents[4].name}** \`\`(${characterTalents[4].description})\`\``, true)
						.addField(`Level 90`, `**${characterTalents[5].name}** \`\`(${characterTalents[5].description})\`\``, true)
						.addField(`Level 100`, `**${characterTalents[6].name}** \`\`(${characterTalents[6].description})\`\``, true)
						);
					},500)
				});
			})
        }
    }
}

module.exports = BlizzardCmd;

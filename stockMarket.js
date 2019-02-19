const Discord = require('discord.js');
const SQLite = require("better-sqlite3");
const traders = new SQLite('./traders.sqlite')
const portfolios = new SQLite('./portfolios.sqlite');
const leaderboard = new SQLite('./leaderboard.sqlite');
const algotrader = require('algotrader');
const SMFunctions = require('./stockMarketFunctions.js');
const Yahoo = algotrader.Data.Yahoo;
const Query = algotrader.Data.Query;
const IEX = algotrader.Data.IEX;
var alexaColor = "#31C4F3";

const StockMarket = {
    help: async function (message) {
        let helpEmbed = new Discord.RichEmbed();
        helpEmbed
            .setAuthor("Alexa Stock Market Game")
            .setColor(alexaColor)
            .setTitle("Play the slowest game in the world: buy shares in various companies and sell them later at a profit! Can you make more than your friends?")
            .setDescription(`
                **Alexa stocks** or **Alexa stocks help** will bring up this list of commands
                ---
                **Alexa stocks start** is the starting point. This will create a profile for you in the stock market and give you $50,000 to make your investments.
                ---
                **Alexa stocks search [company name]** will provide the stock **symbol** for that company. This is important, because everything else relies on using stock symbols, **not** company names.
                ---
                **Alexa stocks buy [quantity] [symbol]** will buy shares in the company.
                ---
                **Alexa stocks sell [quantity] [symbol]** will sell shares back and return the money to your wallet.
                ---
                **Alexa stocks profile** or **Alexa stocks portfolio** will show you your current holdings, both in your wallet and your shares.
                ---
                **Alexa stocks price [symbol]** will show you the current price for shares of that company.
                ---
                **Alexa stocks history [symbol]** will show you a detailed history for that company's stock.
                ---
                **Alexa stocks leaderboard** will show you the current leaderboard for portfolio value.
            `)
            .setFooter("This game is still in sort of a beta stage. If you run into any issues/bugs or have suggestions, reach out to me on the Alexa Discord server: https://discord.gg/PysGrtD")

        message.channel.send(helpEmbed)
    },

    create: async function(message) {
        let newProfile = new Discord.RichEmbed();
        const checkExisting = traders.prepare("SELECT * FROM traders WHERE userId = ?").get(message.author.id);
        if (!checkExisting) {
            traders.prepare("INSERT OR REPLACE INTO traders (userId, money, username) VALUES (@userId, @money, @username)").run({userId: message.author.id, username: message.author.username, money: 50000})
            newProfile
                .setAuthor(message.author.username, message.author.avatarURL)
                .setColor(alexaColor)
                .setTitle("Wallet:")
                .setDescription("$50,000")
                .addField("Portfolio:","You haven't purchased any stock yet!")
                .setFooter("Your profile has been created!")
            
            message.channel.send(newProfile)
        } else {message.channel.send("You already have a stock market profile set up!")}

    },

    viewPortfolio: async function(message) {
        let portfolio = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ?").all(message.author.id);
        let money = traders.prepare("SELECT money FROM traders WHERE userId = ?").get(message.author.id).money;
        let portfolioDescription = "";
        let portfolioValue = 0;
        let portfolioEmbed = new Discord.RichEmbed();
        console.log(money)
        console.log(portfolio);
        //console.log(portfolio);

        if (money) {
            if (portfolio[0]) {
                async function forEach(array) {
                    for (let i = 0; i < array.length; i++) {
                        await SMFunctions.getPrice(portfolio[i].symbol, message);
                        let profitEach = (SMFunctions.stockPrice.price.last - portfolio[i].purchasePrice).toFixed(2);
                        let profitTotal = ((SMFunctions.stockPrice.price.last * portfolio[i].qty) - (portfolio[i].purchasePrice * portfolio[i].qty)).toFixed(2);
                        let profitPercent = (profitEach / portfolio[i].purchasePrice * 100).toFixed(2);
                        portfolioValue = portfolioValue + (SMFunctions.stockPrice.price.last * portfolio[i].qty);
                        if (profitTotal < 0) {
                            portfolioDescription = portfolioDescription + `**${portfolio[i].companyName}** (${portfolio[i].symbol}): ${portfolio[i].qty} shares purchased at \$${portfolio[i].purchasePrice.toFixed(2)} each \n Current price: \$${SMFunctions.stockPrice.price.last} | **\$${profitTotal}** total loss (${profitPercent}%) \n`;
                        } else {
                            portfolioDescription = portfolioDescription + `**${portfolio[i].companyName}** (${portfolio[i].symbol}): ${portfolio[i].qty} shares purchased at \$${portfolio[i].purchasePrice.toFixed(2)} each \n Current price: \$${SMFunctions.stockPrice.price.last} | **\$${profitTotal}** total profit (${profitPercent}%) \n`;
                        }
                        
                        //console.log(portfolioDescription)
                    }
                }

                async function embed() {
                    await forEach(portfolio);
                    portfolioEmbed
                        .setAuthor(message.author.username, message.author.avatarURL)
                        .setColor(alexaColor)
                        .setTitle("Wallet:")
                        .setDescription(`\$${money.toLocaleString('en-us',{timeZone:'America/New_York'})}`)
                        .addField("Portfolio value:", `\$${portfolioValue.toLocaleString('en-us',{timeZone:'America/New_York'})}`)
                        .addField("Portfolio:", portfolioDescription)

                    message.channel.send(portfolioEmbed)
                }
                embed();
            } else {
                portfolioEmbed
                    .setAuthor(message.author.username, message.author.avatarURL)
                    .setColor(alexaColor)
                    .setTitle("Wallet:")
                    .setDescription(`\$${money.toLocaleString('en-us',{timeZone:'America/New_York'})}`)
                    .addField("Portfolio:", "You haven't purchased any stock yet!")
            
                message.channel.send(portfolioEmbed)
            }
        } else {
            message.channel.send("You haven't created a stock market profile yet! Try `Alexa stocks start` to create one.")
        }
    },

    buyShares: async function(message) {
        let removeCall = message.content.slice(17);
        let msgArray = removeCall.split(" ");
        let profile = traders.prepare("SELECT * FROM traders WHERE userId = ?").get(message.author.id);
        let portfolio = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ?").get(message.author.id);
        //console.log(parseInt(msgArray[0]))
        if (!parseInt(msgArray[0])) {
            message.channel.send("You may have typed something incorrectly. Try again using `Alexa stocks buy [quantity] [symbol]`")
        } else {
            let qtyWanted = parseInt(msgArray[0]);
            let symbolWanted = msgArray[1].toUpperCase();
            await SMFunctions.getPrice(symbolWanted)
                .catch(err => {
                    message.channel.send("You may have typed something incorrectly. Usually this error happens when the symbol you used doesn't exist or is outside of the US-based stock exchanges. Murica. \n If you tried to use the company name instead of their stock symbol, use `Alexa stocks search [company name]` or Google to find their stock symbol and try your purchase again using that symbol."); 
                    return;
                });
            let cost = qtyWanted * SMFunctions.stockPrice.price.last;
            if (profile.money >= cost) {
                await SMFunctions.getCompanyName(symbolWanted, message)
                await SMFunctions.getLogo(symbolWanted, message)
                let confirmPurchase = new Discord.RichEmbed();
                confirmPurchase
                    .setAuthor(message.author.username, message.author.avatarURL)
                    .setColor(alexaColor)
                    .setThumbnail(SMFunctions.companyLogo)
                    .setTitle("Please confirm your purchase")
                    .setDescription(`**${qtyWanted} shares** of **${symbolWanted}** (${SMFunctions.companyName}) at **\$${SMFunctions.stockPrice.price.last}** each \n This would cost a total of **\$${cost.toFixed(2)}** and you currently have **\$${profile.money}** in your wallet`)
                    .setFooter("Please type \"yes\" or \"no\" to confirm or cancel")
                message.channel.send(confirmPurchase)
                let collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 8000 });
                collector.on("collect", response => {
                    if (response.content.toLowerCase() === "yes") {
                        let newMoney = (profile.money - cost).toFixed(2);
                        let portfolioCheck = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ? AND symbol = ?").get(response.author.id, symbolWanted)
                        if (!portfolioCheck) {
                            let newPurchase = {
                                userId: response.author.id,
                                symbol: symbolWanted,
                                companyName: SMFunctions.companyName,
                                qty: qtyWanted,
                                purchasePrice: SMFunctions.stockPrice.price.last
                            }
                            traders.prepare("UPDATE traders SET money = ? WHERE userId = ?").run(newMoney, response.author.id)
                            portfolios.prepare("INSERT OR REPLACE INTO portfolios (userId, symbol, companyName, qty, purchasePrice) VALUES (@userId, @symbol, @companyName, @qty, @purchasePrice)").run(newPurchase);
                            message.channel.send("Purchase complete! Check your portfolio with `Alexa stocks portfolio` or `Alexa stocks profile` to see your new shares.")
                            console.log("created")
                            collector.stop()
                        } else {
                            let newQty = portfolioCheck.qty + qtyWanted
                            let newPurchase = {
                                userId: response.author.id,
                                symbol: symbolWanted,
                                qty: newQty
                            }
                            traders.prepare("UPDATE traders SET money = ? WHERE userId = ?").run(newMoney, response.author.id)
                            portfolios.prepare("UPDATE portfolios SET qty = @qty WHERE userId = @userId AND symbol = @symbol").run(newPurchase)
                            message.channel.send("Purchase complete! Check your portfolio with `Alexa stocks portfolio` or `Alexa stocks profile` to see your new shares.")
                            console.log("updated")
                            collector.stop()
                        }
                    } else if (response.content.toLowerCase() === "no") {
                        console.log("no")
                        message.channel.send("Okie dokie, artichokie. Purchase cancelled.")
                        collector.stop();
                    } else {
                        message.channel.send("Well that wasn't a valid response. Try again from the beginning.")
                        collector.stop()
                    }
                })
                collector.on("end", (collected, reason) => {
                    if (reason === "time") {
                        message.channel.send("You took too much time to confirm!")
                    } else {return;}
                })
            } else {
                message.channel.send(`You don't have enough money to buy those shares! You currently have **\$${profile.money}** and those shares would cost **\$${cost}** at \$${SMFunctions.stockPrice.price.last} each`)
            }
        }
    },

    sellShares: async function(message) {
        let removeCall = message.content.slice(18);
        let msgArray = removeCall.split(" ");
        let profile = traders.prepare("SELECT * FROM traders WHERE userId = ?").get(message.author.id);
        let portfolio = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ?").get(message.author.id);

        if (!parseInt(msgArray[0])) {
            message.channel.send("You may have typed something incorrectly. Try again using `Alexa stocks sell [quantity] [symbol]`")
        } else {
            let qtyWanted = parseInt(msgArray[0]);
            let symbolWanted = msgArray[1].toUpperCase();
            let portfolioCheck = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ? AND symbol = ?").get(message.author.id, symbolWanted);
            
            if (portfolioCheck) {
                if (portfolioCheck.qty >= qtyWanted) {
                    await SMFunctions.getPrice(symbolWanted)
                        .catch(err => {
                            message.channel.send("You may have typed something incorrectly. Usually this error happens when the symbol you used doesn't exist or is outside of the US-based stock exchanges. Murica. \n If you tried to use the company name instead of their stock symbol, use `Alexa stocks search [company name]` or Google to find their stock symbol and try your sale again using that symbol."); 
                            return;
                        });
                    await SMFunctions.getCompanyName(symbolWanted, message)
                    await SMFunctions.getLogo(symbolWanted, message)
                    
                    let totalAmount = SMFunctions.stockPrice.price.last * qtyWanted
                    let totalProfit = totalAmount - (portfolioCheck.purchasePrice * qtyWanted)
                    let confirmSale = new Discord.RichEmbed();
                    confirmSale
                        .setAuthor(message.author.username, message.author.avatarURL)
                        .setColor(alexaColor)
                        .setThumbnail(SMFunctions.companyLogo)
                        .setTitle("Please confirm your sale")
                        .setDescription(`**${qtyWanted} shares** of **${symbolWanted}** (${SMFunctions.companyName}) at **\$${SMFunctions.stockPrice.price.last}** each \n This would return a total of **\$${totalAmount.toFixed(2)}** to your wallet at a **\$${totalProfit.toFixed(2)}** profit`)
                        .setFooter("Please type \"yes\" or \"no\" to confirm or cancel")
                    message.channel.send(confirmSale)
                    let collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 8000 });
                    collector.on("collect", response => {
                        if (response.content.toLowerCase() === "yes") {
                            let newQty = portfolioCheck.qty - qtyWanted
                            let newMoney = (profile.money + totalAmount).toFixed(2);
                            if (newQty > 0) {
                                let newPortfolio = {
                                    userId: response.author.id,
                                    symbol: symbolWanted,
                                    qty: newQty
                                }
                                traders.prepare("UPDATE traders SET money = ? WHERE userId = ?").run(newMoney, response.author.id)
                                portfolios.prepare("UPDATE portfolios SET qty = @qty WHERE userId = @userId AND symbol = @symbol").run(newPortfolio);
                                message.channel.send("Sale complete! Check your portfolio with `Alexa stocks portfolio` or `Alexa stocks profile` to see your updated profile & portfolio.")
                                collector.stop()
                            } else {
                                traders.prepare("UPDATE traders SET money = ? WHERE userId = ?").run(newMoney, response.author.id)
                                portfolios.prepare("DELETE FROM portfolios WHERE userId = ? AND symbol = ?").run(response.author.id, symbolWanted);
                                message.channel.send("Sale complete! Check your portfolio with `Alexa stocks portfolio` or `Alexa stocks profile` to see your updated profile & portfolio.")
                                collector.stop()
                            }
                        } else if (response.content.toLowerCase() === "no") {
                            console.log("no")
                            message.channel.send("Okie dokie, artichokie. Purchase cancelled.")
                            collector.stop();
                        } else {
                            message.channel.send("Well that wasn't a valid response. Try again from the beginning.")
                            collector.stop()
                        }
                    })
                    collector.on("end", (collected, reason) => {
                        if (reason === "time") {
                            message.channel.send("You took too much time to confirm!")
                        } else {return;}
                    })
                } else {
                    message.channel.send(`You don't own that many shares. You're trying to sell **${qtyWanted}** shares but you only have **${portfolioCheck.qty}**.`)
                }
            } else {
                message.channel.send("You don't own any shares of that company's stock!")
            }
        }
    },

    test: async function(message) {
        let symbol = message.content.slice(18)
        await SMFunctions.getHistory(symbol, message);
        console.log(SMFunctions.stockHistory);
    },

    search: async function(message) {
        let searchQuery = message.content.slice(20);
        let searchEmbed = new Discord.RichEmbed();
        await SMFunctions.getSearch(searchQuery, message);
        await SMFunctions.getLogo(SMFunctions.companySearch.symbol);
        searchEmbed
            .setAuthor(message.author.username, message.author.avatarURL)
            .setColor(alexaColor)
            .setTitle(SMFunctions.companySearch.name)
            .setThumbnail(SMFunctions.companyLogo)
            .setURL(`https://finance.yahoo.com/quote/${SMFunctions.companySearch.symbol}`)
            .setDescription(`Symbol: **${SMFunctions.companySearch.symbol}**`)
            .setFooter(`Exchange: ${SMFunctions.companySearch.exchDisp}`)

        message.channel.send(searchEmbed)
    },

    getHistory: async function(message) {
        let symbol = message.content.slice(21).toUpperCase();
        let historyEmbed = new Discord.RichEmbed();
        await SMFunctions.getLogo(symbol, message);
        await SMFunctions.getHistory(symbol, message);
        historyEmbed
            .setAuthor(message.author.username, message.author.avatarURL)
            .setColor(alexaColor)
            .setTitle(`${SMFunctions.stockHistory.companyName} (${SMFunctions.stockHistory.symbol})`)
            .setThumbnail(SMFunctions.companyLogo)
            .setURL(`https://finance.yahoo.com/quote/${symbol}`)
            .setDescription(`
                52 week high: **\$${SMFunctions.stockHistory.week52high.toFixed(2)}**
                52 week low: **\$${SMFunctions.stockHistory.week52low.toFixed(2)}**
                52 week change: **\$${SMFunctions.stockHistory.week52change.toFixed(2)}**
                5-year change: **${Number(SMFunctions.stockHistory.year5ChangePercent * 100).toFixed(2)}%**
                2-year change: **${Number(SMFunctions.stockHistory.year2ChangePercent * 100).toFixed(2)}%**
                1-year change: **${Number(SMFunctions.stockHistory.year1ChangePercent * 100).toFixed(2)}%**
                YTD change: **${Number(SMFunctions.stockHistory.ytdChangePercent * 100).toFixed(2)}%**
                6-month change: **${Number(SMFunctions.stockHistory.month6ChangePercent.toFixed(2) * 100).toFixed(2)}%**
                3-month change: **${Number(SMFunctions.stockHistory.month3ChangePercent.toFixed(2) * 100).toFixed(2)}%**
                1-month change: **${Number(SMFunctions.stockHistory.month1ChangePercent.toFixed(2) * 100).toFixed(2)}%**
            `)

        message.channel.send(historyEmbed)
    },

    getPrice: async function(message) {
        let symbol = message.content.slice(19).toUpperCase();
        let getPriceEmbed = new Discord.RichEmbed();
        await SMFunctions.getLogo(symbol, message);
        await SMFunctions.getCompanyName(symbol, message);
        await SMFunctions.getPrice(symbol, message);
        getPriceEmbed
            .setAuthor(message.author.username, message.author.avatarURL, "")
            .setColor(alexaColor)
            .setTitle(`${SMFunctions.companyName} (${symbol})`)
            .setThumbnail(`${SMFunctions.companyLogo}`)
            .setURL(`https://finance.yahoo.com/quote/${symbol}`)
            .setDescription(`**\$${SMFunctions.stockPrice.price.last}**`)
            .setFooter(`as of ${SMFunctions.stockPrice.date.toLocaleString('en-us',{timeZone:'America/New_York'})} EST`)

        message.channel.send(getPriceEmbed);
    },

    leaderboard: async function(message) {
        let portfolio = portfolios.prepare("SELECT * FROM portfolios WHERE userId = ?").all(message.author.id)
        let test = portfolios.prepare("SELECT * FROM portfolios GROUP BY userId").all()
        console.log(test)
        let leaderboardEmbed = new Discord.RichEmbed();
        let newPortfolioValue = 0;
        let description = "";
        let place = 1;

        async function forEach(array) {
            for (let i = 0; i < array.length; i++) {
                await SMFunctions.getPrice(portfolio[i].symbol, message);
                newPortfolioValue = newPortfolioValue + (SMFunctions.stockPrice.price.last * portfolio[i].qty);
            }
        }
        
        async function embed() {
            await forEach(portfolio);
            leaderboard.prepare("INSERT OR REPLACE INTO leaderboard (userId, username, portfolioValue) VALUES (@userId, @username, @portfolioValue)").run({userId: message.author.id, username: message.author.username, portfolioValue: newPortfolioValue})
            let getLeaderboard = leaderboard.prepare("SELECT * FROM leaderboard ORDER BY portfolioValue DESC LIMIT 5").all();
            getLeaderboard.forEach(user => {
                let placement = ""
                switch (place) {
                    case 1: placement = "1st"; break;
                    case 2: placement = "2nd"; break;
                    case 3: placement = "3rd"; break;
                    case 4: placement = "4th"; break;
                    case 5: placement = "5th"; break;
                }
                description = description + `${placement}: **${user.username}** (\$${user.portfolioValue.toFixed(0)})\n`
                place++;
            })
            console.log(getLeaderboard)
            leaderboardEmbed
                .setAuthor("Alexa Stock Market Game - Leaderboards")
                .setColor(alexaColor)
                .setTitle("Current leaderboard for portfolio values")
                .setDescription(description)
                .setFooter("Portfolio values only; doesn't include money in your wallet!")

            message.channel.send(leaderboardEmbed)
        }

        embed();
    }
}
module.exports = StockMarket;
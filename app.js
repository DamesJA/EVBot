import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000

let discordBaseApiUrl = "https://discord.com/api/v10/";

// changing commands on app
function changingCommands() {

    let url = discordBaseApiUrl + "applications/" + process.env.APP_ID + "/commands";
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
        },
    })
}

app.listen(PORT, () => {
    console.log("yo")
})
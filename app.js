import 'dotenv/config';
import express from 'express';

import {
    InteractionType,
    InteractionResponseType,
    verifyKey,
    verifyKeyMiddleware
} from 'discord-interactions';


const app = express();
const PORT = process.env.PORT || 3000
console.log("running")

// doing "/interactions" because when a command is sent through it comes through as /interactions & I don't want the validation code twice
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), (req, res) => {
    console.log(req)
    let body;
    let type;

    if(!req.body) {
        body = req.rawBody
    } else {
        body = req.body;
        type = req.type
    }
    console.log("body: ", body)
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");

    // PING PONG initial verification for the URL
    if(type == InteractionType.PING) {
        return res.send({type: InteractionResponseType.PONG});
    }

    // verification per interaction that the app takes
    verifyKey(body, signature, timestamp, process.env.PUBLIC_KEY)


    if(body.type === InteractionType.APPLICATION_COMMAND) {
        console.log("request: ", req);
        let name = req.body.data.options[0].value;
        // console.log("user request: ", req.body.data.options[0].value)
        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `HELLO ${name}!!!!!`
            }
        })
    }
})

let discordBaseApiUrl = "https://discord.com/api/v10";

let command1 = {
    name: 'hello',
    description: 'enter your name',
    type: 1,
    options: [
        {
            name: 'name',
            description: 'enter your name',
            type: 3,
            required: true
            // choices: [
            //     {
            //         name: 'Morning',
            //         value: 'morning'
            //     },
            //     {
            //         name: 'Afternoon',
            //         value: 'afternoon'
            //     },
            //     {
            //         name: 'Night',
            //         value: 'night'
            //     }
            // ]
        }
    ],
    context: [0,2],
    integration_types: [0]
}

// changing commands on app
export async function changingCommands() {

    let ApiCallBodyForCommands = {method: 'POST', body: command1}

    if (ApiCallBodyForCommands.body) ApiCallBodyForCommands.body = JSON.stringify(ApiCallBodyForCommands.body);

    // let url = `${discordBaseApiUrl}/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID_TEST}/commands`;
    let url = `${discordBaseApiUrl}/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID_DBB}/commands`;
    // let url = `${discordBaseApiUrl}/applications/${process.env.APP_ID}/commands`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': 'DiscordBot (https://github.com/DamesJA/twitterFetch, 1.0.0)',
        },
        ...ApiCallBodyForCommands
    });

    let data = await res.json();
    console.log("data: ", data);
    console.log("status: ", res.status);
    console.log("THIS IS A TEST IN HERE")

}

async function deletingAllCommands() {
    // app.delete(`${discordBaseApiUrl}/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID_TEST}/commands`)
    let allGuildCommands = await fetch(`${discordBaseApiUrl}/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID_TEST}/commands`, {
        method: "GET"
    })
    console.log("allguildcommands", allGuildCommands.body)
    let dicsordAPIRes = await fetch(`${discordBaseApiUrl}/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID_TEST}/commands`, {
        method: "PUT",
        body: []
    })
    console.log("dicsordAPIRes", dicsordAPIRes)
}

//calling the function add/change commands for app
await changingCommands();
// deletingAllCommands();


app.listen(PORT, () => {
    console.log(`listening on port: ${PORT}`)
})

// exports
export {app}



// discord I was following:
// https://github.com/discord/discord-example-app/blob/main/app.js
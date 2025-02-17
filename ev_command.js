import 'dotenv/config';

const ev_command = {
    name: "ev",
    description: "Use to calculate EV",
    options: [
        {
            name: "leg_odds",
            type: 3, // 3 = string
            required: true,
            description: "odds of legs",
            max_length: 100
        },
        {
            name: "final_odds",
            type: 3, // 3 = string
            required: true,
            description: "Odds you are betting",
            max_length: 100
        }
    ],
    defulat_member_permissions: "0",
    dm_permission: false,
    integration_types: [0], // 0 - installable to servers, 1 - installable to users
    contexts: [0], // 0 - interaction can be used within servers
    type: 1,
}

let commands = [
    ev_command
]

//api call code - pass the list of commands as the body in the http request to discord to register the command
let ApiCallBodyForCommands = {method: 'PUT', body: commands}

ApiCallBodyForCommands.body = JSON.stringify(ApiCallBodyForCommands.body);

let url = `https://discord.com/api/v10/applications/${process.env.APP_ID}/commands`;

const res = await fetch(url, {
    headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DiscordBot ({github link insert here}, 1.0.0)',
    },
    ...ApiCallBodyForCommands
});


if (res.ok) {
    console.log('Commands successfully registered!');
} else {
    console.error('Failed to register commands:', await res.text());
}


/*
notes about commands

Discord has 3 different types of commands
- slash command
- user command
- message command


*/
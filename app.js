import 'dotenv/config';
import {
    InteractionType,
    InteractionResponseType,
    verifyKey
} from 'discord-interactions';
import { json } from 'express';
import fetch from 'node-fetch'; // Import node-fetch

export const handler = async (event) => {
    console.log("Received API Gateway event:", JSON.stringify(event, null, 2));

    // Extract request headers and body
    const signature = event.headers["x-signature-ed25519"];
    const timestamp = event.headers["x-signature-timestamp"];
    const rawBody = event.body; // API Gateway sends this as a string
    const body = JSON.parse(rawBody);

    console.log("Signature:", signature);
    console.log("Timestamp:", timestamp);
    console.log("Raw Body:", rawBody);

    // Ensure the body is a string for verification
    if (!signature || !timestamp || !rawBody) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing signature, timestamp, or body" }),
        };
    }

    // Verify the request is from Discord
    const isValid = await verifyKey(rawBody, signature, timestamp, process.env.PUBLIC_KEY);
    
    if (!isValid) {
        console.error("Invalid request signature!");
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Invalid request signature" }),
        };
    }

    console.log("Request signature verified!");

    try {
    // PING verification
        if (body.type === InteractionType.PING) {
            return {
                statusCode: 200,
                body: JSON.stringify({ type: InteractionResponseType.PONG }),
            };
        }
        
    } catch(error) {
        console.log("GETTING AN ERROR: ", error)
    }

    console.log("i am somehow getting logged")

    console.log("body id: ", body.id)
    console.log("body token: ", body.token)
    //  ---------------------------------------------- Sending Deferred message  ----------------------------------------------
    const deferralUrl = `https://discord.com/api/v10/interactions/${body.id}/${body.token}/callback`;
    const deferralData = {
        type: 5, // deferred channel message with source (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
        data: {
            content: "Calculating..."
        }
    };

    const deferralResponse = await fetch(deferralUrl, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(deferralData)
    })
    console.log(deferralResponse)
    //  ---------------------------------------------- Sending Deferred message  ----------------------------------------------    

    // Handle /ev command
    if (body.type === InteractionType.APPLICATION_COMMAND && body.data.name == "ev") {            

        const params = new URLSearchParams({
            api: "open",
            LegOdds: body.data.options[0].value,
            FinalOdds: body.data.options[1].value,
            Args: "ev_p,kelly",

        }).toString();

        async function callCNM() {
            let response = await fetch(`http://api.crazyninjaodds.com/api/devigger/v1/sportsbook_devigger.aspx?${params}`, {
                method: "GET"
            })

            const data = await response.json()
            console.log(data)

            // assigining variables - from response
            let ev = data.Final.EV_Percentage
            let fk = data.Final.Kelly_Full
            let fv = data.Final.FairValue

            // converting ev to %
            ev = parseFloat(ev * 100).toFixed(0);
            // calculating qk
            let qk = fk/4;

            let color = ev > 0 ? 0x00FF00 : 0xFF0000;

            return {
                statusCode: 200,
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { 
                        embeds: [
                            {
                                title: "EV Calculation Results",
                                description: ``,
                                color: color,
                                fields: [
                                    {
                                        name: "EV",
                                        value: `${ev}%`,
                                        inline: true
                                    },
                                    {
                                        name: "QK",
                                        value: `${qk}`,
                                        inline: true
                                    },
                                    {
                                        name: "Fair Value",
                                        value: `${fv}`,
                                        inline: false
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const formmattedCNMResp = await callCNM();


        //  ---------------------------------------------- Sending Follow up Message  ----------------------------------------------
        //follow up message after request to CNM complete
        const followUpUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${body.token}/messages/@original`;
        const followUpMethod = "PATCH"
        
        //validate followup call
        // ...

        // parsedBody = JSON.parse(formmattedCNMResp.body)

        const followUpResp = await fetch(followUpUrl, {
            method: followUpMethod,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ embeds: formmattedCNMResp.body.data.embeds })
        })
        console.log("follow up response: ", followUpResp);
        //  ---------------------------------------------- Sending Follow up Message  ----------------------------------------------
    }

    return {statusCode: 200, body: {message: "Real resposne sent successfully"}}
}








// content: `
// \`\`\`css
// EV: ${ev}% \nQK: ${qk} \nFair value: ${fv}
// \`\`\`
// `}


// Code to solve timout issue:
// const fetch = require('node-fetch'); // Make sure you have the node-fetch library installed

// exports.handler = async (event) => {
//     const interaction = JSON.parse(event.body);

//     // Step 1: Send the deferral response (acknowledge interaction)
//     const deferralUrl = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
//     const deferralData = {
//         type: 5 // DEFERRED_CHANNEL_MESSAGE
//     };

//     try {
//         // Sending the deferral response to Discord
//         const deferralResponse = await fetch(deferralUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(deferralData)
//         });

//         // Check if deferral response was successful
//         if (!deferralResponse.ok) {
//             throw new Error('Failed to send deferral response');
//         }

//         // Continue with the long-running process (e.g., fetching data or computation)
//         // For example, simulating a long-running task:
//         await new Promise((resolve) => setTimeout(resolve, 5000)); // Simulate delay of 5 seconds

//         // Step 2: Send the real response (replace deferral with real content)
//         const realResponseUrl = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
//         const realResponseData = {
//             content: "Here is the real response after processing your request!"
//         };

//         // Sending the real response to Discord
//         const realResponse = await fetch(realResponseUrl, {
//             method: 'PATCH',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(realResponseData)
//         });

//         // Check if the real response was successful
//         if (!realResponse.ok) {
//             throw new Error('Failed to send real response');
//         }

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: "Real response sent successfully!" })
//         };

//     } catch (error) {
//         console.error("Error occurred:", error);

//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: 'An error occurred during the process.' })
//         };
//     }
// };

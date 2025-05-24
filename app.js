import 'dotenv/config';
import {
    InteractionType,
    InteractionResponseType,
    verifyKey
} from 'discord-interactions';
import { json } from 'express';
import fetch from 'node-fetch'; // Import node-fetch
import { optionToCNMMapper, options } from './discordParams.js';

export const handler = async (event) => {
    //  ---------------------------------------------- SETUP / VALIDATION  ----------------------------------------------
    console.log("Received API Gateway event:", JSON.stringify(event, null, 2));

    // checking alias version - env purposes
    const functionVersion = process.env.AWS_LAMBDA_FUNCTION_VERSION
    let APP_ID;
    let PUBLIC_KEY;
    if(functionVersion == "$LATEST") {
        APP_ID = process.env.APP_ID_TEST
        PUBLIC_KEY = process.env.PUBLIC_KEY_TEST
    } else {
        APP_ID = process.env.APP_ID
        PUBLIC_KEY = process.env.PUBLIC_KEY
    }

    // Extract request headers and body
    const signature = event.headers["x-signature-ed25519"];
    const timestamp = event.headers["x-signature-timestamp"];
    const rawBody = event.body; // API Gateway sends this as a string
    const body = JSON.parse(rawBody); // this is the detials from the discord ran command essentially

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
    const isValid = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
    
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
    //  ---------------------------------------------- SETUP / VERIFICATION  ----------------------------------------------

    //  ---------------------------------------------- / Sending Deferred message  ----------------------------------------------
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
    //  ---------------------------------------------- Sending Deferred message /  ----------------------------------------------

    // Handle /ev command
    if (body.type === InteractionType.APPLICATION_COMMAND && body.data.name == "ev") {

        console.log("body.data.options", body.data.options)

        // converting options in body.data.options from Arr to Obj
        const bodyDataOptions = body.data.options.reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {});

        // ------------------------------ 
        let optionVals = {};
        for(const option of options) {
            optionVals[option] = bodyDataOptions[option] ?? null
        }
        console.log("optionVals: ", optionVals)

        async function callCNM() {

            // ------------------------------ creating params for CNM request ------------------------------
            let Args = "ev_p,kelly"

            // converts users options answers to be valid for the CNM request
            let CNMParams = Object.fromEntries(body.data.options.flatMap((option) => {
                switch(option.name) {
                    case "leg_odds":
                    case "final_odds":
                        return [[optionToCNMMapper[option.name], option.value]]
                    case "correlation":
                        return [[optionToCNMMapper[option.name], option.value], ["Correlation_Bool", "1"]]
                    case "boost_p":
                        return [[optionToCNMMapper[option.name], option.value], ["Boost_bool", "1"], ["Boost_Type", "0"]]
                    case "devig_method":
                        const devigMethodMapping = {'m': '0', 'a': '1', 'p': '2', 's': '3', 'wc': '4'}
                        return [[optionToCNMMapper[option.name], devigMethodMapping[option.value]]]
                    case "is_free_bet":
                        // just going to accept any value in "is_free_bet" by not checking the value they entered
                        Args += "," + optionToCNMMapper[option.name]
                        return []
                    default:
                        return []
                }
            }))

            // URL params for CNM request
            const params = new URLSearchParams({
                api: "open",
                ...CNMParams,
                Args: Args
                // LegOdds: LegOdds,
                // FinalOdds: finalOdds,
                // Args: "ev_p,kelly",
            }).toString();
            // ------------------------------ creating params for CNM request ------------------------------

    
            let response = await fetch(`http://api.crazyninjaodds.com/api/devigger/v1/sportsbook_devigger.aspx?${params}`, {
                method: "GET"
            })

            const CNMResp = await response.json()
            console.log("CNM response: ", CNMResp)
            // validating data obj
            if(!CNMResp || !CNMResp.Final || Object.entries(CNMResp.Final).length == 0) {throw new Error("Issue with response from CNM, entire object, or Final obj has an issue")}

            // return the error if there is an error from CNM
            if (Object.keys(CNMResp).length == 1) {
                console.log("length: ", Object.keys(CNMResp).length)
                console.log("keys array: ", Object.keys(CNMResp))
                console.log("message: ", CNMResp.message)
                return {
                    content: CNMResp.message
                }
            }

            // harcoding the mapping of CNM response Final object variables to my own variables. Using nullish coalesing operator
            // only including ones that we don't already have from user input
            const finalVals = {
                odds: CNMResp.Final.Odds ?? null,
                fv_uncorrelated: CNMResp.Final.FairValue_Uncorrelated ?? null,
                fv: CNMResp.Final.FairValue,
                ev_p: CNMResp.Final.EV_Percentage,
                fk: CNMResp.Final.Kelly_Full,
                free_bet_p: CNMResp.Final.FB_Percentage ?? null
            }

            // converting ev to %
            finalVals.ev_p = evDecToPercentage(finalVals.ev_p);
            // calculating qk
            let qk = finalVals.ev_p > 0 ? parseFloat((finalVals.fk/4)).toFixed(2) : 0;

            finalVals.fv = convertFairValue(finalVals.fv);
            finalVals.free_bet_p = convertFreeBetToPerc(finalVals.free_bet_p);

            // let color = finalVals.ev_p > 0 ? 0x00FF00 : 0xFF0000;
            

            return {
                embeds: [
                    {
                        color: 0x000000,
                        fields: [
                            {
                                name: '',
                                value:
`
${nameOutput(optionVals.name)}
${finalOddsOutput(finalVals.odds)}
\`\`\`diff\n
${EVOutput(finalVals.ev_p, finalVals)}${spacing3Line1(finalVals)}${QKOutput(qk, finalVals)}
${lineBreakSpaceBtw1And2(finalVals)}
${FVOutput(finalVals.fv)}${spacing3Line2(finalVals)}${freeBetOutput(finalVals.free_bet_p)}
\`\`\``,
                                inline: false
                            }

                            // {
                            //     name: '',
                            //     value: `\`\`\`CNM url (incase you want to edit on your own): ${cnmUrl} \`\`\``,
                            //     inline: false
                            // }
                        ]
                    }
                ]
            }

        }
        let formmattedCNMResp = await callCNM();
        console.log("formmattedCNMResp", formmattedCNMResp)
        // formmattedCNMResp = JSON.stringify(formmattedCNMResp);


        //  ---------------------------------------------- Sending Follow up Message (to discord)  ----------------------------------------------
        //follow up message after request to CNM complete
        const followUpUrl = `https://discord.com/api/v10/webhooks/${APP_ID}/${body.token}/messages/@original`;
        const followUpMethod = "PATCH"
        
        //validate followup call
        // ...

        // parsedBody = JSON.parse(formmattedCNMResp.body)

        const followUpResp = await fetch(followUpUrl, {
            method: followUpMethod,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formmattedCNMResp)
            // { embeds: formmattedCNMResp.data.embeds }
        })
        console.log("follow up response: ", followUpResp);
        //  ---------------------------------------------- Sending Follow up Message (to discord)  ----------------------------------------------
    }

    return {statusCode: 200, body: {message: "Real resposne sent successfully"}}
    
    // helper methods
    function convertFairValue(fairValue) {
        if(fairValue > .5) {
            fairValue = (((fairValue/(1 - fairValue)) * 100) * -1);
        } else if(fairValue < .5) {
            fairValue = ((1 - fairValue)/fairValue) * 100
        } else {
            fairValue = 100;
        }

        return fairValue.toFixed(0)
    }

    function evDecToPercentage(expectedValue) {
        return parseFloat(expectedValue * 100).toFixed(1);
    }

    function EVOutput(expectedValue, finalVals) {
        if(finalVals.free_bet_p !== null) {
            return ''
        }

        if(expectedValue > 0) {
            return `+${expectedValue}% EV`
        } else {
            return `${expectedValue}% EV`
        }

    }
    function QKOutput(qk, finalVals) {
        if(finalVals.free_bet_p !== null) {
            return ''
        }

        return `QK: ${qk}u`;
    }
    function FVOutput(fv) {
        return `FV: ${fv}`;
    }

    function freeBetOutput(fbc) {
        return fbc !== null ? `FBC: ${parseFloat(fbc).toFixed(1)}%` : "";
    }
    function nameOutput(name) {
        return name !== null ? `**${name}**` : "";
    }
    function convertFreeBetToPerc(FB) {
        return FB !== null ? parseFloat(FB * 100).toFixed(0) : null
    }
    function finalOddsOutput(finalOdds) {
        return parseInt(finalOdds) > 0 ? `Odds: ${finalOdds}` : `Odds: ${finalOdds}`
    }

    function spacing3Line1(finalVals) {
        // returns 3 spaces
        if(finalVals.free_bet_p !== null) {
            return '';
        } else {
            return '   ';
        }
    }
    function spacing3Line2() {
        // returns 3 spaces
        return '   '
    }
    function lineBreakSpaceBtw1And2(finalVals) {
        if(finalVals.free_bet_p !== null) {
            return ''
        } else {
            return ' '
        }
    }

}
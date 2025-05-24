// CNM name | my name
/* Everything that CNM can take that I want the user to be able to control

LegOdds     leg_odds
FinalOdds   final_odds
Correlation_Text correlation (.2 as 20%) - need to have Correlation_Bool as 1
Boost_Text  boost_p (20 as 20%) - need to have Boost_Bool as 1, also will need to default to "profit"(0) for Boost_Type 
DevigMethod     devig_method (m=multi, a=additive, p=power, s=shin, wc=worstcase)
Args[fb_c]      is_free_bet (1 or t if it is) - this has to be calculated/converted from their input to the argument passed to CNM     

*/

const optionToCNMMapper = {
    "leg_odds": "LegOdds",
    "final_odds": "FinalOdds",
    "correlation": "Correlation_Text",
    "boost_p": "Boost_Text",
    "devig_method": "DevigMethod",
    "is_free_bet": "fb_p"
}

// source of truth for all bot options - that the user can input
const options = [
    "name",
    "leg_odds",
    "final_odds",
    "correlation",
    "boost_p",
    "devig_method",
    "is_free_bet",
]


export {optionToCNMMapper, options}

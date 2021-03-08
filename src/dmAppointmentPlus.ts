import { MachineConfig, send, Action, assign, actions } from "xstate";
import "./styles.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { useMachine, asEffect } from "@xstate/react";
import { inspect } from "@xstate/inspect";

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

function helpf(prompt: string, name: string): MachineConfig<SDSContext, any, SDSEvent>{
    return ({entry: say(prompt),
             on: {ENDSPEECH: name+".hist" }})
}

function speech(prompt: string): MachineConfig<SDSContext, any, SDSEvent>{
    return ({entry: say(prompt),
             on: {ENDSPEECH: "ask"
            }})
}

function promptAndAsk(prompt: string, speechprompt:string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states: {
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH : 'ask' }
            },
            hist: {type: "history"},
            maxspeech: {
                ...speech(speechprompt)
            },
            ask: {
                entry: [send('LISTEN'), send('MAXSPEECH', {delay: 5000})],
            },
        }})
}

const {cancel}=actions

const grammar: { [index: string]: { person?: string, day?: string, time?: string } } = {
    "John": { person: "John Appleseed" },
    "William": { person: "William Windmill "},
    "Patrick": { person: "Patrick Wong" }, 
    "Eva": { person: "Eva Thompson"},
    "My father": { person: "your father" },

    "on Monday": { day: "Monday" },
    "on Tuesday": { day: "Tuesday" },
    "on Wednesday": { day: "Wednesday" },
    "on Thursday": { day: "Thursday" },
    "on Friday": { day: "Friday" },
    "on Saturday": { day: "Saturday" },
    "on Sunday": { day: "Sunday" },

    "at eight": { time: "08:00" },
    "at nine": { time: "09:00" },
    "at ten": { time: "10:00" },
    "at eleven": { time: "11:00" },
    "at twelve": { time: "12:00" },
    "at one": { time: "13:00" },
    "at two": { time: "14:00" },
    "at three": { time: "15:00" },
    "at four": { time: "16:00" },
    "at five o'clock": { time: "17:00" },

}

const grammar2: { [index: string]: boolean } = {
    "Yes": true,
    "yes": true,
    "indeed": true,
    "that sounds good": true,
    "yes of course": true,
    "absolutely": true,
    "of course": true,

    "No": false, 
    "n": false,
    "I don't think so": false,
    "no": false,
    "never": false,
    "not really": false,
    "no way": false

}

let a = grammar2["yes"]
let b = grammar2["no"]

const grammar3 ={"count": 0}

const commands = {"help": "h", "Help": "H"}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },

        welcome: {
            initial: 'prompt',
            on: {
                RECOGNISED: [{
                    cond: (context) => context.recResult in commands,
                    target: "help1", },
                    {
                    cond: (context) => !(context.recResult in commands),
                    actions: [assign((context) => { return { option: context.recResult } }), 
                                assign((context) => { grammar3["count"]=0 })], 
                    target: "query"}
                ],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init"}]
                },
            states: {
                prompt: {
                    entry: say('What would you like to do?'),
                    on: {ENDSPEECH: "ask"}
                },
                hist: {type: "history"},
                maxspeech: {
                    ...speech("Am I being clear? What would you like to do?")
                },
                ask: {
                    entry: [listen(), send('MAXSPEECH', {delay: 5000})]
                }
            }
        },

        help1:{
            ...helpf("Please tell me what you want to do.", "welcome")
        },

        query: {
            invoke:{
                id: 'rasa',
                src: (context, event) => nluRequest(context.option),
                onDone: {
                    target: 'menu',
                    actions: [assign((context, event) => { return  {option: event.data.intent.name} }),
                    (context: SDSContext, event: any) => console.log(event.data)]
                },
                onError: {
                    target: 'welcome',
                    actions: (context, event) => console.log(event.data)
                }
            }
        },

        menu: {
            initial: "prompt",
            on: {
                ENDSPEECH: [
                    { target: 'welcomemessage', cond: (context) => context.option === 'todo' },
                    { target: 'welcomemessage', cond: (context) => context.option === 'timer' },
                    { target: 'who', cond: (context) => context.option === 'appointment' }
                ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK.`
                    })),
                },
            }       
        },

        welcomemessage: {
            entry: say ("Okay."),
            always: "init"

        },

        who: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => context.recResult in commands,
                    target: "help2"},
                    {
                    cond: (context) => "person" in (grammar[context.recResult] || {}),
                    actions: [
                        assign((context) => { return { person: grammar[context.recResult].person } }),
                        assign((context) => { grammar3["count"]=0}), 
                        cancel("maxsp")],
                    target: "day"},
                    {
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp"),
                    target: ".nomatch"}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }
                ]
            },
            states: {
                prompt: {
                    entry: say("Who are you meeting with?"),
                    on: { ENDSPEECH: "ask" }
                },
                hist: {type: "history"},
                ask: {
                    entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
                },
                maxspeech: {
                    ...speech("I'll say again. What is the name of the person?")
                },
                nomatch: {
                    entry: say("Sorry, I don't know them"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help2:{
            ...helpf("Which person do you plan to meet?", "who")
        },

        day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => context.recResult in commands,
                    target: "help3", },
                    {
                    cond: (context) => "day" in (grammar[context.recResult] || {}),
                    actions:[
                        assign((context) => { return { day: grammar[context.recResult].day } }),
                        assign((context) => { grammar3["count"]=0}),
                        cancel("maxsp")],
                    target: "is_whole"},
                    {
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp"),
                    target: ".nomatch"}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.person}. On which day is your meeting?`})),
                    on: {ENDSPEECH: "ask"}
                },
                hist: {type: "history"},
                ask: {
		            entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
	            },
                maxspeech: {
                 ...speech("Are you still with me? On which day?")
              },
                nomatch: {
                    entry: say("I didn't get you."),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help3:{
            ...helpf("Can you tell me the date?", "day")
        },
        
        is_whole:{
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    target: "help4",
                    cond: (context) => context.recResult in commands },
                    {
                    cond: (context) => (grammar2[context.recResult] === a),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "confirm_whole"},
                    {
                    cond: (context) => (grammar2[context.recResult] === b),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "time"},
                    { 
                    target: ".nomatch",
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp")}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }]
            },
            states: {
                prompt: {
                    entry: say("Will it take the whole day?"),
                    on: { ENDSPEECH: "ask" }
                },
                hist: {type: "history"},
                ask: {
                    entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
                },
                maxspeech: {
                    ...speech("You did not respond, say a decision")
                },
                nomatch: {
                    entry: say("Could you say it again?"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help4:{
            ...helpf("Will it last for a whole day?", "is_whole")
        },

        time: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => context.recResult in commands,
                    target: "help5", },
                    {
                    cond: (context) => "time" in (grammar[context.recResult] || {}),
                    actions:[
                        assign((context) => { return { time: grammar[context.recResult].time } }),
                        assign((context) => { grammar3["count"]=0}),
                        cancel("maxsp")],
                    target: "confirm_time"},
                    {
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp"),
                    target: ".nomatch"}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }]
            },
            states: {
                prompt: {
                    entry: say("What time is your meeting?"),
                    on: { ENDSPEECH: "ask"}
                },
                hist: {type: "history"},
				ask: {
					entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
                },
                maxspeech: {
                  ...speech("Could you tell me the time?")
                },
                nomatch: {
                    entry: say("Could you repeat that?"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help5:{
            ...helpf("What clock will it take place?", "time")
        },

        confirm_time:{
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    target: "help6",
                    cond: (context) => context.recResult in commands },
                    {
                    cond: (context) => (grammar2[context.recResult] === a),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "end"},
                    {
                    cond: (context) => (grammar2[context.recResult] === b),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "who"},
                    { 
                    target: ".nomatch",
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp")}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create an appointment with ${context.person} on ${context.day} at ${context.time}?` })),
                    on: {ENDSPEECH: "ask"}
                },
                hist: {type: "history"},
				ask: {
					 entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
				 },
                maxspeech: {
                 ...speech("Yes or no?")
                },       
                nomatch: {
                    entry: say("Excuse me?"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help6:{
            ...helpf("Is this the right appointment?", "confirm_time")
        },

        confirm_whole:{
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    target: "help7",
                    cond: (context) => context.recResult in commands },
                    {
                    cond: (context) => (grammar2[context.recResult] === a),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "end"},
                    {
                    cond: (context) => (grammar2[context.recResult] === b),
                    actions: [assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    target: "who"},
                    { 
                    target: ".nomatch",
                    cond: (context) => !(context.recResult in commands),
                    actions: cancel("maxsp")}],
                MAXSPEECH: [{
                    cond: (context) => grammar3["count"] <= 2,
                    actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 }),
                    target:".maxspeech",},
                    {
                    cond: (context) => grammar3["count"] > 2, 
                    actions:assign((context) => { grammar3["count"]=0}),
                    target: "#root.dm.init", }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create an appointment with ${context.person} on ${context.day} for the whole day?`,
                    })),
                    on: {ENDSPEECH: "ask"}
                },
                hist: {type: "history"},
				ask: {
					 entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
				},
                maxspeech: {
                 ...speech("Yes or no?")
                }, 
                nomatch: {
                    entry: say("Excuse me?"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },

        help7:{
            ...helpf("Is this the right appointment?", "confirm_whole")
        },

        end: {
            entry: say("Your appointment has been created."),
            always: 'init'
        }
    }
})

const proxyurl = "https://cors-anywhere.herokuapp.com/";
const rasaurl = 'https://lingqs-intent.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        headers: { 'Origin': 'http://maraev.me' }, // only required with proxy
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());

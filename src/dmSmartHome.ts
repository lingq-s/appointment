import { MachineConfig, send, assign, Action } from "xstate";

// SRGS parser and example (logs the results to console on page load)
import { loadGrammar } from './runparser'
import { parse } from './chartparser'
import { grammar } from './grammars/smartHomeGrammar'

const gram = loadGrammar(grammar)
//console.log(gram)

//const input1 = "turn on the A C please"
//const prs1 = parse(input1.split(/\s+/), gram)
//const result1 = prs1.resultsForRule(gram.$root)[0]

//console.log(prs1)
//console.log(result1)


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function promptAndAsk(prompt: string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states: {
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH: 'ask' }
            },
            ask: {
                entry: send('LISTEN'),
            },
        }
    })
}

function parsing(text:string): MachineConfig<SDSContext, any, SDSEvent> {
    return (parse(text.split(/\s+/), gram).resultsForRule(gram.$root)[0])
}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
        welcome: {
            on: {
                RECOGNISED: [
                    { target: 'stop', cond: (context) => context.recResult === 'stop' },
                    { cond: (context) => parsing(context.recResult) !== undefined,
	     target: 'command', 
                      actions: assign((context) => { return { input: parsing(context.recResult) } },) },
                    {target: "nomatch" }]
            },
            ...promptAndAsk("May I help you?")
        },
        stop: {
            entry: say("Ok"),
            always: 'init'
        },
        nomatch: {
            entry: say("I didn't get you."),
            always: 'welcome'
        },
        command: {
            initial: 'prompt',
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Object: ${context.input.object}, action: ${context.input.action}.`,
                    on: { ENDSPEECH: 'init' }
                }))
                }
            }
        }
    }}
)

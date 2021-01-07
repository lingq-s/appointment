import "./styles.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Machine, createMachine, assign, send } from "xstate";
import { useMachine, asEffect, asLayoutEffect } from "@xstate/react";

import { useSpeechSynthesis, useSpeechRecognition } from 'react-speech-kit';


const colors = ['aqua', 'azure', 'beige', 'bisque', 'black', 'blue', 'brown', 'chocolate',
    'coral', 'crimson', 'cyan', 'fuchsia', 'ghostwhite', 'gold',
    'goldenrod', 'gray', 'green', 'indigo', 'ivory', 'khaki', 'lavender',
    'lime', 'linen', 'magenta', 'maroon', 'moccasin', 'navy', 'olive',
    'orange', 'orchid', 'peru', 'pink', 'plum', 'purple', 'red', 'salmon',
    'sienna', 'silver', 'snow', 'tan', 'teal', 'thistle', 'tomato',
    'turquoise', 'violet', 'white', 'yellow'];
const grammar = '#JSGF V1.0; grammar colors; public <color> = ' + colors.join(' | ') + ' ;'

var SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
const speechRecognitionList = new SpeechGrammarList();
speechRecognitionList.addFromString(grammar, 1);
const grammars = speechRecognitionList;

interface SDSContext {
    recResult: string;

}

/* const dmStates = {
 *     initial: 'welcome',
 *     states: {
 *         welcome: {
 *             on: {
 *                 CLICK: 'askColour'
 *             }
 *         },
 *         askColour: {
 *             entry: send('LISTEN')
 *             on: { ASR_RESULT: 'finish' }
 *         },
 *         finish: {}
 *     }
 * }
 *  */
/* const asrStates = {
 *     initial: 'idle',
 *     states: {
 *         idle: {
 *             on: {
 *                 CLICK: 'listening',
 *             }
 *         },
 *         listening: {
 *             entry: 'recStart',
 *             on: {
 *                 ASR_RESULT: {
 *                     actions: ['recSaveResult'],
 *                     target: 'idle'
 *                 },
 *             },
 *             exit: ['repaint', 'recStop']
 *         },
 *     }
 * }
 *  */

const machine = createMachine<SDSContext>({
    id: 'machine',
    type: 'parallel',
    states: {
        dm: {
            initial: 'init',
            states: {
                init: {
                    on: {
                        CLICK: 'askColour'
                    }
                },
                askColour: {
                    entry: send('LISTEN'),
                    on: { ASR_onResult: 'repaint' }
                },
                repaint: {
                    entry: [send('SPEAK'), 'repaint'],
                    on: {
                        CLICK: 'askColour'
                    }
                }
            }
        },

        asr: {
            initial: 'idle',
            states: {
                idle: {
                    on: {
                        LISTEN: 'listening',
                    }
                },
                listening: {
                    entry: 'recStart',
                    on: {
                        ASR_onResult: {
                            actions: ['recSaveResult'],
                            target: 'idle'
                        },
                    },
                    exit: 'recStop'
                },
            }
        },

        tts: {
            initial: 'idle',
            states: {
                idle: {
                    on: { SPEAK: 'speaking' },
                },
                speaking: {
                    entry: 'speak',
                    on: {
                        TTS_onEnd: 'idle'
                    }
                }
            }
        }
    }


},
    {
        actions: {
            recSaveResult: (context, event) => {
                context.recResult = event.recResult;
                console.log('Got: ' + event.recResult);
            },
            test: () => {
                console.log('test')
            }

        },
    });



interface HintProp {
    name: string;
}
function Hint(prop: HintProp) {
    return <span style={{ backgroundColor: prop.name }}>{' ' + prop.name}</span>
}

function App() {
    const { speak } = useSpeechSynthesis({
        onEnd: () => {
            send('TTS_onEnd');
        },
    });
    const { listen, listening, stop } = useSpeechRecognition({
        onResult: (result: any) => {
            send({ type: "ASR_onResult", recResult: result });
        },
    });
    const [current, send] = useMachine(machine, {
        actions: {
            recStart: asEffect(() => {
                console.log('Ready to receive a color command.');
                listen({
                    interimResults: false,
                    continuous: false,
                    grammars: grammars
                });
            }),
            recStop: asEffect(() => {
                console.log('Recognition stopped.');
                stop()
            }),
            repaint: asEffect((context) => {
                console.log('Repainting...');
                document.body.style.background = context.recResult;
            }),
            speak: asEffect((context) => {
                console.log('Speaking...');
                speak({ text: 'I heard ' + context.recResult })
            })
            /* speak: asEffect((context) => {
	     *     console.log('Speaking...');
	     *     speak({ text: context.ttsAgenda })
	     * } */
        }
    });
    const active = current.matches("listening");
    return (
        <div className="App" >
            {/* <h1>XState React ColourChanger</h1> */}
            < p >
                Tap / click then say a color to change the background color of the box.Try
	    {colors.map((v, _) => <Hint name={v} />)}.
	    </p >
            <button onClick={() => send('CLICK')}>
                🎤 {active ? 'Listening...' : 'Click me!'}
            </button>
        </div >
    );
}


const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
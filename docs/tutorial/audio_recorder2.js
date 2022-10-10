const jsPsych = initJsPsych({
    //display_element: 'audio-recorder-demo',
    on_finish: () => jsPsych.data.displayData()
});

const start_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: 'Start Experiment!',
    choices: ['Continue']
};

const dummy_rec = {
    type: PCMRecord,
    stimulus: 'Waiting for microphone permission...',
    trial_duration: 0.1,
    on_finish: (data) => {
        data.mic_signal = null;
    }
};

const rec = {
    type: PCMRecord,
    stimulus: jsPsych.timelineVariable('stimulus'),
    display: 'level'
};

const play = {
    type: PCMPlay,
    pcmData: () => jsPsych.data.get().last(1).trials[0],
    saveFunc: (data) => {
        data.mic_signal = null;
    },
    on_finish: () => jsPsych.data.get().last(2).trials[0].mic_signal = "I replaced this because it\'s static HTML"
};

const delay = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '+',
    choices: 'NO_KEYS',
    trial_duration: 300
};


const rec_play = {
    timeline: [delay, rec, play],
    loop_function: (data) => {
        return data.values()[2].retry
    }
};

// We need some stimuli. Let's prompt the participant to name colours
const stim_list = [
    {stimulus: 'red'},
    {stimulus: 'green'},
    {stimulus: 'blue'},
    {stimulus: 'yellow'},
];

// Now we define our main trials
const trials = {
    timeline: [rec_play],
    timeline_variables: stim_list,
    randomize_order: true
};


jsPsych.run([start_trial, dummy_rec, trials]);

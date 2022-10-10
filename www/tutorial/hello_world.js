var jsPsych = initJsPsych({
    //display_element: 'hello-world-demo',
    on_finish: () => jsPsych.data.displayData()
});

const hello_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: 'Hello world!',
    choices: ['next']
};

const goodbye_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: 'Goodbye world!',
    choices: ['next']
};

jsPsych.run([hello_trial, goodbye_trial]);

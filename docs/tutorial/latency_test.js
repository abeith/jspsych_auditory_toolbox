const jsPsych = initJsPsych({
    on_finish: () => jsPsych.data.displayData()
});

const latency_test = {
    timeline: [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: 'Run latency test',
            choices: ['Continue']
        },
        {
            type: jsPsychLatencyTest,
            stimulus: jsPsych.timelineVariable('stimulus'),
            duration: jsPsych.timelineVariable('duration'),
            f_max: jsPsych.timelineVariable('f_max'),
            fftSize: jsPsych.timelineVariable('fftSize'),
            dummy: jsPsych.timelineVariable('dummy')
    }],
    timeline_variables: [
        {fftSize: 1024, stimulus: '../sounds/chirp4.wav', f_max: 4000, duration: 10, dummy: 50/1000},
        {fftSize: 2048, stimulus: '../sounds/chirp4.wav', f_max: 4000, duration: 2, dummy: 50/1000},
        {fftSize: 1024, stimulus: '../sounds/chirp8.wav', f_max: 8000, duration: 2, dummy: 50/1000},
        {fftSize: 2048, stimulus: '../sounds/chirp8.wav', f_max: 8000, duration: 2, dummy: 50/1000},
        {fftSize: 1024, stimulus: '../sounds/chirp16.wav', f_max: 16000, duration: 2, dummy: 50/1000},
        {fftSize: 2048, stimulus: '../sounds/chirp16.wav', f_max: 16000, duration: 2, dummy: 50/1000},
        {fftSize: 2048, stimulus: '../sounds/chirp16.wav', f_max: 16000, duration: 5, dummy: 52/1000}
    ]
};

jsPsych.run([latency_test]);

const saveData = async(data, uri) => {
    const settings = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: data
    };

    try{
        const fetchResponse = await fetch(uri, settings);
        const data = await fetchResponse.json();
        return true;
    } catch(e){
        console.log(e);
        return false;
    }
};

const jsPsych = initJsPsych({
    on_finish: () => saveData(jsPsych.data.get().json(), './save_trials.php')
});

const trials = Array(99).fill().map((x,i) => {
    return {dummy: (i+1)/1000};
});

const start_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: 'Click continue when ready',
    choices: ['continue']
};

const latency_test = {
    timeline: [
        {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: '+',
            trial_duration: 500
        },
        {
            type: jsPsychLatencyTest,
            stimulus: '../sounds/chirp16.wav',
            duration: 2,
            f_max: 16000,
            fftSize: 2048,
            dummy: jsPsych.timelineVariable('dummy')
    }],
    timeline_variables: trials,
    randomize_order: true
};

jsPsych.run([start_trial, latency_test]);

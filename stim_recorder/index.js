// Define some functions

// File gets saved as SHA-256 hash so no need to pass file name when saving
const hashWAV = async (wav) => {
    var data = new DataView(wav);
    let hashBuffer = await crypto.subtle.digest("SHA-256", data);
    let hashArray = Array.from(new Uint8Array(hashBuffer));
    let hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

// This is the function used to save audio data: returns file name as hash
// Note that we only wait for the hash, not for the save response: 
const saveFunc = async (sig, fs, source = "mic") => {

    // Depends on audiobuffer-to-wav
    let wav = encodeWAV(sig, 1, fs, 1, 16);
    let hash = hashWAV(wav);
    // Apache detects file as 'audio/x-wav' rather than 'audio/wav' so using that for consistency
    let blob = new window.Blob([ new DataView(wav) ], { type: 'audio/x-wav' });

    if(source === "mic"){
        fetch(`php/saveMic.php`, { method: "POST", body: blob });
    }else if(source === "stim"){
        fetch(`php/saveStim.php`, { method: "POST", body: blob });
    };

    await hash;
    return hash;
};

// This is for saving the JSON file with our trial data
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

// To avoid loosing data we'll tell jsPsych to save the data if the window is closed
// To avoid saving it twice we'll define this variable
var saved = false;

const saveTrialData = () => {
    if(!saved){
        let trial_data = jsPsych.data.get().json();
        saveData(trial_data, './php/saveTrials.php');
        saved = true;
    };
};

// ACTUAL EXPERIMENT STARTS HERE

// Initiate jsPsych
var jsPsych = initJsPsych({
    on_finish: saveTrialData,
    on_close: saveTrialData
});

// Define some trials: The order doesn't matter at this point so we'll start with the simple ones

// Always a good idea to specify the key to encourage participants to read text on the screen
let hello = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 'Hello!<br>Press y to continue.',
    choices: ['y']
};

// If using a trial to say bye at the end make sure it has a duration so that the experiment ends
let bye = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 'bye',
    trial_duration: 1000
};

// We need to get permission from the user to access their microphone
var initMic = {
    type: jsPsychInitializeMicrophone
};

// We don't want to record the participant hitting the key from the end of the previous trial so we add a short delay (in milliseconds)
let delay = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 'delay',
    choices: 'NO_KEYS',
    trial_duration: 300
};

// Present stimulus and record response
// We're going to reuse this trial with different stimuli so the stimulus gets defined with a variable
let rec = {
    type: PCMRecord,
    stimulus: jsPsych.timelineVariable('stimulus'),
    trial_duration: 20.0
};

// Let the participant listen back to the audio
let play = {
    type: PCMPlay,
    pcmData: () => jsPsych.data.getLastTrialData().values()[0]
};

// Save the audio
let save_trial = {
    type: PCMSave,
    pcmData: () => jsPsych.data.get().last(2).trials[0],
    saveFunc: saveFunc
};

// We want to give the participant a chance to retry a recording so we loop these trials until they're happy
let rec_play = {
    timeline: [delay, rec, play],
    loop_function: (data) => {
        return data.values()[2].retry
    }
};

// We need some stimuli. Let's prompt the participant to name colours
let stim_list = [
    {stimulus: 'red'},
    {stimulus: 'green'},
    {stimulus: 'blue'},
    {stimulus: 'yellow'},
];

// Now we define our main trials
let trials = {
    timeline: [rec_play, save_trial],
    timeline_variables: stim_list,
    randomize_order: true
};

// Make a timeline with our trials in the correct order
let timeline = [hello, initMic, trials, bye];

// Run the experiment
jsPsych.run(timeline);

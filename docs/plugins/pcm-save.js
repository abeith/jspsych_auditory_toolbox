var PCMSave = (function (jspsych) {
    "use strict";

    const info = {
        name: "pcm-save",
        parameters: {
            pcmData: {
                type: jspsych.ParameterType.OBJECT,
                default: undefined,
            },
            saveFunc: {
                type: jspsych.ParameterType.FUNCTION,
                default: undefined
            },
        },
    };

    /**
     * **pcm-save**
     *
     * Save PCM data
     *
     * @author Alistair Beith
     * @see {@link https://DOCUMENTATION_URL DOCUMENTATION LINK TEXT}
     */
    class PCMSavePlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }
        trial(display_element, trial) {

            let save_audio = async () => {
                display_element.innerText = "saving...";
                let mic_ref = await trial.saveFunc(trial.pcmData.mic_signal, trial.pcmData.fs, "mic");
                display_element.innerText = "saved!";
                trial.pcmData.mic_signal = null;
                display_element.innerHTML = '';
                jsPsych.finishTrial({mic_ref: mic_ref, stimulus: trial.pcmData.stimulus});
            };

            save_audio();

        }
    }
    PCMSavePlugin.info = info;

    return PCMSavePlugin;
})(jsPsychModule);

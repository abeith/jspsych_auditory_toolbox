var PCMPlay = (function (jspsych) {
    "use strict";

    const info = {
        name: "pcm-play",
        parameters: {
            pcmData: {
                type: jspsych.ParameterType.OBJECT,
                default: undefined,
            },
            playKey: {
                type: jspsych.ParameterType.KEYS,
                default: "z"
            },
            retryKey: {
                type: jspsych.ParameterType.KEYS,
                default: "x"
            },
            nextKey: {
                type: jspsych.ParameterType.KEYS,
                default: "c"
            },
            autoplay: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            stimulus: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
        },
    };

    /**
     * **pcm-play**
     *
     * Play PCM array
     *
     * @author Alistair Beith
     * @see {@link https://DOCUMENTATION_URL DOCUMENTATION LINK TEXT}
     */
    class PCMPlayPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }
        trial(display_element, trial) {

            var html = `<div>${trial.pcmData.stimulus}</div>`;
            html += `<button id="play"><span>Play (${trial.playKey})</span></button><br>`;
            html += `<button id="retry"><span>Retry (${trial.retryKey})</span></button><br>`;
            html += `<button id="end_trial"><span>Sounds good (${trial.nextKey})</span></button><br>`;

            var context = this.jsPsych.pluginAPI.audioContext();

            const play = async () => {
                let pcm = new Float32Array(trial.pcmData.mic_signal.length);
                pcm = pcm.map((x, i) => trial.pcmData.mic_signal[i]);
                let buffer = context.createBuffer(1, pcm.length, trial.pcmData.fs);
                buffer.copyToChannel(pcm, 0, 0);
                this.source = context.createBufferSource();
                this.source.buffer = buffer;
                this.source.connect(context.destination);
                this.source.start(0);
            };

            const end_trial = (x) => {
                this.source.stop();
                this.jsPsych.pluginAPI.cancelKeyboardResponse(playKeyListener);
                this.jsPsych.pluginAPI.cancelKeyboardResponse(retryKeyListener);
                this.jsPsych.pluginAPI.cancelKeyboardResponse(nextKeyListener);
                jsPsych.finishTrial({retry: x});
            };

            display_element.innerHTML = html;

            const playButton = document.getElementById('play');
            const retryButton = document.getElementById('retry');
            const nextButton = document.getElementById('end_trial');

            const retryAction = () => {
                this.jsPsych.data.getLastTrialData().trials[0].mic_signal = null;
                display_element.innerHTML = '';
                end_trial(true);
            };

            const nextAction = () => {
                display_element.innerHTML = '';
                end_trial(false);
            };

            playButton.addEventListener('click', play, false);
            retryButton.addEventListener('click', retryAction, false);
            nextButton.addEventListener('click', nextAction, false);

            var playKeyListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: play,
                valid_responses: trial.playKey,
                persist: false
            });

            var retryKeyListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: retryAction,
                valid_responses: trial.retryKey,
                persist: false
            });

            var nextKeyListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: nextAction,
                valid_responses: trial.nextKey,
                persist: false
            });

            if(trial.autoplay) play();

        }
    }
    PCMPlayPlugin.info = info;

    return PCMPlayPlugin;
})(jsPsychModule);

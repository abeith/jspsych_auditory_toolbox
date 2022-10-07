var PCMRecord = (function (jspsych) {
    "use strict";

    const info = {
        name: "pcm-record",
        parameters: {
            stimulus: {
                type: jspsych.ParameterType.STRING,
                default: "test",
            },
            trial_duration: {
                type: jspsych.ParameterType.FLOAT,
                default: 1.0,
            },
        },
    };

    /**
     * **pcm-recorder**
     *
     * Display stim and record response
     *
     * @author Alistair Beith
     * @see {@link https://DOCUMENTATION_URL DOCUMENTATION LINK TEXT}
     */
    class PCMRecordPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }
        trial(display_element, trial) {

            const canvasX = 50;
            const canvasY = 50;

            let canvas = document.createElement('canvas');
            canvas.width = canvasX;
            canvas.height = canvasY;
            var ctx = canvas.getContext('2d');
            let stim_div = document.createElement('div');
            stim_div.innerText = trial.stimulus;

            const vuX = 200;
            const vuY = 50;

            let vu = document.createElement('canvas');
            vu.width = vuX;
            vu.height = vuY;
            vu.style.border = "solid 1px #555";
            var vu_ctx = vu.getContext('2d');
            vu_ctx.beginPath();
            vu_ctx.strokeStyle = "#f00";
            vu_ctx.moveTo(0, vuY);

            display_element.appendChild(canvas);
            display_element.appendChild(stim_div);
            display_element.appendChild(vu);

            var context = this.jsPsych.pluginAPI.audioContext();

            this.currTime = context.currentTime;
            this.startTime = undefined;

            const draw = () => {
                this.drawProgress = requestAnimationFrame(draw);

                ctx.clearRect(0, 0, canvasX, canvasY);
                ctx.beginPath();
                let progress = (context.currentTime - this.startTime) / trial.trial_duration;
                progress = progress - 0.25;
                ctx.arc(canvasX/2, canvasY/2, canvasX/2.1, Math.PI * 1.5, Math.PI * 2 * progress);
                ctx.strokeStyle = "#f00";
                ctx.stroke();
            };

            this.max_vol = 1.0;

            const rgbToHex = (r, g, b) => {
                return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            };

            const draw_level = (vol) => {
                // if(vol > this.max_vol) {
                //     this.max_vol = vol;
                //     console.log(this.max_vol);
                //     }
                let height = 1 - (vol/this.max_vol);
                let progress = (context.currentTime - this.startTime) / trial.trial_duration;
                let colour = rgbToHex(255 * (1 - height), 255 * height, 0);
                vu_ctx.background = colour;
                // vu_ctx.strokeStyle = colour;
                vu_ctx.lineTo(progress * vuX, height * vuY);
                vu_ctx.stroke();
                vu_ctx.beginPath();
                vu_ctx.moveTo(progress * vuX, height * vuY);
            };

            var trial_data = {
                mic_signal: [],
                fs: null,
                stimulus: trial.stimulus
            };

            // Audio

            const getMic = async () => {
                try{
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: false,
                            autoGainControl: false,
                            noiseSuppression: false
                        }
                    });
                }catch(e){
                    console.log('error in getMic: ', e);
                };
            };

            const startTrial = async () => {
                await getMic();
                await context.audioWorklet.addModule('../js/recorderWorkletProcessor.js');
                this.mediaStreamNode = context.createMediaStreamSource(this.stream);
                this.micProcessor = new AudioWorkletNode(context, 'recorder-worklet');
                this.mediaStreamNode.connect(this.micProcessor);

                this.startTime = context.currentTime;

                this.micProcessor.parameters.get('isRecording').setValueAtTime(1, this.startTime);
                this.micProcessor.parameters.get('isRecording').setValueAtTime(0, this.startTime + trial.trial_duration);
                this.micProcessor.port.onmessage = (event) => {
                    if (event.data.eventType === 'data') {
                        event.data.audioBuffer.map(x => trial_data.mic_signal.push(x));
                        draw_level(Math.sqrt(event.data.vol));
                    };
                    if (event.data.eventType === 'stop') {
                        endTrial();
                    };
                };

                draw();
            };


            const endTrial = async () => {
                trial_data.fs = context.sampleRate;

                cancelAnimationFrame(this.drawProgress);
                display_element.innerText = '';


                this.jsPsych.finishTrial(trial_data);
            };

            // Run
            startTrial();
        }
    }
    PCMRecordPlugin.info = info;

    return PCMRecordPlugin;
})(jsPsychModule);

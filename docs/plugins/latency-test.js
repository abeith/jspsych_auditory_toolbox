var jsPsychLatencyTest = (function (jspsych) {
    "use strict";

    const info = {
        name: "latency-test",
        parameters: {
            stimulus: {
                type: jspsych.ParameterType.AUDIO,
                default: undefined,
            },
            duration: {
                type: jspsych.ParameterType.FLOAT,
                default: undefined,
            },
            dummy: {
                type: jspsych.ParameterType.FLOAT,
                default: undefined,
            },
            f_max: {
                type: jspsych.ParameterType.INT,
                default: 24000,
            },
            fftSize: {
                type: jspsych.ParameterType.INT,
                default: 2048,
            },
            vol: {
                type: jspsych.ParameterType.FLOAT,
                default: 0.05,
            },
        },
    };

    /**
     * **latency test**
     *
     * Play and record audio to calculate round trip latency
     *
     * @author Alistair Beith
     * @see {@link https://DOCUMENTATION_URL DOCUMENTATION LINK TEXT}
     */
    class jsPsychLatencyTestPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }
        trial(display_element, trial) {

            var context = this.jsPsych.pluginAPI.audioContext();

            let disp_prop = 1000/trial.fftSize;

            this.audio_data = {
                fft_data: []
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


            const play = async (stimulus) => {
                this.gainNode = context.createGain();
                this.gainNode.gain.setValueAtTime(trial.vol, 0);
                this.analyser = context.createAnalyser();
                this.analyser.fftSize = trial.fftSize;
                this.bufferLen = this.analyser.frequencyBinCount;
                this.fftData = new Uint8Array(this.bufferLen);

                let buffer = await this.jsPsych.pluginAPI.getAudioBuffer(stimulus);
                await context.audioWorklet.addModule('../js/multiplierWorkletProcessor.js');
                this.channelMultiplier = new AudioWorkletNode(context, 'multiplier-worklet', { numberOfInputs: 2});

                if(!trial.dummy) await getMic();

                this.audio = context.createBufferSource();
                this.audio.buffer = buffer;
                this.audio.connect(this.channelMultiplier, 0, 0);
                this.audio.connect(this.gainNode);
                this.gainNode.connect(context.destination);

                this.start_time = context.currentTime + 0.1;

                if(trial.dummy){
                    this.dummy = context.createBufferSource();
                    this.dummy.buffer = buffer;
                    this.dummy.connect(this.channelMultiplier, 0, 1);
                    this.channelMultiplier.connect(this.analyser);
                    // Delay audio by 50ms
                    this.audio.start(this.start_time);
                    this.dummy.start(this.start_time + trial.dummy);
                }else{
                    this.mediaStreamNode = context.createMediaStreamSource(this.stream);
                    this.mediaStreamNode.connect(this.channelMultiplier, 0, 1);
                    this.channelMultiplier.connect(this.analyser);
                    this.audio.start(this.start_time);
                }

                this.canvas = document.createElement('canvas');
                this.canvas.height = Math.round(disp_prop * this.bufferLen);
                this.canvas.width = 500;

                this.ctx = this.canvas.getContext('2d');

                if(trial.dummy){
                    this.ctx.strokeStyle = 'rgb(256, 0, 0)';
                    this.ctx.beginPath();
                    const freq = Math.round(disp_prop * this.bufferLen) - ((trial.f_max * 2) * (trial.dummy * this.bufferLen) / context.sampleRate);
                    this.ctx.moveTo(0, freq);
                    this.ctx.lineTo(500, freq);
                    this.ctx.stroke();
                }else{
                    [0, 0.05, 0.1, 0.15, 0.2].map(x => {
                        let freq = Math.round(disp_prop * this.bufferLen) - ((trial.f_max * 2) * (x * this.bufferLen) / context.sampleRate);
                        this.ctx.strokeStyle = `rgb(${Math.round(256*(x/0.2))}, ${256 - Math.round(256*(x/0.2))}, 0)`;
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, freq);
                        this.ctx.lineTo(500, freq);
                        this.ctx.stroke();
                        }
                    );
                };

                display_element.appendChild(this.canvas);

                draw();
            };

            const endTrial = async () => {


                let fs = context.sampleRate;
                let fft_data = [...this.audio_data.fft_data];

                let binWidth = 1000 * (context.sampleRate / (2 * trial.f_max)) / this.bufferLen;

                let latency = fft_data.map(x => x.fft).map(x => x.indexOf(Math.max(...x))).filter(x => x > 0);

                latency = latency.reduce((total, cv, ci, arr) => {
                    const prev_len = arr.filter(x => x === total).length;
                    const curr_len = arr.filter(x => x === cv).length;
                    const res = (prev_len < curr_len) ? cv : total;
                    return res;
                }, 0);

                // Index 0 is bin 1
                latency = (latency + 0.5) * binWidth;

                // fft_data = null;

                if(trial.dummy){
                    console.log(`${1000*trial.dummy}:${latency}`);
                }else{
                    console.log(`${latency}`);
                };

                // Clear memory (doesn't get GC'd)
                this.audio_data = {
                    fft_data: []
                };

                cancelAnimationFrame(this.drawVisual);

                // audio_data = null;
                // fft_data = null;

                var trial_data = {
                    fs: context.sampleRate,
                    // fft_data: fft_data,
                    latency: latency,
                    f_max: trial.f_max,
                    bin_width: binWidth,
                    dummy: Math.round(trial.dummy * 1000),
                    file: trial.stimulus,
                    fft_size: trial.fftSize
                };

                // if (trial.display) clearInterval(draw_timer);
                display_element.innerHTML = '';   

                this.jsPsych.finishTrial(trial_data);
            };

            var i = 0;

            const draw = () => {
                this.drawVisual = requestAnimationFrame(draw);

                this.analyser.getByteFrequencyData(this.fftData);

                let fftData = this.fftData.map(x => x);

                let data = {
                    t: context.currentTime - this.start_time,
                    fft: fftData
                };

                this.audio_data.fft_data.push(data);

                fftData = null;
                data = null;

                i += 1;


                for (var j = 0; j < Math.round(disp_prop * this.bufferLen); j++){
                    const red = (this.fftData[j] === Math.max(...this.fftData)) ? 0 : 255;
                    // this.ctx.fillStyle = `rgba(256,${red},${red},${(this.fftData[j]/128)})`;
                    this.ctx.fillStyle = `rgba(0,0,0,${(this.fftData[j]/128)})`;
                    const x = i * 4;
                    const y = Math.round(disp_prop * this.bufferLen) - j;
                    this.ctx.fillRect(x, y, 4, 1);
                };
            };

            // Run


            play(trial.stimulus);

            jsPsych.pluginAPI.setTimeout(endTrial, 2 * trial.duration * 1000);

        }
    }
    jsPsychLatencyTestPlugin.info = info;

    return jsPsychLatencyTestPlugin;
})(jsPsychModule);

import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

// BOOL, STRING, INT, FLOAT, FUNCTION, KEY, KEYS, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX

const info = <const>{
    name: "latency-test",
    parameters: {
        stimulus: {
            type: ParameterType.AUDIO,
            pretty_name: "Stimulus",
            default: undefined,
        },
        trial_duration: {
            type: ParameterType.INT,
            pretty_name: "Trial duration",
            default: null,
        },
        dummy: {
            type: ParameterType.FLOAT,
            pretty_name: "Dummy latency",
            default: null,
        },
        f_max: {
            type: ParameterType.INT,
            pretty_name: "Maximum frequency of chrip",
            default: null,
        },
        fft_size: {
            type: ParameterType.INT,
            pretty_name: "Size of FFT",
            default: null,
        },
        vol: {
            type: ParameterType.FLOAT,
            pretty_name: "Trial volume",
            default: 0.05,
        },
        random_delay: {
            type: ParameterType.BOOL,
            pretty_name: "Random delay",
            default: true,
        },
    },
};

type Info = typeof info;

/**
 * **latency-test**
 *
 * jsPsych plugin for testing round-trip latency
 *
 * @author Alistair Beith
 * @see {@link https://github.com/abeith/jspsych_auditory_toolbox latency-test plugin documentation at GitHub repo}
 */
class LatencyTestPlugin implements JsPsychPlugin<Info> {
    static info = info;
    private audio;
    private stream;
    private mediaStreamNode;
    private channelMultiplier;
    private fftData;
    private fftPeak;
    private fftTime;
    private gainNode;
    private analyser;
    private bufferLen;
    private dummy;
    private binWidth;
    private drawVisual;
    private delayNode;
    private randomDelay;
    private startTime;

    constructor(private jsPsych: JsPsych) {}

    trial(display_element: HTMLElement, trial: TrialType<Info>) {
        var context = this.jsPsych.pluginAPI.audioContext();
        context.resume();

        var canvas, ctx;

        // For displaying spectrogram
        let disp_prop = 1000/trial.fft_size;

        this.fftData = [];
        this.fftPeak = [];
        this.fftTime = [];

        // data saving
        var trial_data = {
            fs: null,
            latency: null,
            latency_upper: null,
            latency_lower: null,
            f_max: trial.f_max,
            bin_width: null,
            dummy: trial.dummy * 1000,
            file: trial.stimulus,
            fft_size: trial.fft_size,
            random_delay: null,
            fft_data: null
        };



        const getMic = async () => {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                },
            });

            this.mediaStreamNode = context.createMediaStreamSource(this.stream);

            return true;
        };

        const setup = async () => {
            this.gainNode = context.createGain();
            this.gainNode.gain.setValueAtTime(trial.vol, 0);
            this.analyser = context.createAnalyser();
            this.analyser.fftSize = trial.fft_size;
            this.bufferLen = this.analyser.frequencyBinCount;
            // this.fftData = new Uint8Array(this.bufferLen);

            this.binWidth = 1000 * (context.sampleRate / (2 * trial.f_max)) / this.bufferLen;
            this.randomDelay = (trial.random_delay) ? (Math.random() * this.binWidth) / 1000 : 0.0;
            this.delayNode = new DelayNode(context, {delayTime: this.randomDelay});

            let buffer = await this.jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);

            // NOTE: This file needs to be added to assets to work! What's the proper way to do this?
            await context.audioWorklet.addModule('assets/multiplierWorkletProcessor.js');
            this.channelMultiplier = new AudioWorkletNode(context, 'multiplier-worklet', { numberOfInputs: 2});

            if(!trial.dummy) await getMic();

            this.audio = context.createBufferSource();
            this.audio.buffer = buffer;
            this.audio.connect(this.channelMultiplier, 0, 0);
            this.audio.connect(this.gainNode);
            this.gainNode.connect(context.destination);

            if(trial.dummy){
                this.dummy = await context.createBufferSource();
                this.dummy.buffer = await buffer;
                this.dummy.connect(this.delayNode);
                this.delayNode.connect(this.channelMultiplier, 0, 1);
                this.channelMultiplier.connect(this.analyser);
            }else{
                // this.mediaStreamNode = context.createMediaStreamSource(this.stream);
                this.mediaStreamNode.connect(this.delayNode);
                this.delayNode.connect(this.channelMultiplier, 0, 1);
                this.channelMultiplier.connect(this.analyser);
            };
        };

        const startTrial = async () => {


            await setup();
            await context.resume();

            const init_time = context.currentTime;
            const padding = 0.5;
            this.startTime = init_time + padding;

            console.log(`init time: ${init_time}; start time: ${this.startTime}`);

            if(trial.dummy){
                this.audio.start(this.startTime);
                this.dummy.start(this.startTime + trial.dummy);
            }else{
                this.audio.start(this.startTime);
            }

            canvas = document.createElement('canvas');
            canvas.height = Math.round(disp_prop * this.bufferLen);
            canvas.width = 500;

            ctx = canvas.getContext('2d');

            if(trial.dummy){
                ctx.strokeStyle = 'rgb(256, 0, 0)';
                ctx.beginPath();
                const freq = Math.round(disp_prop * this.bufferLen) - ((trial.f_max * 2) * ((trial.dummy + this.randomDelay) * this.bufferLen) / context.sampleRate);
                ctx.moveTo(0, freq);
                ctx.lineTo(500, freq);
                ctx.stroke();
            }else{
                [0, 0.05, 0.1, 0.15, 0.2].map(x => {
                    let freq = Math.round(disp_prop * this.bufferLen) - ((trial.f_max * 2) * (x * this.bufferLen) / context.sampleRate);
                    ctx.strokeStyle = `rgb(${Math.round(256*(x/0.2))}, ${256 - Math.round(256*(x/0.2))}, 0)`;
                    ctx.beginPath();
                    ctx.moveTo(0, freq);
                    ctx.lineTo(500, freq);
                    ctx.stroke();
                }
                                             );
            };

            display_element.appendChild(canvas);


            // console.log((trial.dummy + this.startTime));

            draw();
        };

        var i = 0;

        // Need to think about how this will work with css themes
        // Spectrogram should be white if background is white
        var colour = [0,0,0];

        const draw = () => {
            // Append fftData array
            var fftData = new Uint8Array(trial.fft_size);
            this.analyser.getByteFrequencyData(fftData);
            this.fftData.push(fftData);
            // console.log(this.fftData);

            var fftPeak = fftData.indexOf(Math.max(...fftData));
            this.fftPeak.push(fftPeak);

            this.fftTime.push(context.currentTime);

            this.drawVisual = requestAnimationFrame(draw);

            for (var j = 0; j < Math.round(disp_prop * this.bufferLen); j++){
                var alpha = (this.fftData[i][j]/128);
                ctx.fillStyle = `rgba(${colour[0]},${colour[1]},${colour[2]},${alpha})`;
                const x = i * 4;
                const y = Math.round(disp_prop * this.bufferLen) - j;
                ctx.fillRect(x, y, 4, 1);
            };

            ctx.fillStyle = (trial.dummy) ? 'rgba(255,255,255,255)' : 'rgba(255,0,0,255)';
            ctx.fillRect(i * 4, Math.round(disp_prop * this.bufferLen) - fftPeak, 4, 1);

            // Highlight period when signal is playing
            // Why is this still a bar on the spectrogram when the
            // stimulus signal should be 0?
            if (context.currentTime >= (1.0 + this.startTime)){
                ctx.fillStyle = 'rgba(0,0,255,0.1)';
                ctx.fillRect(i * 4, 0, 4, Math.round(disp_prop * this.bufferLen));
            };

            i += 1;
        };


        startTrial();

        const endTrial = async () => {
            let fs = context.sampleRate;

            this.fftPeak = this.fftPeak.filter(x => x > 0);

            // Median, Mode or longest run?
            var latency = this.fftPeak.reduce((total, cv, ci, arr) => {
                const prev_len = arr.filter(x => x === total).length;
                const curr_len = arr.filter(x => x === cv).length;
                const res = (prev_len < curr_len) ? cv : total;
                return res;
            }, 0);

            latency = latency * this.binWidth;
            latency = latency - (this.randomDelay * 1000);

            cancelAnimationFrame(this.drawVisual);

            trial_data.fs = context.sampleRate;
            trial_data.latency = latency;
            // trial_data.latency_mean = latency_mean;
            trial_data.latency_lower = latency - (0.5 * this.binWidth);
            trial_data.latency_upper = latency + (0.5 * this.binWidth);
            trial_data.f_max = trial.f_max;
            trial_data.bin_width = this.binWidth;
            trial_data.random_delay = this.randomDelay * 1000;
            // trial_data.fft_data = [...this.fftData];

            // if (trial.display) clearInterval(draw_timer);
            display_element.innerHTML = '';

            context.suspend();

            this.jsPsych.finishTrial(trial_data);
        };

        this.jsPsych.pluginAPI.setTimeout(endTrial, trial.trial_duration + 5000);
    }
}

export default LatencyTestPlugin;

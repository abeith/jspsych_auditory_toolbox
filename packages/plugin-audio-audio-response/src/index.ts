import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

// BOOL, STRING, INT, FLOAT, FUNCTION, KEY, KEYS, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX

const info = <const>{
  name: "audio-audio-response",
  parameters: {
    stimulus: {
      type: ParameterType.AUDIO,
      pretty_name: "Stimulus",
      default: undefined,
    },
    prompt: {
      type: ParameterType.STRING,
      pretty_name: "Prompt",
      default: undefined,
    },
    trial_duration: {
      type: ParameterType.INT,
      pretty_name: "Trial duration",
      default: null,
    },
  },
};

type Info = typeof info;

/**
 * **audio-audio-response**
 *
 * jsPsych plugin for playing and audio file and recordings an auditory response
 *
 * @author Alistair Beith
 * @see {@link https://github.com/abeith/jspsych-contrib audio-audio-response plugin documentation at GitHub repo}
 */
class AudioAudioResponsePlugin implements JsPsychPlugin<Info> {
  static info = info;
  private audio;
  private stream;
  private mediaStreamNode;
  private stimProcessor;
  private micProcessor;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    var context = this.jsPsych.pluginAPI.audioContext();

    // data saving
    var trial_data = {
      stimulus: trial.stimulus,
      prompt: trial.prompt,
      t: [],
      mic_signal: [],
      stim_signal: [],
      fs: null,
    };

    const endTrial = () => {
      trial_data.fs = context.sampleRate;
      display_element.innerHTML = "";
      this.jsPsych.finishTrial(trial_data);
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

    const setupWorklets = async () => {
      // NOTE: This file needs to be added to assets to work! What's the proper way to do this?
      await context.audioWorklet.addModule("assets/recorderWorkletProcessor.js");
      this.stimProcessor = new AudioWorkletNode(context, "recorder-worklet");
      this.micProcessor = new AudioWorkletNode(context, "recorder-worklet");

      this.stimProcessor.port.onmessage = (event) => {
        if (event.data.eventType === "data") {
          event.data.audioBuffer.map((x) => trial_data.stim_signal.push(x));
          // Note that this is called after the message is received so is only an indication
          trial_data.t.push(context.currentTime);
        } else if (event.data.eventType === "stop") {
          endTrial();
        }
      };

      this.micProcessor.port.onmessage = (event) => {
        if (event.data.eventType === "data") {
          event.data.audioBuffer.map((x) => trial_data.mic_signal.push(x));
        }
      };
      return true;
    };

    const startTrial = async () => {
      let buffer = await this.jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
      this.audio = context.createBufferSource();
      this.audio.buffer = buffer;

      await getMic();
      await setupWorklets();

      this.audio.connect(this.stimProcessor);
      this.stimProcessor.connect(context.destination);
      this.mediaStreamNode.connect(this.micProcessor);

      // Padding is added because I'm not convinced that using
      // await is enough with the media stream
      const init_time = context.currentTime;
      const padding = 0.5;
      const start_time = init_time + padding;
      const end_time = start_time + trial.trial_duration / 1000;

      display_element.innerHTML = trial.prompt;
      this.micProcessor.parameters.get("isRecording").setValueAtTime(1, start_time);
      this.stimProcessor.parameters.get("isRecording").setValueAtTime(1, start_time);
      this.micProcessor.parameters.get("isRecording").setValueAtTime(0, end_time);
      this.stimProcessor.parameters.get("isRecording").setValueAtTime(0, end_time);
      this.audio.start(start_time);
    };

    startTrial();
  }
}

export default AudioAudioResponsePlugin;

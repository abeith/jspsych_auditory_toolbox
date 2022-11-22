class MultiplierWorkletProcessor extends AudioWorkletProcessor {
    constructor (options) {
        super()
        // console.log(options.numberOfInputs);
        // console.log(options.numberOfOutputs);
    }
    process(inputs, outputs, parameters) {
        // const numberOfInputs = inputs.length;

        let stim_input = inputs[0];
        let mic_input = inputs[1];
        let output = outputs[0];

        if(!stim_input[0]) {
            return true
        }else if(!mic_input[0]){
            return true
        }else{
            let stim_sig = stim_input[0];
            let mic_sig = mic_input[0];
            let cross = new Float32Array(output[0].length);
            // console.log(`${stim_sig.length}:${mic_sig.length}:${output[0].length}`)

            for(let i = 0; i < output[0].length; i++){
                cross[i] = stim_sig[i] * mic_sig[i]
            }

            output[0].set(cross);

            return true
        }
    }
}

registerProcessor('multiplier-worklet', MultiplierWorkletProcessor);

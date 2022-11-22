class RecorderWorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "isRecording",
        defaultValue: 0,
      },
    ];
  }

  constructor() {
    super();
    this._bufferSize = 2048;
    this._buffer = new Float32Array(this._bufferSize);
    this._initBuffer();
  }

  _initBuffer() {
    this._bytesWritten = 0;
  }

  _isBufferEmpty() {
    return this._bytesWritten === 0;
  }

  _isBufferFull() {
    return this._bytesWritten === this._bufferSize;
  }

  _appendToBuffer(value) {
    if (this._isBufferFull()) {
      // For debugging only! Checks if worklet is running in background
      // console.log('buffer full');
      this._flush();
    }

    this._buffer[this._bytesWritten] = value;
    this._bytesWritten += 1;
  }

  _flush() {
    let buffer = this._buffer;
    if (this._bytesWritten < this._bufferSize) {
      buffer = buffer.slice(0, this._bytesWritten);
    }

    this.port.postMessage({
      eventType: "data",
      audioBuffer: buffer,
    });

    this._initBuffer();
  }

  _recordingStopped() {
    this.port.postMessage({
      eventType: "stop",
    });
  }

  process(inputs, outputs, parameters) {
    const isRecordingValues = parameters.isRecording;
    let input = inputs[0];
    let output = outputs[0];
    for (let channel = 0; channel < input.length; ++channel) {
      output[channel].set(input[channel]);
    }

    for (let dataIndex = 0; dataIndex < output[0].length; dataIndex++) {
      const shouldRecord =
        (isRecordingValues.length > 1 ? isRecordingValues[dataIndex] : isRecordingValues[0]) === 1;

      if (!shouldRecord && !this._isBufferEmpty()) {
        this._flush();
        this._recordingStopped();
        return false;
      }

      if (shouldRecord) {
        this._appendToBuffer(outputs[0][0][dataIndex]);
      }
    }

    return true;
  }
}

registerProcessor("recorder-worklet", RecorderWorkletProcessor);

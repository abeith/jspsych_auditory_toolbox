import { simulateTimeline, startTimeline } from "@jspsych/test-utils";

import audioAudioResponse from ".";

jest.useFakeTimers();

describe("latency-test simulation", () => {
  test.skip("data mode works", async () => {
    const timeline = [
      {
        type: latencyTest,
        stimulus: "chirp16.wav",
          trial_duration: 1500,
          dummy: 0.1,
          f_max: 16000,
          fft_size: 2048,
          randomDelay: true,
      },
    ];

    const { expectFinished, getData } = await simulateTimeline(timeline);

    await expectFinished();

    expect(typeof getData().values()[0].fs).toBe("integer");
  });
});

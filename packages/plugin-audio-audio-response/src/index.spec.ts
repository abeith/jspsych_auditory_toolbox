import { simulateTimeline, startTimeline } from "@jspsych/test-utils";

import audioAudioResponse from ".";

jest.useFakeTimers();

describe("audio-audio-response simulation", () => {
  test.skip("data mode works", async () => {
    const timeline = [
      {
        type: audioAudioResponse,
        stimulus: "foo.mp3",
        prompt: "say bar",
        trial_duration: 1000,
      },
    ];

    const { expectFinished, getData } = await simulateTimeline(timeline);

    await expectFinished();

    expect(typeof getData().values()[0].fs).toBe("integer");
  });
});

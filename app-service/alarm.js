import {
  AppService
} from "@zos/app-service";

import {
  notify
} from "@zos/notification";

import {
  createSystemSounds,
  getSystemSoundTypes,
  playSystemSound
} from "zeppcore";

AppService({
  onInit(params) {
    let hour = 7;
    let minute = 0;

    if (typeof params === "string" && params.length > 0) {
      try {
        const parsed = JSON.parse(params);

        if (Number.isFinite(Number(parsed.hour))) {
          hour = Math.max(0, Math.min(23, Number(parsed.hour)));
        }

        if (Number.isFinite(Number(parsed.minute))) {
          minute = Math.max(0, Math.min(59, Number(parsed.minute)));
        }
      } catch (error) {
        console.log("Zepp Alarm service params could not be parsed");
      }
    }

    const timeText =
      String(hour).padStart(2, "0") +
      ":" +
      String(minute).padStart(2, "0");

    const sounds = createSystemSounds();
    const types = getSystemSoundTypes(sounds);

    if (sounds.getEnabled() && types && types.ALARM !== undefined) {
      playSystemSound(types.ALARM, 5, sounds);
    }

    notify({
      title: "Zepp Alarm",
      content: "Alarm • " + timeText,
      actions: [],
      vibrate: 5
    });
  }
});
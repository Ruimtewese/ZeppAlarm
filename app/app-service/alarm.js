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

    if (
      typeof params === "string" &&
      params.length > 0
    ) {
      try {
        const data =
          JSON.parse(params);

        hour =
          Math.max(
            0,
            Math.min(
              23,
              Number(data.hour)
            )
          );

        minute =
          Math.max(
            0,
            Math.min(
              59,
              Number(data.minute)
            )
          );
      } catch (error) {
        console.log(
          "Alarm service params invalid"
        );
      }
    }

    const timeText =
      String(hour).padStart(2, "0") +
      ":" +
      String(minute).padStart(2, "0");

    const sounds =
      createSystemSounds();

    const types =
      getSystemSoundTypes(
        sounds
      );

    if (
      sounds.getEnabled() &&
      types &&
      types.ALARM !== undefined
    ) {
      playSystemSound(
        types.ALARM,
        5,
        sounds
      );
    }

    notify({
      title: "Zepp Alarm",
      content:
        "Alarm • " +
        timeText,
      actions: [],
      vibrate: 5
    });
  }
});
import {
  setupPage,
  configureTheme,
  text,
  pillAligned,
  card,
  createSystemSounds,
  getSystemSoundTypes,
  playSystemSound,
  stopSystemSound,
  loadObject,
  saveObject,
  exitApp
} from "zeppcore";

import {
  set,
  REPEAT_ONCE
} from "@zos/alarm";

import {
  COLORS
} from "../../../utils/theme.js";

const STORAGE_KEY =
  "zepp_alarm";

const SNOOZE_MINUTES =
  5;

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value)
    )
  );
}

function formatAlarmTime(
  hour,
  minute
) {
  const safeHour =
    clamp(
      hour,
      0,
      23
    );

  const safeMinute =
    clamp(
      minute,
      0,
      59
    );

  const hour12 =
    safeHour % 12 || 12;

  const period =
    safeHour >= 12
      ? "PM"
      : "AM";

  return (
    String(hour12) +
    ":" +
    String(
      safeMinute
    ).padStart(
      2,
      "0"
    ) +
    " " +
    period
  );
}

Page({
  state: {
    alarm: {
      hour: 7,
      minute: 0
    },

    sounds:
      null
  },

  onInit() {
    const saved =
      loadObject(
        STORAGE_KEY,
        {}
      );

    if (
      saved &&
      typeof saved ===
        "object"
    ) {
      this.state.alarm = {
        hour:
          clamp(
            saved.hour ??
              7,
            0,
            23
          ),

        minute:
          clamp(
            saved.minute ??
              0,
            0,
            59
          )
      };
    }

    this.state.sounds =
      createSystemSounds();
  },

  build() {
    setupPage({
      hideStatusBar:
        true
    });

    configureTheme({
      background:
        COLORS.background,

      surface:
        COLORS.surface,

      surface2:
        COLORS.surface2,

      accent:
        COLORS.sky,

      accentPressed:
        COLORS.skyPressed,

      text:
        COLORS.text,

      textMuted:
        COLORS.muted,

      success:
        COLORS.mint,

      border:
        COLORS.border,

      radius: 26
    });

    this.buildBackground();
    this.buildTime();
    this.buildSnooze();
    this.buildCancel();

    this.startAlarmSound();
  },

  buildBackground() {
    card({
      x: 0,
      y: 0,
      w: 390,
      h: 450,
      color:
        COLORS.background,
      radius: 0
    });
  },

  buildTime() {
    text({
      x: 20,
      y: 42,
      w: 350,
      h: 28,
      value:
        "ALARM",
      color:
        COLORS.muted,
      size: 18
    });

    text({
      x: 20,
      y: 91,
      w: 350,
      h: 95,
      value:
        formatAlarmTime(
          this.state.alarm.hour,
          this.state.alarm.minute
        ),
      color:
        COLORS.text,
      size: 58
    });
  },

  buildSnooze() {
    pillAligned({
      x: 20,
      y: 214,
      w: 350,
      h: 76,
      text:
        "SNOOZE 5 MIN",
      horizontal:
        "center",
      vertical:
        "center",
      textColor:
        0x091015,
      textSize: 22,
      normalColor:
        COLORS.sky,
      pressColor:
        COLORS.skyPressed,
      radius: 38,

      onClick: () => {
        this.snooze();
      }
    });
  },

  buildCancel() {
    pillAligned({
      x: 20,
      y: 308,
      w: 350,
      h: 76,
      text:
        "CANCEL",
      horizontal:
        "center",
      vertical:
        "center",
      textColor:
        COLORS.text,
      textSize: 21,
      normalColor:
        COLORS.surface,
      pressColor:
        COLORS.surface2,
      radius: 38,

      onClick: () => {
        this.cancelAlarm();
      }
    });
  },

  startAlarmSound() {
    const sounds =
      this.state.sounds;

    if (
      !sounds ||
      !sounds.getEnabled()
    ) {
      return;
    }

    const types =
      getSystemSoundTypes(
        sounds
      );

    if (
      !types ||
      types.ALARM ===
        undefined
    ) {
      return;
    }

    playSystemSound(
      types.ALARM,
      30,
      sounds
    );
  },

  snooze() {
    const sounds =
      this.state.sounds;

    if (sounds) {
      stopSystemSound(
        sounds
      );
    }

    const wakeAt =
      Date.now() +
      SNOOZE_MINUTES *
      60 *
      1000;

    const snoozeId =
      set({
        url:
          "page/gt/alarm/index.page",

        time:
          Math.floor(
            wakeAt / 1000
          ),

        repeat_type:
          REPEAT_ONCE,

        store: false
      });

    if (
      snoozeId
    ) {
      const saved =
        loadObject(
          STORAGE_KEY,
          {}
        );

      saveObject(
        STORAGE_KEY,
        {
          ...saved,
          snoozeAlarmId:
            snoozeId
        }
      );

      exitApp();
    }
  },

  cancelAlarm() {
    if (
      this.state.sounds
    ) {
      stopSystemSound(
        this.state.sounds
      );
    }

    exitApp();
  },

  onDestroy() {
    if (
      this.state.sounds
    ) {
      stopSystemSound(
        this.state.sounds
      );
    }
  }
});

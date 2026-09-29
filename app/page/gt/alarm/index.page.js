import {
  setupPage,
  configureTheme,
  text,
  pillAligned,
  card,
  loadObject,
  exitApp,

  vibrateStrong,
  createAudioPlayer,
  setAudioSource,
  setAudioVolume,
  prepareAudio,
  stopAudio
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

const SOUND_FILE =
  "alarm.mp3";

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
      minute: 0,
      sound: true,
      vibration: true
    },

    player:
      null,

    vibrationTimer:
      null,

    audioRestartTimer:
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
          ),

        sound:
          saved.sound === undefined
            ? true
            : Boolean(saved.sound),

        vibration:
          saved.vibration === undefined
            ? true
            : Boolean(saved.vibration)
      };
    }
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
        COLORS.background,

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
    this.buildPopup();
    this.buildTime();
    this.buildSnooze();
    this.buildCancel();

    if (this.state.alarm.sound) {
      this.startAlarmSound();
    }

    if (this.state.alarm.vibration) {
      this.startAlarmVibration();
    }
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

  buildPopup() {
    card({
      x: 20,
      y: 25,
      w: 350,
      h: 400,
      color:
        COLORS.background,
      radius: 38
    });
  },

  buildTime() {
    text({
      x: 35,
      y: 70,
      w: 320,
      h: 28,
      value:
        "WAKE UP",
      color:
        COLORS.muted,
      size: 16
    });

    text({
      x: 35,
      y: 105,
      w: 320,
      h: 88,
      value:
        formatAlarmTime(
          this.state.alarm.hour,
          this.state.alarm.minute
        ),
      color:
        COLORS.mint,
      size: 58,
      font:
        "fonts/time.ttf"
    });
  },

  buildSnooze() {
    pillAligned({
      x: 35,
      y: 220,
      w: 320,
      h: 70,
      text:
        "SNOOZE 5 MIN",
      horizontal:
        "center",
      vertical:
        "center",
      textColor:
        0x10241D,
      textSize: 22,
      normalColor:
        COLORS.mint,
      pressColor:
        COLORS.mintPressed,
      radius: 38,

      onClick: () => {
        this.snooze();
      }
    });
  },

  buildCancel() {
    pillAligned({
      x: 35,
      y: 305,
      w: 320,
      h: 70,
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
        COLORS.background,
      pressColor:
        COLORS.mintPressed,
      radius: 38,

      onClick: () => {
        this.cancelAlarm();
      }
    });
  },

  startAlarmVibration() {
    this.stopAlarmVibration();

    const pulse = () => {
      if (
        !this.state.alarm.vibration
      ) {
        return;
      }

      try {
        vibrateStrong();
      } catch (error) {
        console.log(
          "Alarm vibration pulse failed: " +
          error
        );
      }

      this.state.vibrationTimer =
        setTimeout(
          () => {
            if (
              !this.state.alarm.vibration
            ) {
              return;
            }

            try {
              vibrateStrong();
            } catch (error) {
              console.log(
                "Alarm vibration pulse failed: " +
                error
              );
            }

            this.state.vibrationTimer =
              setTimeout(
                () => {
                  if (
                    !this.state.alarm.vibration
                  ) {
                    return;
                  }

                  try {
                    vibrateStrong();
                  } catch (error) {
                    console.log(
                      "Alarm vibration pulse failed: " +
                      error
                    );
                  }

                  this.state.vibrationTimer =
                    setTimeout(
                      () => {
                        if (
                          !this.state.alarm.vibration
                        ) {
                          return;
                        }

                        try {
                          vibrateStrong();
                        } catch (error) {
                          console.log(
                            "Alarm vibration pulse failed: " +
                            error
                          );
                        }

                        this.state.vibrationTimer =
                          setTimeout(
                            pulse,
                            1100
                          );
                      },
                      240
                    );
                },
                220
              );
          },
          170
        );
    };

    pulse();
  },

  stopAlarmVibration() {
    if (
      this.state.vibrationTimer
    ) {
      clearTimeout(
        this.state.vibrationTimer
      );

      this.state.vibrationTimer =
        null;
    }
  },

  startAlarmSound() {
    this.stopAlarmSound();

    if (!this.state.alarm.sound) {
      return;
    }

    const player =
      createAudioPlayer();

    this.state.player =
      player;

    setAudioSource(
      player,
      SOUND_FILE
    );

    player.addEventListener(
      player.event.COMPLETE,
      () => {
        if (
          this.state.player !==
          player
        ) {
          return;
        }

        this.state.audioRestartTimer =
          setTimeout(
            () => {
              if (
                this.state.player !==
                  player ||
                !this.state.alarm.sound
              ) {
                return;
              }

              prepareAudio(
                player,
                (ready) => {
                  if (
                    ready &&
                    this.state.player ===
                      player &&
                    this.state.alarm.sound
                  ) {
                    setAudioVolume(
                      player,
                      100
                    );

                    player.start();
                  }
                }
              );
            },
            260
          );
      }
    );

    prepareAudio(
      player,
      (ready) => {
        if (
          !ready ||
          this.state.player !==
            player ||
          !this.state.alarm.sound
        ) {
          return;
        }

        setAudioVolume(
          player,
          100
        );

        player.start();
      }
    );
  },

  stopAlarmSound() {
    if (
      this.state.audioRestartTimer
    ) {
      clearTimeout(
        this.state.audioRestartTimer
      );

      this.state.audioRestartTimer =
        null;
    }

    const player =
      this.state.player;

    this.state.player =
      null;

    if (player) {
      stopAudio(
        player
      );
    }
  },

  snooze() {
    this.stopAlarmSound();
    this.stopAlarmVibration();

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

        store: true
      });

    if (
      snoozeId
    ) {
      exitApp();
    }
  },

  cancelAlarm() {
    this.stopAlarmSound();
    this.stopAlarmVibration();
    exitApp();
  },

  onDestroy() {
    this.stopAlarmSound();
    this.stopAlarmVibration();
  }
});

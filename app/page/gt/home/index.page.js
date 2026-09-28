import {
  setupPage,
  configureTheme,
  getTheme,
  text,
  pillAligned,
  card,
  outlineCard,
  divider,
  switchControl,
  timePicker,
  loadObject,
  saveObject,
  formatTime,
  createSystemSounds,
  getSystemSoundTypes,
  playSystemSound,
  areSystemSoundsEnabled
} from "zeppcore";

import {
  set,
  cancel,
  REPEAT_DAY
} from "@zos/alarm";

const STORAGE_KEY = "zepp_alarm";

const DEFAULT_ALARM = {
  hour: 7,
  minute: 0,
  enabled: false,
  alarmId: 0
};

const COLORS = {
  background: 0x06090E,
  surface: 0x111826,
  surface2: 0x182333,
  border: 0x29374A,

  text: 0xF7F8FB,
  muted: 0x94A2B5,

  sky: 0xA9DFFF,
  skyPressed: 0x80C7EC,

  mint: 0xA8E6C1,
  mintPressed: 0x83D3A7,

  lavender: 0xD8C9FF,
  peach: 0xFFD1A6
};

configureTheme({
  background: COLORS.background,
  surface: COLORS.surface,
  surface2: COLORS.surface2,
  accent: COLORS.sky,
  accentPressed: COLORS.skyPressed,
  text: COLORS.text,
  textMuted: COLORS.muted,
  success: COLORS.mint,
  border: COLORS.border,
  radius: 26
});

const theme = getTheme();

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, Number(value))
  );
}

function normalizeAlarm(value) {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_ALARM
    };
  }

  return {
    hour: clamp(
      value.hour ?? DEFAULT_ALARM.hour,
      0,
      23
    ),

    minute: clamp(
      value.minute ?? DEFAULT_ALARM.minute,
      0,
      59
    ),

    enabled: Boolean(
      value.enabled
    ),

    alarmId: Number(
      value.alarmId ?? 0
    )
  };
}

function makeTime(hour, minute) {
  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date;
}

function getNextAlarmTime(hour, minute) {
  const now = new Date();

  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  if (
    next.getTime() <=
    now.getTime()
  ) {
    next.setDate(
      next.getDate() + 1
    );
  }

  return next;
}

function formatAlarmTime(hour, minute) {
  return formatTime(
    makeTime(hour, minute),
    {
      hour12: false
    }
  );
}

function formatNextAlarm(hour, minute) {
  const now = new Date();
  const next = getNextAlarmTime(
    hour,
    minute
  );

  const today =
    next.getFullYear() ===
      now.getFullYear() &&
    next.getMonth() ===
      now.getMonth() &&
    next.getDate() ===
      now.getDate();

  return (
    today
      ? "TODAY"
      : "TOMORROW"
  ) +
  " • " +
  formatAlarmTime(
    hour,
    minute
  );
}

function cancelAlarm(settings) {
  if (
    Number(settings.alarmId) > 0
  ) {
    try {
      cancel(
        Number(settings.alarmId)
      );
    } catch (error) {
      console.log(
        "Alarm cancel failed: " +
        error
      );
    }
  }

  settings.alarmId = 0;
}

function scheduleAlarm(settings) {
  cancelAlarm(settings);

  if (!settings.enabled) {
    saveObject(
      STORAGE_KEY,
      settings
    );

    return true;
  }

  const next =
    getNextAlarmTime(
      settings.hour,
      settings.minute
    );

  const alarmId = set({
    url: "app-service/alarm",
    time: Math.floor(
      next.getTime() / 1000
    ),
    repeat_type: REPEAT_DAY,
    store: true,
    param: JSON.stringify({
      hour: settings.hour,
      minute: settings.minute
    })
  });

  if (!alarmId) {
    settings.enabled = false;

    saveObject(
      STORAGE_KEY,
      settings
    );

    return false;
  }

  settings.alarmId =
    alarmId;

  saveObject(
    STORAGE_KEY,
    settings
  );

  return true;
}

function testAlarmSound() {
  const sounds =
    createSystemSounds();

  if (!areSystemSoundsEnabled(sounds)) {
    return false;
  }

  const types =
    getSystemSoundTypes(
      sounds
    );

  if (
    !types ||
    types.ALARM === undefined
  ) {
    return false;
  }

  playSystemSound(
    types.ALARM,
    2,
    sounds
  );

  return true;
}

Page({
  state: {
    alarm: {
      ...DEFAULT_ALARM
    },
    widgets: {}
  },

  onInit() {
    this.state.alarm =
      normalizeAlarm(
        loadObject(
          STORAGE_KEY,
          DEFAULT_ALARM
        )
      );
  },

  build() {
    setupPage({
      hideStatusBar: true
    });

    this.buildBackground();
    this.buildHeader();
    this.buildTimeCard();
    this.buildNextCard();
    this.buildControls();

    this.refresh();
  },

  buildBackground() {
    card({
      x: 0,
      y: 0,
      w: 390,
      h: 450,
      color: COLORS.background,
      radius: 0
    });
  },

  buildHeader() {
    text({
      x: 28,
      y: 18,
      w: 334,
      h: 34,
      value: "ZEPP ALARM",
      color: COLORS.text,
      size: 25,
      alignH: "left"
    });

    text({
      x: 28,
      y: 51,
      w: 334,
      h: 25,
      value: "Wake up on your time.",
      color: COLORS.muted,
      size: 16,
      alignH: "left"
    });
  },

  buildTimeCard() {
    this.state.widgets.time =
      pillAligned({
        x: 24,
        y: 88,
        w: 342,
        h: 142,
        text: "07:00",
        horizontal: "center",
        vertical: "center",
        textColor: COLORS.text,
        textSize: 70,
        normalColor: COLORS.surface,
        pressColor: COLORS.surface2,
        radius: 38,
        onClick: () => {
          this.openTimePicker();
        }
      });

    text({
      x: 24,
      y: 209,
      w: 342,
      h: 25,
      value: "TAP TO CHANGE",
      color: COLORS.muted,
      size: 13
    });
  },

  buildNextCard() {
    outlineCard({
      x: 24,
      y: 242,
      w: 342,
      h: 70,
      color: COLORS.border,
      radius: 24,
      lineWidth: 2
    });

    text({
      x: 41,
      y: 251,
      w: 120,
      h: 18,
      value: "NEXT ALARM",
      color: COLORS.muted,
      size: 12,
      alignH: "left"
    });

    this.state.widgets.next =
      pillAligned({
        x: 41,
        y: 268,
        w: 305,
        h: 31,
        text: "ALARM OFF",
        horizontal: "left",
        vertical: "center",
        paddingX: 8,
        textColor: COLORS.text,
        textSize: 17,
        normalColor: COLORS.surface2,
        pressColor: COLORS.surface2,
        radius: 15
      });
  },

  buildControls() {
    text({
      x: 28,
      y: 323,
      w: 120,
      h: 34,
      value: "Daily alarm",
      color: COLORS.text,
      size: 19,
      alignH: "left"
    });

    this.state.widgets.switch =
      switchControl({
        x: 237,
        y: 317,
        w: 129,
        h: 52,
        value: false,

        onColor:
          COLORS.mint,

        offColor:
          COLORS.surface2,

        pressedOnColor:
          COLORS.mintPressed,

        pressedOffColor:
          COLORS.border,

        onText: "ON",
        offText: "OFF",

        textColor:
          0x091015,

        textSize: 18,

        onChange: (
          enabled
        ) => {
          this.state.alarm.enabled =
            Boolean(enabled);

          const ok =
            scheduleAlarm(
              this.state.alarm
            );

          if (!ok) {
            this.state.alarm.enabled =
              false;

            this.state.widgets.switch.setValue(
              false
            );
          }

          this.refresh();
        }
      });

    divider({
      x: 28,
      y: 382,
      w: 334,
      h: 2,
      color: COLORS.border
    });

    this.state.widgets.test =
      pillAligned({
        x: 28,
        y: 395,
        w: 132,
        h: 30,
        text: "TEST SOUND",
        horizontal: "center",
        vertical: "center",
        textColor:
          COLORS.peach,
        textSize: 12,
        normalColor:
          COLORS.surface,
        pressColor:
          COLORS.surface2,
        radius: 15,
        onClick: () => {
          const played =
            testAlarmSound();

          if (
            this.state.widgets.soundStatus
          ) {
            this.state.widgets.soundStatus.setText(
              played
                ? "PLAYING"
                : "SOUND OFF"
            );
          }
        }
      });

    text({
      x: 173,
      y: 393,
      w: 95,
      h: 34,
      value: "Daily",
      color: COLORS.muted,
      size: 13,
      alignH: "right"
    });

    this.state.widgets.soundStatus =
      pillAligned({
        x: 272,
        y: 395,
        w: 94,
        h: 30,
        text: "READY",
        horizontal: "center",
        vertical: "center",
        textColor:
          COLORS.mint,
        textSize: 11,
        normalColor:
          COLORS.surface,
        pressColor:
          COLORS.surface2,
        radius: 15
      });
  },

  openTimePicker() {
    const alarm =
      this.state.alarm;

    timePicker({
      title: "Alarm time",

      hour:
        alarm.hour,

      minute:
        alarm.minute,

      onChange: ({
        eventType,
        hour,
        minute
      }) => {
        alarm.hour =
          clamp(
            hour,
            0,
            23
          );

        alarm.minute =
          clamp(
            minute,
            0,
            59
          );

        if (
          eventType === 2
        ) {
          if (
            alarm.enabled
          ) {
            scheduleAlarm(
              alarm
            );
          } else {
            saveObject(
              STORAGE_KEY,
              alarm
            );
          }

          this.refresh();
        }
      }
    });
  },

  refresh() {
    const alarm =
      this.state.alarm;

    if (
      this.state.widgets.soundStatus
    ) {
      this.state.widgets.soundStatus.setText(
        areSystemSoundsEnabled()
          ? "READY"
          : "SOUND OFF"
      );
    }

    if (
      this.state.widgets.time
    ) {
      this.state.widgets.time.setText(
        formatAlarmTime(
          alarm.hour,
          alarm.minute
        )
      );
    }

    if (
      this.state.widgets.next
    ) {
      this.state.widgets.next.setText(
        alarm.enabled
          ? formatNextAlarm(
              alarm.hour,
              alarm.minute
            )
          : "ALARM OFF"
      );
    }

    if (
      this.state.widgets.switch
    ) {
      this.state.widgets.switch.setValue(
        alarm.enabled
      );
    }
  }
});
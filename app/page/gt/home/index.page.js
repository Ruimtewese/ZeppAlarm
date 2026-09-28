import {
  setupPage,
  configureTheme,
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
      y: 20,
      w: 334,
      h: 34,
      value: "ALARM",
      color: COLORS.text,
      size: 27,
      alignH: "left"
    });
  },

  buildTimeCard() {
    this.state.widgets.time =
      pillAligned({
        x: 20,
        y: 68,
        w: 350,
        h: 158,
        text: "07:00",
        horizontal: "center",
        vertical: "center",
        textColor: COLORS.text,
        textSize: 76,
        normalColor: COLORS.surface,
        pressColor: COLORS.surface2,
        radius: 42,
        onClick: () => {
          this.openTimePicker();
        }
      });
  },

  buildNextCard() {
    this.state.widgets.next =
      pillAligned({
        x: 20,
        y: 245,
        w: 222,
        h: 54,
        text: "NEXT • 07:00",
        horizontal: "left",
        vertical: "center",
        paddingX: 18,
        textColor: COLORS.text,
        textSize: 18,
        normalColor: COLORS.surface2,
        pressColor: COLORS.surface2,
        radius: 27
      });

    this.state.widgets.switch =
      switchControl({
        x: 252,
        y: 245,
        w: 118,
        h: 54,
        value: false,
        onColor: COLORS.mint,
        offColor: COLORS.surface2,
        pressedOnColor: COLORS.mintPressed,
        pressedOffColor: COLORS.border,
        onText: "ON",
        offText: "OFF",
        textColor: 0x091015,
        textSize: 17,
        onChange: (enabled) => {
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
  },

  buildControls() {
    divider({
      x: 20,
      y: 320,
      w: 350,
      h: 2,
      color: COLORS.border
    });

    this.state.widgets.test =
      pillAligned({
        x: 20,
        y: 344,
        w: 350,
        h: 62,
        text: "TEST SOUND",
        horizontal: "center",
        vertical: "center",
        textColor: COLORS.peach,
        textSize: 17,
        normalColor: COLORS.surface,
        pressColor: COLORS.surface2,
        radius: 31,
        onClick: () => {
          testAlarmSound();
        }
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
        const nextHour =
          clamp(
            hour,
            0,
            23
          );

        const nextMinute =
          clamp(
            minute,
            0,
            59
          );

        /*
         * Update the large time display immediately while
         * the picker is being scrolled.
         */
        alarm.hour =
          nextHour;

        alarm.minute =
          nextMinute;

        this.refresh();

        /*
         * Persist and reschedule only when the general
         * picker confirms the selection.
         */
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
          : "OFF"
      );
    }

    if (
      this.state.widgets.switch
    ) {
      this.state.widgets.switch.setValue(
        alarm.enabled
      );
    }
  }});
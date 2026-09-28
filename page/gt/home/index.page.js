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
  playSystemSound,
  createSystemSounds,
  getSystemSoundTypes
} from "zeppcore";

import {
  set,
  cancel,
  REPEAT_DAY
} from "@zos/alarm";

const STORAGE_KEY = "zepp_alarm";

const DEFAULT_SETTINGS = {
  enabled: false,
  hour: 7,
  minute: 0,
  alarmId: 0
};

const COLORS = {
  background: 0x070A10,
  surface: 0x121925,
  surfaceSoft: 0x1A2433,
  text: 0xF6F7FA,
  muted: 0x96A3B8,
  accent: 0xA8DFFF,
  accentPressed: 0x7FC6EC,
  mint: 0xA7E8C1,
  mintPressed: 0x82D6A7,
  lavender: 0xD7C8FF,
  lavenderPressed: 0xBAA8F5,
  peach: 0xFFD2A3,
  peachPressed: 0xF2B87E,
  danger: 0xFFAAA8,
  border: 0x2A3647
};

configureTheme({
  background: COLORS.background,
  surface: COLORS.surface,
  surface2: COLORS.surfaceSoft,
  accent: COLORS.accent,
  accentPressed: COLORS.accentPressed,
  text: COLORS.text,
  textMuted: COLORS.muted,
  success: COLORS.mint,
  danger: COLORS.danger,
  border: COLORS.border,
  radius: 26
});

const theme = getTheme();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function normalizeSettings(value) {
  const settings =
    value && typeof value === "object"
      ? value
      : {};

  return {
    enabled: Boolean(settings.enabled),
    hour: clamp(
      settings.hour ?? DEFAULT_SETTINGS.hour,
      0,
      23
    ),
    minute: clamp(
      settings.minute ?? DEFAULT_SETTINGS.minute,
      0,
      59
    ),
    alarmId: Number(settings.alarmId ?? 0)
  };
}

function getNextOccurrence(hour, minute) {
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

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function getNextLabel(hour, minute) {
  const next = getNextOccurrence(hour, minute);
  const now = new Date();

  const sameDay =
    next.getFullYear() === now.getFullYear() &&
    next.getMonth() === now.getMonth() &&
    next.getDate() === now.getDate();

  return (
    (sameDay ? "Today" : "Tomorrow") +
    " • " +
    formatTime(next)
  );
}

function getTimeLabel(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return formatTime(date);
}

function cancelExistingAlarm(settings) {
  const alarmId = Number(settings.alarmId);

  if (alarmId > 0) {
    try {
      cancel(alarmId);
    } catch (error) {
      console.log("Could not cancel previous alarm: " + error);
    }
  }

  settings.alarmId = 0;
}

function saveAlarm(settings) {
  cancelExistingAlarm(settings);

  if (!settings.enabled) {
    saveObject(STORAGE_KEY, settings);
    return true;
  }

  const next = getNextOccurrence(
    settings.hour,
    settings.minute
  );

  const alarmId = set({
    url: "app-service/alarm",
    time: Math.floor(next.getTime() / 1000),
    repeat_type: REPEAT_DAY,
    store: true,
    param: JSON.stringify({
      hour: settings.hour,
      minute: settings.minute
    })
  });

  if (!alarmId) {
    settings.enabled = false;
    saveObject(STORAGE_KEY, settings);
    return false;
  }

  settings.alarmId = alarmId;

  saveObject(
    STORAGE_KEY,
    settings
  );

  return true;
}

function getDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS
  };
}

Page({
  state: {
    settings: getDefaultSettings(),
    widgets: {}
  },

  onInit() {
    this.state.settings =
      normalizeSettings(
        loadObject(
          STORAGE_KEY,
          getDefaultSettings()
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
    this.buildStatusCard();
    this.buildControls();
    this.buildFooter();
    this.refreshUI();
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
      y: 24,
      w: 334,
      h: 34,
      value: "Zepp Alarm",
      color: theme.text,
      size: 28,
      alignH: "left"
    });

    text({
      x: 28,
      y: 56,
      w: 334,
      h: 26,
      value: "One alarm. Ready when you are.",
      color: theme.textMuted,
      size: 17,
      alignH: "left"
    });
  },

  buildTimeCard() {
    this.state.widgets.timeCard =
      pillAligned({
        x: 25,
        y: 98,
        w: 340,
        h: 128,
        text: "07:00",
        horizontal: "center",
        vertical: "center",
        textColor: COLORS.text,
        textSize: 68,
        normalColor: COLORS.surface,
        pressColor: COLORS.surfaceSoft,
        radius: 36,
        onClick: () => {
          this.openTimePicker();
        }
      });

    text({
      x: 0,
      y: 205,
      w: 390,
      h: 25,
      value: "TAP TO CHANGE TIME",
      color: theme.textMuted,
      size: 14
    });
  },

  buildStatusCard() {
    outlineCard({
      x: 25,
      y: 248,
      w: 340,
      h: 72,
      color: COLORS.border,
      radius: 24,
      lineWidth: 2
    });

    text({
      x: 42,
      y: 258,
      w: 170,
      h: 22,
      value: "NEXT ALARM",
      color: theme.textMuted,
      size: 13,
      alignH: "left"
    });

    this.state.widgets.next =
      pillAligned({
        x: 38,
        y: 280,
        w: 190,
        h: 30,
        text: "Off",
        textColor: COLORS.text,
        textSize: 15,
        normalColor: COLORS.surfaceSoft,
        pressColor: COLORS.surfaceSoft,
        radius: 15
      });

    this.state.widgets.status =
      pillAligned({
        x: 244,
        y: 264,
        w: 98,
        h: 40,
        text: "OFF",
        textColor: COLORS.muted,
        textSize: 16,
        normalColor: COLORS.surfaceSoft,
        pressColor: COLORS.surfaceSoft,
        radius: 20
      });
  },

  buildControls() {
    text({
      x: 28,
      y: 337,
      w: 110,
      h: 38,
      value: "Alarm",
      color: theme.text,
      size: 20,
      alignH: "left"
    });

    this.state.widgets.switch =
      switchControl({
        x: 238,
        y: 330,
        w: 127,
        h: 52,
        value: false,
        onColor: COLORS.mint,
        offColor: COLORS.surfaceSoft,
        pressedOnColor: COLORS.mintPressed,
        pressedOffColor: COLORS.border,
        onText: "ON",
        offText: "OFF",
        textColor: 0x0B1118,
        textSize: 18,
        onChange: (enabled) => {
          this.state.settings.enabled =
            Boolean(enabled);

          const ok =
            saveAlarm(
              this.state.settings
            );

          if (!ok) {
            this.state.settings.enabled =
              false;

            this.state.widgets.switch.setValue(
              false
            );
          }

          this.refreshUI();
        }
      });

    divider({
      x: 28,
      y: 397,
      w: 334,
      h: 2,
      color: COLORS.border
    });

    this.state.widgets.test =
      pillAligned({
        x: 28,
        y: 407,
        w: 130,
        h: 32,
        text: "TEST SOUND",
        textColor: COLORS.peach,
        textSize: 12,
        normalColor: COLORS.surface,
        pressColor: COLORS.surfaceSoft,
        radius: 16,
        onClick: () => {
          this.testSound();
        }
      });

    text({
      x: 166,
      y: 405,
      w: 196,
      h: 36,
      value: "Daily • persistent",
      color: theme.textMuted,
      size: 14,
      alignH: "right"
    });
  },

  buildFooter() {},

  openTimePicker() {
    const settings =
      this.state.settings;

    timePicker({
      title: "Alarm time",
      hour: settings.hour,
      minute: settings.minute,
      onChange: ({
        eventType,
        hour,
        minute
      }) => {
        settings.hour =
          clamp(hour, 0, 23);

        settings.minute =
          clamp(minute, 0, 59);

        if (eventType === 2) {
          if (settings.enabled) {
            saveAlarm(settings);
          } else {
            saveObject(
              STORAGE_KEY,
              settings
            );
          }

          this.refreshUI();
        }
      }
    });
  },

  testSound() {
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
        2,
        sounds
      );
    }
  },

  refreshUI() {
    const settings =
      this.state.settings;

    if (
      this.state.widgets.timeCard
    ) {
      this.state.widgets.timeCard.setText(
        getTimeLabel(
          settings.hour,
          settings.minute
        )
      );
    }

    if (
      this.state.widgets.next
    ) {
      this.state.widgets.next.setText(
        settings.enabled
          ? getNextLabel(
              settings.hour,
              settings.minute
            )
          : "Alarm is off"
      );
    }

    if (
      this.state.widgets.status
    ) {
      this.state.widgets.status.setText(
        settings.enabled
          ? "ON"
          : "OFF"
      );
    }

    if (
      this.state.widgets.switch
    ) {
      this.state.widgets.switch.setValue(
        settings.enabled
      );
    }
  }
});
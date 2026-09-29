import {
  setupPage,
  configureTheme,
  text,
  pillAligned,
  card,
  circle,
  timePicker,
  loadObject,
  saveObject,
  animate,
  animateGroup,
  popIn,
  fadeIn
} from "zeppcore";

import {
  prop,
  event
} from "zeppcore";

import {
  COLORS
} from "../../../utils/theme.js";

import {
  set,
  cancel,
  REPEAT_WEEK,
  WEEK_MON,
  WEEK_TUE,
  WEEK_WED,
  WEEK_THU,
  WEEK_FRI,
  WEEK_SAT,
  WEEK_SUN
} from "@zos/alarm";

const STORAGE_KEY = "zepp_alarm";

const DAYS = [
  {
    key: "MON",
    label: "M",
    mask: WEEK_MON
  },
  {
    key: "TUE",
    label: "T",
    mask: WEEK_TUE
  },
  {
    key: "WED",
    label: "W",
    mask: WEEK_WED
  },
  {
    key: "THU",
    label: "T",
    mask: WEEK_THU
  },
  {
    key: "FRI",
    label: "F",
    mask: WEEK_FRI
  },
  {
    key: "SAT",
    label: "S",
    mask: WEEK_SAT
  },
  {
    key: "SUN",
    label: "S",
    mask: WEEK_SUN
  }
];

const DEFAULT_ALARM = {
  hour: 7,
  minute: 0,
  enabled: false,
  alarmId: 0,

  days: [
    true,
    true,
    true,
    true,
    true,
    true,
    true
  ]
};


configureTheme({
  background:
    0x000000,

  surface:
    COLORS.surface,

  surface2:
    COLORS.surface2,

  accent:
    COLORS.blue,

  accentPressed:
    COLORS.bluePressed,

  text:
    COLORS.text,

  textMuted:
    COLORS.muted,

  success:
    COLORS.blue,

  border:
    COLORS.border,

  radius: 26
});

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

function normalizeAlarm(
  value
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {
      ...DEFAULT_ALARM,
      days: [
        ...DEFAULT_ALARM.days
      ]
    };
  }

  const days =
    Array.isArray(
      value.days
    ) &&
    value.days.length === 7
      ? value.days.map(
          Boolean
        )
      : [
          ...DEFAULT_ALARM.days
        ];

  return {
    hour:
      clamp(
        value.hour ??
          DEFAULT_ALARM.hour,
        0,
        23
      ),

    minute:
      clamp(
        value.minute ??
          DEFAULT_ALARM.minute,
        0,
        59
      ),

    enabled:
      Boolean(
        value.enabled
      ),

    alarmId:
      Number(
        value.alarmId ??
          0
      ),

    days
  };
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

function getWeekMask(
  days
) {
  let mask = 0;

  DAYS.forEach(
    (day, index) => {
      if (
        days[index]
      ) {
        mask |=
          day.mask;
      }
    }
  );

  return mask;
}

function hasSelectedDay(
  days
) {
  return days.some(
    Boolean
  );
}

function getSelectedDayCount(
  days
) {
  return days.filter(
    Boolean
  ).length;
}

function getRepeatSummary(days) {
  const count = getSelectedDayCount(days);

  if (count === 7) {
    return "Every day";
  }

  const weekdays = [
    true,
    true,
    true,
    true,
    true,
    false,
    false
  ];

  const weekends = [
    false,
    false,
    false,
    false,
    false,
    true,
    true
  ];

  if (days.every((value, index) => value === weekdays[index])) {
    return "Weekdays";
  }

  if (days.every((value, index) => value === weekends[index])) {
    return "Weekends";
  }

  if (count === 1) {
    const index = days.findIndex(Boolean);
    return DAYS[index].key.charAt(0) + DAYS[index].key.slice(1).toLowerCase();
  }

  return count + " days/week";
}

function getNextOccurrenceLabel(date) {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const occurrenceStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );

  const dayOffset = Math.round(
    (occurrenceStart.getTime() - todayStart.getTime()) /
    (24 * 60 * 60 * 1000)
  );

  if (dayOffset === 0) {
    return "Today";
  }

  if (dayOffset === 1) {
    return "Tomorrow";
  }

  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  return names[date.getDay()];
}

function getNextAlarmTime(
  hour,
  minute,
  days
) {
  const now =
    new Date();

  for (
    let offset = 0;
    offset < 8;
    offset++
  ) {
    const candidate =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() +
          offset,
        hour,
        minute,
        0,
        0
      );

    const index =
      (
        candidate.getDay() +
        6
      ) % 7;

    if (
      days[index] &&
      candidate.getTime() >
        now.getTime()
    ) {
      return candidate;
    }
  }

  return new Date(
    now.getTime() +
      7 *
      24 *
      60 *
      60 *
      1000
  );
}

function cancelAlarm(
  settings
) {
  if (
    Number(
      settings.alarmId
    ) > 0
  ) {
    try {
      cancel(
        Number(
          settings.alarmId
        )
      );
    } catch (
      error
    ) {
      console.log(
        "Alarm cancel failed: " +
        error
      );
    }
  }

  settings.alarmId =
    0;
}

function scheduleAlarm(
  settings
) {
  cancelAlarm(
    settings
  );

  if (
    !settings.enabled
  ) {
    saveObject(
      STORAGE_KEY,
      settings
    );

    return true;
  }

  if (
    !hasSelectedDay(
      settings.days
    )
  ) {
    settings.enabled =
      false;

    saveObject(
      STORAGE_KEY,
      settings
    );

    return false;
  }

  const next =
    getNextAlarmTime(
      settings.hour,
      settings.minute,
      settings.days
    );

  const alarmId =
    set({
      url:
        "page/gt/alarm/index.page",

      time:
        Math.floor(
          next.getTime() /
            1000
        ),

      repeat_type:
        REPEAT_WEEK,

      week_days:
        getWeekMask(
          settings.days
        ),

      store: true,

      param:
        JSON.stringify({
          hour:
            settings.hour,

          minute:
            settings.minute
        })
    });

  if (
    !alarmId
  ) {
    settings.enabled =
      false;

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

Page({
  state: {
    alarm: {
      ...DEFAULT_ALARM,

      days: [
        ...DEFAULT_ALARM.days
      ]
    },

    lastSwitchTap: 0,
    statusTimer: null,

    widgets: {
      days: [],
      timeCard: null,
      timeDot: null,
      timeLabel: null,
      timeText: null,
      timeHint: null,
      timeMeta: null,
      repeatLabel: null,
      repeatSummary: null,
      alarmSwitchTrack: null,
      alarmSwitchKnob: null,
      statusText: null
    },
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
      hideStatusBar:
        true
    });

    this.buildBackground();
    this.buildTime();
    this.buildDays();
    this.buildControls();

    this.state.widgets.statusText =
      text({
        x: 20,
        y: 388,
        w: 350,
        h: 20,
        value: "",
        color: COLORS.muted,
        size: 12,
        alignH: 1,
        alignV: 2,
        alpha: 0
      });

    this.refresh();
    this.animateOpen();
  },

  buildBackground() {
    card({
      x: 0,
      y: 0,
      w: 390,
      h: 450,
      color:
        0x000000,
      radius: 0
    });
  },

  buildTime() {
    this.state.widgets.timeCard =
      card({
        x: 16,
        y: 16,
        w: 358,
        h: 174,
        color: COLORS.surface,
        radius: 34
      });

    this.state.widgets.timeDot =
      circle({
        centerX: 48,
        centerY: 49,
        radius: 6,
        color: 0x6D7885,
        alpha: 255
      });

    this.state.widgets.timeLabel =
      text({
        x: 66,
        y: 35,
        w: 285,
        h: 24,
        value: "ALARM OFF",
        color: 0x43505E,
        size: 14
      });

    this.state.widgets.timeText =
      text({
        x: 28,
        y: 62,
        w: 334,
        h: 76,
        value: "7:00 AM",
        color: 0x111820,
        size: 64
      });

    this.state.widgets.timeMeta =
      text({
        x: 28,
        y: 126,
        w: 334,
        h: 22,
        value: "TURN ON TO SCHEDULE",
        color: 0x43505E,
        size: 13,
        alignH: 0,
        alignV: 2
      });

    this.state.widgets.timeHint =
      text({
        x: 250,
        y: 145,
        w: 112,
        h: 20,
        value: "TAP TO EDIT",
        color: 0x43505E,
        size: 12,
        alignH: 2,
        alignV: 2
      });

    this.state.widgets.timeText.addEventListener(
      event.CLICK_UP,
      () => {
        this.openTimePicker();
      }
    );

    this.state.widgets.timeMeta.addEventListener(
      event.CLICK_UP,
      () => {
        this.openTimePicker();
      }
    );

    this.state.widgets.timeHint.addEventListener(
      event.CLICK_UP,
      () => {
        this.openTimePicker();
      }
    );
  },

  buildDays() {
    this.state.widgets.repeatLabel =
      text({
        x: 20,
        y: 208,
        w: 90,
        h: 22,
        value: "REPEAT",
        color: COLORS.muted,
        size: 14,
        alignH: 0,
        alignV: 2
      });

    this.state.widgets.repeatSummary =
      text({
        x: 105,
        y: 208,
        w: 265,
        h: 22,
        value: "Every day",
        color: COLORS.muted,
        size: 14,
        alignH: 2,
        alignV: 2
      });

    const size = 44;
    const gap = 6;
    const startX = 20;
    const y = 236;

    this.state.widgets.days = [];

    DAYS.forEach(
      (day, index) => {
        this.state.widgets.days[index] =
          pillAligned({
            x:
              startX +
              index * (size + gap),
            y,
            w: size,
            h: size,
            text: day.label,
            horizontal: "center",
            vertical: "center",
            textColor: COLORS.muted,
            textSize: 17,
            normalColor: COLORS.surface2,
            pressColor: COLORS.border,
            radius: 22,
            onClick: () => {
              const alarm = this.state.alarm;

              if (
                alarm.days[index] &&
                getSelectedDayCount(alarm.days) === 1
              ) {
                return;
              }

              alarm.days[index] = !alarm.days[index];

              this.persistAlarm();
              this.refreshDays();
              this.refreshMeta();

              if (alarm.enabled) {
                scheduleAlarm(alarm);
                this.showStatus("SCHEDULE UPDATED");
              } else {
                this.showStatus("REPEAT UPDATED");
              }
            }
          });
      }
    );
  },

  buildControls() {
    const switchY = 304;
    const trackX = 20;
    const trackW = 350;
    const trackH = 72;
    const knobSize = 48;
    const knobY = switchY + 12;
    const offX = trackX + 12;
    const onX = trackX + trackW - knobSize - 12;

    this.state.widgets.alarmSwitchTrack =
      card({
        x: trackX,
        y: switchY,
        w: trackW,
        h: trackH,
        color: COLORS.surface2,
        radius: 36
      });

    this.state.widgets.alarmSwitchKnob =
      card({
        x: offX,
        y: knobY,
        w: knobSize,
        h: knobSize,
        color: 0x6D7885,
        radius: 24
      });

    const toggle = () => {
      const now = Date.now();

      if (
        this.state.lastSwitchTap &&
        now - this.state.lastSwitchTap < 180
      ) {
        return;
      }

      this.state.lastSwitchTap = now;
      this.toggleAlarm();
    };

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_DOWN,
      () => this.animateSwitchPress(true)
    );

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_UP,
      () => {
        this.animateSwitchPress(false);
        toggle();
      }
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_DOWN,
      () => this.animateSwitchPress(true)
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_UP,
      () => {
        this.animateSwitchPress(false);
        toggle();
      }
    );
  },

  animateSwitchPress(pressed) {
    const track = this.state.widgets.alarmSwitchTrack;
    const knob = this.state.widgets.alarmSwitchKnob;

    if (!track || !knob) {
      return;
    }

    animate(
      track,
      pressed
        ? {
            x: [20, 26],
            y: [304, 308],
            w: [350, 338],
            h: [72, 64],
            duration: 110,
            easing: "easeout"
          }
        : {
            x: [26, 20],
            y: [308, 304],
            w: [338, 350],
            h: [64, 72],
            duration: 180,
            easing: "easeout"
          }
    );

    animate(
      knob,
      pressed
        ? {
            y: [316, 320],
            w: [48, 44],
            h: [48, 44],
            duration: 110,
            easing: "easeout"
          }
        : {
            y: [320, 316],
            w: [44, 48],
            h: [44, 48],
            duration: 180,
            easing: "easeout"
          }
    );
  },

  toggleAlarm() {
    const alarm = this.state.alarm;
    const nextEnabled = !alarm.enabled;

    alarm.enabled = nextEnabled;

    const ok = scheduleAlarm(alarm);

    if (!ok) {
      alarm.enabled = false;
      this.refresh();
      this.showStatus("COULD NOT SCHEDULE");
      return;
    }

    this.refresh();
    this.animateAlarmState();
    this.showStatus(
      alarm.enabled
        ? "ALARM SCHEDULED"
        : "ALARM OFF"
    );
  },

  animateAlarmState() {
    const track = this.state.widgets.alarmSwitchTrack;
    const knob = this.state.widgets.alarmSwitchKnob;

    if (!track || !knob) {
      return;
    }

    const enabled = this.state.alarm.enabled;
    const onX = 320;
    const offX = 32;

    track.setProperty(
      prop.MORE,
      {
        color: enabled
          ? COLORS.blue
          : COLORS.surface2,
        x: 20,
        y: 304,
        w: 350,
        h: 72,
        radius: 36
      }
    );

    knob.setProperty(
      prop.MORE,
      {
        x: enabled ? onX : offX,
        y: 316,
        w: 48,
        h: 48,
        color: enabled
          ? 0x081018
          : 0x6D7885,
        radius: 24
      }
    );

    animate(
      knob,
      {
        x: [enabled ? offX : onX, enabled ? onX : offX],
        duration: 360,
        easing: "easeout"
      }
    );
  },

  animateOpenSwitch() {
    this.animateAlarmState();
  },

  showStatus(message) {
    const status = this.state.widgets.statusText;

    if (!status) {
      return;
    }

    status.setProperty(
      prop.MORE,
      {
        text: message,
        alpha: 255
      }
    );

    if (this.state.statusTimer) {
      clearTimeout(this.state.statusTimer);
    }

    this.state.statusTimer = setTimeout(() => {
      fadeIn(
        status,
        {
          duration: 240
        }
      );
      animate(
        status,
        {
          alpha: [255, 0],
          duration: 240,
          easing: "linear"
        }
      );
    }, 900);
  },

  animateOpen() {
    const cardWidget = this.state.widgets.timeCard;

    if (cardWidget) {
      cardWidget.setProperty(
        prop.MORE,
        {
          x: 26,
          y: 22,
          w: 338,
          h: 164,
          alpha: 0
        }
      );

      popIn(
        cardWidget,
        16,
        16,
        358,
        174,
        {
          scale: 0.91,
          duration: 520,
          easing: "easeout"
        }
      );
    }

    const dot = this.state.widgets.timeDot;

    if (dot) {
      dot.setProperty(
        prop.MORE,
        {
          center_x: 48,
          center_y: 49,
          radius: 6,
          alpha: 0
        }
      );

      fadeIn(
        dot,
        {
          duration: 260,
          offset: 180
        }
      );
    }

    const label = this.state.widgets.timeLabel;

    if (label) {
      label.setProperty(
        prop.MORE,
        {
          x: 78,
          y: 35,
          w: 273,
          h: 24,
          alpha: 0
        }
      );

      animate(
        label,
        {
          x: [78, 66],
          alpha: [0, 255],
          duration: 300,
          easing: "easeout",
          offset: 220
        }
      );
    }

    const timeText = this.state.widgets.timeText;

    if (timeText) {
      timeText.setProperty(
        prop.MORE,
        {
          x: 28,
          y: 82,
          w: 334,
          h: 76,
          alpha: 0
        }
      );

      animate(
        timeText,
        {
          y: [82, 62],
          alpha: [0, 255],
          duration: 520,
          easing: "easeout",
          offset: 340
        }
      );
    }

    const meta = this.state.widgets.timeMeta;

    if (meta) {
      meta.setProperty(
        prop.MORE,
        {
          y: 137,
          alpha: 0
        }
      );

      animate(
        meta,
        {
          y: [137, 126],
          alpha: [0, 255],
          duration: 300,
          easing: "easeout",
          offset: 540
        }
      );
    }

    const hint = this.state.widgets.timeHint;

    if (hint) {
      hint.setProperty(
        prop.MORE,
        {
          y: 154,
          alpha: 0
        }
      );

      animate(
        hint,
        {
          y: [154, 145],
          alpha: [0, 255],
          duration: 260,
          easing: "easeout",
          offset: 680
        }
      );
    }

    this.state.widgets.days.forEach(
      (dayWidget, index) => {
        animateGroup(
          [dayWidget.button, dayWidget.text],
          {
            y: [276, 236],
            alpha: [0, 255],
            duration: 380,
            easing: "easeout",
            offset: 600 + index * 120
          }
        );
      }
    );
  },

  openTimePicker() {
    const alarm =
      this.state.alarm;

    timePicker({
      title:
        "Alarm time",

      hour:
        alarm.hour,

      minute:
        alarm.minute,

      onChange:
        ({
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

          this.refresh();

          if (
            eventType === 2
          ) {
            this.persistAlarm();

            if (
              alarm.enabled
            ) {
              scheduleAlarm(
                alarm
              );
            }
          }
        }
    });
  },

  persistAlarm() {
    saveObject(
      STORAGE_KEY,
      this.state.alarm
    );
  },

  refreshMeta() {
    const alarm = this.state.alarm;
    const next = getNextAlarmTime(
      alarm.hour,
      alarm.minute,
      alarm.days
    );

    if (this.state.widgets.repeatSummary) {
      this.state.widgets.repeatSummary.setProperty(
        prop.MORE,
        {
          text: getRepeatSummary(alarm.days)
        }
      );
    }

    if (this.state.widgets.timeLabel) {
      this.state.widgets.timeLabel.setProperty(
        prop.MORE,
        {
          text: alarm.enabled
            ? "NEXT ALARM"
            : "ALARM OFF"
        }
      );
    }

    if (this.state.widgets.timeMeta) {
      this.state.widgets.timeMeta.setProperty(
        prop.MORE,
        {
          text: alarm.enabled
            ? getNextOccurrenceLabel(next)
            : "TURN ON TO SCHEDULE"
        }
      );
    }
  },

  refreshDays() {
    if (
      !this.state.widgets.days
    ) {
      return;
    }

    this.state.widgets.days.forEach(
      (
        dayWidget,
        index
      ) => {
        const selected =
          Boolean(
            this.state.alarm
              .days[index]
          );

        dayWidget.button.setProperty(
          prop.MORE,
          {
            color:
              selected
                ? COLORS.blue
                : COLORS.surface2
          }
        );

        dayWidget.text.setProperty(
          prop.MORE,
          {
            color:
              selected
                ? 0x081018
                : COLORS.muted
          }
        );
      }
    );
  },

  refresh() {
    const alarm =
      this.state.alarm;

    if (
      this.state.widgets.timeText
    ) {
      this.state.widgets.timeText.setProperty(
        prop.MORE,
        {
          text:
            formatAlarmTime(
              alarm.hour,
              alarm.minute
            )
        }
      );
    }

    this.refreshMeta();
    this.refreshDays();
    this.animateAlarmState();

    if (this.state.widgets.timeCard) {
      this.state.widgets.timeCard.setProperty(
        prop.MORE,
        {
          color: alarm.enabled
            ? COLORS.blue
            : COLORS.surface
        }
      );
    }

    if (this.state.widgets.timeDot) {
      this.state.widgets.timeDot.setProperty(
        prop.MORE,
        {
          color: alarm.enabled
            ? 0x081018
            : 0x6D7885
        }
      );
    }
  }

});

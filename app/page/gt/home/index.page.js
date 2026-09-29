import {
  setupPage,
  configureTheme,
  text,
  pillAligned,
  horizontalAlign,
  verticalAlign,
  card,
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
  sound: true,
  vibration: true,

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

    sound:
      value.sound === undefined
        ? true
        : Boolean(value.sound),

    vibration:
      value.vibration === undefined
        ? true
        : Boolean(value.vibration),

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
      timeLabel: null,
      timeText: null,
      timeHint: null,
      timeMeta: null,
      repeatLabel: null,
      repeatSummary: null,
      alarmSwitchTrack: null,
      alarmSwitchKnob: null,
      soundSwitchTrack: null,
      soundSwitchKnob: null,
      vibrationSwitchTrack: null,
      vibrationSwitchKnob: null,
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

  onDestroy() {
    if (this.state.statusTimer) {
      clearTimeout(this.state.statusTimer);
      this.state.statusTimer = null;
    }
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
        alignH: horizontalAlign("center"),
        alignV: verticalAlign("bottom"),
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
        h: 158,
        color: COLORS.surface,
        radius: 32
      });

    this.state.widgets.timeLabel =
      text({
        x: 28,
        y: 32,
        w: 334,
        h: 22,
        value: "ALARM OFF",
        color: COLORS.muted,
        size: 14,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.timeText =
      text({
        x: 28,
        y: 54,
        w: 334,
        h: 70,
        value: "7:00 AM",
        color: COLORS.blue,
        size: 64,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.timeMeta =
      text({
        x: 28,
        y: 119,
        w: 210,
        h: 21,
        value: "TURN ON TO SCHEDULE",
        color: COLORS.muted,
        size: 12,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.timeHint =
      text({
        x: 250,
        y: 137,
        w: 112,
        h: 18,
        value: "TAP TO EDIT",
        color: COLORS.muted,
        size: 12,
        alignH: horizontalAlign("right"),
        alignV: verticalAlign("center")
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
        y: 190,
        w: 90,
        h: 22,
        value: "REPEAT",
        color: COLORS.muted,
        size: 14,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.repeatSummary =
      text({
        x: 105,
        y: 190,
        w: 265,
        h: 22,
        value: "Every day",
        color: COLORS.muted,
        size: 14,
        alignH: horizontalAlign("right"),
        alignV: verticalAlign("center")
      });

    const size = 40;
    const gap = 7;
    const startX = 20;
    const y = 218;

    this.state.widgets.days = [];

    DAYS.forEach(
      (day, index) => {
        this.state.widgets.days[index] =
          pillAligned({
            x: startX + index * (size + gap),
            y,
            w: size,
            h: size,
            text: day.label,
            horizontal: "center",
            vertical: "center",
            textColor: COLORS.muted,
            textSize: 16,
            normalColor: COLORS.surface2,
            pressColor: COLORS.border,
            radius: 20,
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
    this.buildMainSwitch();
    this.buildOptionSwitch(
      "sound",
      "SOUND",
      332
    );
    this.buildOptionSwitch(
      "vibration",
      "VIBRATION",
      382
    );
  },

  buildMainSwitch() {
    const x = 20;
    const y = 270;
    const w = 350;
    const h = 56;
    const knob = 38;
    const knobY = y + 9;
    const offX = x + 9;
    const onX = x + w - knob - 9;

    this.state.widgets.alarmSwitchTrack =
      card({
        x,
        y,
        w,
        h,
        color: COLORS.surface2,
        radius: 28
      });

    this.state.widgets.alarmSwitchKnob =
      card({
        x: offX,
        y: knobY,
        w: knob,
        h: knob,
        color: 0x6D7885,
        radius: 19
      });

    const toggle = () => {
      this.toggleAlarm();
    };

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_DOWN,
      () => this.animateSmallSwitchPress(
        this.state.widgets.alarmSwitchTrack,
        this.state.widgets.alarmSwitchKnob,
        x,
        y,
        w,
        h,
        knob,
        knobY,
        offX,
        onX,
        true
      )
    );

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_UP,
      () => {
        this.animateSmallSwitchPress(
          this.state.widgets.alarmSwitchTrack,
          this.state.widgets.alarmSwitchKnob,
          x,
          y,
          w,
          h,
          knob,
          knobY,
          offX,
          onX,
          false
        );
        toggle();
      }
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_DOWN,
      () => this.animateSmallSwitchPress(
        this.state.widgets.alarmSwitchTrack,
        this.state.widgets.alarmSwitchKnob,
        x,
        y,
        w,
        h,
        knob,
        knobY,
        offX,
        onX,
        true
      )
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_UP,
      () => {
        this.animateSmallSwitchPress(
          this.state.widgets.alarmSwitchTrack,
          this.state.widgets.alarmSwitchKnob,
          x,
          y,
          w,
          h,
          knob,
          knobY,
          offX,
          onX,
          false
        );
        toggle();
      }
    );
  },

  buildOptionSwitch(type, label, y) {
    const alarmKey = type === "sound"
      ? "sound"
      : "vibration";

    const trackX = 240;
    const trackW = 130;
    const trackH = 40;
    const knobSize = 28;
    const trackY = y;
    const knobY = y + 6;
    const offX = trackX + 6;
    const onX = trackX + trackW - knobSize - 6;

    text({
      x: 20,
      y: y + 2,
      w: 190,
      h: 36,
      value: label,
      color: COLORS.muted,
      size: 14,
      alignH: horizontalAlign("left"),
      alignV: verticalAlign("center")
    });

    const track = card({
      x: trackX,
      y: trackY,
      w: trackW,
      h: trackH,
      color: COLORS.surface2,
      radius: 20
    });

    const knob = card({
      x: offX,
      y: knobY,
      w: knobSize,
      h: knobSize,
      color: 0x6D7885,
      radius: 14
    });

    this.state.widgets[alarmKey + "SwitchTrack"] = track;
    this.state.widgets[alarmKey + "SwitchKnob"] = knob;

    const toggle = () => {
      this.state.alarm[alarmKey] = !this.state.alarm[alarmKey];
      this.persistAlarm();
      this.refreshOptionSwitch(alarmKey);
      this.showStatus(
        label + (this.state.alarm[alarmKey] ? " ON" : " OFF")
      );
    };

    const press = (pressed) => {
      this.animateSmallSwitchPress(
        track,
        knob,
        trackX,
        trackY,
        trackW,
        trackH,
        knobSize,
        knobY,
        offX,
        onX,
        pressed
      );
    };

    track.addEventListener(event.CLICK_DOWN, () => press(true));
    track.addEventListener(event.CLICK_UP, () => {
      press(false);
      toggle();
    });

    knob.addEventListener(event.CLICK_DOWN, () => press(true));
    knob.addEventListener(event.CLICK_UP, () => {
      press(false);
      toggle();
    });
  },

  animateSmallSwitchPress(
    track,
    knob,
    x,
    y,
    w,
    h,
    knobSize,
    knobY,
    offX,
    onX,
    pressed
  ) {
    animate(
      track,
      pressed
        ? {
            x: [x, x + 4],
            y: [y, y + 2],
            w: [w, w - 8],
            h: [h, h - 4],
            duration: 100,
            easing: "easeout"
          }
        : {
            x: [x + 4, x],
            y: [y + 2, y],
            w: [w - 8, w],
            h: [h - 4, h],
            duration: 150,
            easing: "easeout"
          }
    );

    const knobPressedSize = Math.max(20, knobSize - 4);

    animate(
      knob,
      pressed
        ? {
            y: [knobY, knobY + 2],
            w: [knobSize, knobPressedSize],
            h: [knobSize, knobPressedSize],
            duration: 100,
            easing: "easeout"
          }
        : {
            y: [knobY + 2, knobY],
            w: [knobPressedSize, knobSize],
            h: [knobPressedSize, knobSize],
            duration: 150,
            easing: "easeout"
          }
    );
  },

  toggleAlarm() {
    const alarm = this.state.alarm;
    alarm.enabled = !alarm.enabled;

    const ok = scheduleAlarm(alarm);

    if (!ok) {
      alarm.enabled = false;
      this.refresh();
      this.showStatus("COULD NOT SCHEDULE");
      return;
    }

    this.refresh();
    this.animateAlarmState();
    this.showStatus(alarm.enabled ? "ALARM SCHEDULED" : "ALARM OFF");
  },

  animateAlarmState(animated = true) {
    const track = this.state.widgets.alarmSwitchTrack;
    const knob = this.state.widgets.alarmSwitchKnob;

    if (!track || !knob) {
      return;
    }

    const enabled = this.state.alarm.enabled;
    const x = 20;
    const y = 270;
    const w = 350;
    const h = 56;
    const knobSize = 38;
    const knobY = 279;
    const offX = 29;
    const onX = 323;
    const targetX = enabled ? onX : offX;
    const currentX = enabled ? offX : onX;

    track.setProperty(
      prop.MORE,
      {
        color: enabled ? COLORS.blue : COLORS.surface2,
        x, y, w, h, radius: 28
      }
    );

    knob.setProperty(
      prop.MORE,
      {
        x: animated ? currentX : targetX,
        y: knobY,
        w: knobSize,
        h: knobSize,
        color: enabled ? 0x081018 : 0x6D7885,
        radius: 19
      }
    );

    if (animated) {
      animate(knob, {
        x: [currentX, targetX],
        duration: 300,
        easing: "easeout"
      });
    }
  },

  refreshOptionSwitch(key, animated = true) {
    const enabled = Boolean(this.state.alarm[key]);
    const track = this.state.widgets[key + "SwitchTrack"];
    const knob = this.state.widgets[key + "SwitchKnob"];

    if (!track || !knob) {
      return;
    }

    const trackX = 240;
    const trackW = 130;
    const knobSize = 28;
    const offX = trackX + 6;
    const onX = trackX + trackW - knobSize - 6;

    track.setProperty(
      prop.MORE,
      {
        color: enabled ? COLORS.blue : COLORS.surface2,
        x: trackX,
        y: Number(key === "sound" ? 332 : 382),
        w: trackW,
        h: 40,
        radius: 20
      }
    );

    const targetX = enabled ? onX : offX;
    const currentX = enabled ? offX : onX;

    knob.setProperty(
      prop.MORE,
      {
        x: animated ? currentX : targetX,
        y: Number(key === "sound" ? 338 : 388),
        w: knobSize,
        h: knobSize,
        color: enabled ? 0x081018 : 0x6D7885,
        radius: 14
      }
    );

    animate(
      knob,
      {
        x: [currentX, targetX],
        duration: 260,
        easing: "easeout"
      }
    );
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
          h: 148,
          alpha: 0
        }
      );

      popIn(
        cardWidget,
        16,
        16,
        358,
        158,
        {
          scale: 0.91,
          duration: 520,
          easing: "easeout"
        }
      );
    }

    const label = this.state.widgets.timeLabel;

    if (label) {
      label.setProperty(
        prop.MORE,
        {
          x: 40,
          y: 32,
          w: 300,
          h: 22,
          alpha: 0
        }
      );

      animate(
        label,
        {
          x: [40, 28],
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
          y: 72,
          w: 334,
          h: 70,
          alpha: 0
        }
      );

      animate(
        timeText,
        {
          y: [72, 54],
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
          y: 130,
          alpha: 0
        }
      );

      animate(
        meta,
        {
          y: [130, 119],
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
          y: 145,
          alpha: 0
        }
      );

      animate(
        hint,
        {
          y: [145, 137],
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
            y: [258, 218],
            alpha: [0, 255],
            duration: 380,
            easing: "easeout",
            offset: 520 + index * 100
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
              this.showStatus("ALARM UPDATED");
            } else {
              this.showStatus("TIME UPDATED");
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
    this.animateAlarmState(false);
    this.refreshOptionSwitch("sound", false);
    this.refreshOptionSwitch("vibration", false);

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

    if (this.state.widgets.timeText) {
      this.state.widgets.timeText.setProperty(
        prop.MORE,
        {
          color: alarm.enabled
            ? 0x111820
            : COLORS.blue
        }
      );
    }

    if (this.state.widgets.timeLabel) {
      this.state.widgets.timeLabel.setProperty(
        prop.MORE,
        {
          color: alarm.enabled
            ? 0x43505E
            : COLORS.muted
        }
      );
    }
  }

});

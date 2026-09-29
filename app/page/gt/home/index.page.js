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
  popIn
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

    statusTimer: null,

    widgets: {
      days: [],
      timeCard: null,
      timeText: null,
      repeatLabel: null,
      repeatSummary: null,

      alarmRow: null,
      soundRow: null,
      vibrationRow: null,

      alarmSwitchTrack: null,
      alarmSwitchKnob: null,
      soundSwitchTrack: null,
      soundSwitchKnob: null,
      vibrationSwitchTrack: null,
      vibrationSwitchKnob: null,

      controlLabels: [],
      statusText: null
    }
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
      clearTimeout(
        this.state.statusTimer
      );

      this.state.statusTimer =
        null;
    }
  },

  build() {
    setupPage({
      hideStatusBar: true
    });

    configureTheme({
      background: COLORS.background,
      surface: COLORS.surface,
      surface2: COLORS.surface2,
      accent: COLORS.mint,
      accentPressed: COLORS.mintPressed,
      text: COLORS.text,
      textMuted: COLORS.muted,
      success: COLORS.mint,
      border: COLORS.border,
      radius: 26
    });

    this.buildBackground();
    this.buildTime();
    this.buildDays();
    this.buildControls();

    this.state.widgets.statusText =
      text({
        x: 30,
        y: 428,
        w: 330,
        h: 16,
        value: "",
        color: COLORS.muted,
        size: 12,
        alignH: horizontalAlign("center"),
        alignV: verticalAlign("center"),
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
      color: COLORS.background,
      radius: 0
    });
  },

  buildTime() {
    this.state.widgets.timeCard =
      card({
        x: 18,
        y: 14,
        w: 354,
        h: 138,
        color:
          this.state.alarm.enabled
            ? COLORS.mint
            : COLORS.surface,
        radius: 30
      });

    text({
      x: 36,
      y: 28,
      w: 120,
      h: 20,
      value: "ALARM",
      color:
        this.state.alarm.enabled
          ? 0x10241D
          : COLORS.muted,
      size: 13,
      alignH: horizontalAlign("left"),
      alignV: verticalAlign("center")
    });

    this.state.widgets.timeText =
      text({
        x: 28,
        y: 55,
        w: 334,
        h: 66,
        value: formatAlarmTime(
          this.state.alarm.hour,
          this.state.alarm.minute
        ),
        color:
          this.state.alarm.enabled
            ? 0x10241D
            : COLORS.mint,
        size: 60,
        alignH: horizontalAlign("center"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.timeText.addEventListener(
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
        y: 174,
        w: 90,
        h: 22,
        value: "REPEAT",
        color: COLORS.muted,
        size: 13,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.repeatSummary =
      text({
        x: 105,
        y: 174,
        w: 265,
        h: 22,
        value: getRepeatSummary(
          this.state.alarm.days
        ),
        color: COLORS.text,
        size: 14,
        alignH: horizontalAlign("right"),
        alignV: verticalAlign("center")
      });

    const size = 40;
    const gap = 7;
    const startX = 34;
    const y = 202;

    this.state.widgets.days = [];

    DAYS.forEach(
      (day, index) => {
        this.state.widgets.days[index] =
          pillAligned({
            x:
              startX +
              index *
                (size + gap),

            y,
            w: size,
            h: size,

            text: day.label,

            horizontal: "center",
            vertical: "center",

            textColor:
              this.state.alarm.days[index]
                ? 0x10241D
                : COLORS.muted,

            textSize: 16,

            normalColor:
              this.state.alarm.days[index]
                ? COLORS.mint
                : COLORS.surface2,

            pressColor:
              this.state.alarm.days[index]
                ? COLORS.mintPressed
                : COLORS.border,

            radius: 20,

            onClick: () => {
              const alarm =
                this.state.alarm;

              if (
                alarm.days[index] &&
                getSelectedDayCount(
                  alarm.days
                ) === 1
              ) {
                return;
              }

              alarm.days[index] =
                !alarm.days[index];

              this.persistAlarm();
              this.refreshDays();
              this.refreshMeta();

              if (alarm.enabled) {
                scheduleAlarm(alarm);
                this.showStatus(
                  "SCHEDULE UPDATED"
                );
              } else {
                this.showStatus(
                  "REPEAT UPDATED"
                );
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
      310
    );
    this.buildOptionSwitch(
      "vibration",
      "VIBRATION",
      370
    );
  },

  buildMainSwitch() {
    const x = 272;
    const y = 258;
    const w = 96;
    const h = 38;
    const knob = 28;

    const knobY =
      y +
      Math.floor(
        (h - knob) / 2
      );

    const offX =
      x + 6;

    const onX =
      x +
      w -
      knob -
      6;

    const row =
      card({
        x: 18,
        y: 248,
        w: 354,
        h: 48,
        color: COLORS.surface,
        radius: 24
      });

    this.state.widgets.alarmRow =
      row;

    const labelWidget =
      text({
        x: 34,
        y: 248,
        w: 190,
        h: 48,
        value: "ALARM",
        color: COLORS.text,
        size: 16,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.controlLabels.push(
      labelWidget
    );

    this.state.widgets.alarmSwitchTrack =
      card({
        x,
        y,
        w,
        h,
        color: COLORS.surface2,
        radius: 21
      });

    this.state.widgets.alarmSwitchKnob =
      card({
        x: offX,
        y: knobY,
        w: knob,
        h: knob,
        color: 0x5B6670,
        radius: 14
      });

    const toggle =
      () => {
        this.toggleAlarm();
      };

    const press =
      (pressed) => {
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
          pressed
        );
      };

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_DOWN,
      () => press(true)
    );

    this.state.widgets.alarmSwitchTrack.addEventListener(
      event.CLICK_UP,
      () => {
        press(false);
        toggle();
      }
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_DOWN,
      () => press(true)
    );

    this.state.widgets.alarmSwitchKnob.addEventListener(
      event.CLICK_UP,
      () => {
        press(false);
        toggle();
      }
    );
  },

  buildOptionSwitch(
    type,
    label,
    rowY
  ) {
    const alarmKey =
      type === "sound"
        ? "sound"
        : "vibration";

    const x = 272;
    const trackY =
      rowY + 6;
    const w = 96;
    const h = 38;
    const knob = 28;

    const knobY =
      trackY +
      Math.floor(
        (h - knob) / 2
      );

    const offX =
      x + 6;

    const onX =
      x +
      w -
      knob -
      6;

    const row =
      card({
        x: 18,
        y: rowY,
        w: 354,
        h: 50,
        color: COLORS.surface,
        radius: 22
      });

    this.state.widgets[
      alarmKey + "Row"
    ] = row;

    const labelWidget =
      text({
        x: 34,
        y: rowY,
        w: 190,
        h: 50,
        value: label,
        color: COLORS.text,
        size: 16,
        alignH: horizontalAlign("left"),
        alignV: verticalAlign("center")
      });

    this.state.widgets.controlLabels.push(
      labelWidget
    );

    const track =
      card({
        x,
        y: trackY,
        w,
        h,
        color: COLORS.surface2,
        radius: 21
      });

    const knobWidget =
      card({
        x: offX,
        y: knobY,
        w: knob,
        h: knob,
        color: 0x5B6670,
        radius: 14
      });

    this.state.widgets[
      alarmKey + "SwitchTrack"
    ] = track;

    this.state.widgets[
      alarmKey + "SwitchKnob"
    ] = knobWidget;

    const toggle =
      () => {
        this.state.alarm[alarmKey] =
          !this.state.alarm[alarmKey];

        this.persistAlarm();
        this.refreshOptionSwitch(
          alarmKey
        );

        this.showStatus(
          label +
          (
            this.state.alarm[alarmKey]
              ? " ON"
              : " OFF"
          )
        );
      };

    const press =
      (pressed) => {
        this.animateSmallSwitchPress(
          track,
          knobWidget,
          x,
          trackY,
          w,
          h,
          knob,
          knobY,
          offX,
          onX,
          pressed
        );
      };

    track.addEventListener(
      event.CLICK_DOWN,
      () => press(true)
    );

    track.addEventListener(
      event.CLICK_UP,
      () => {
        press(false);
        toggle();
      }
    );

    knobWidget.addEventListener(
      event.CLICK_DOWN,
      () => press(true)
    );

    knobWidget.addEventListener(
      event.CLICK_UP,
      () => {
        press(false);
        toggle();
      }
    );
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
    const centerY =
      y + h / 2;

    const pressedSize =
      Math.max(
        20,
        knobSize - 4
      );

    const normalY =
      centerY -
      knobSize / 2;

    const pressedY =
      centerY -
      pressedSize / 2;

    animate(
      track,
      pressed
        ? {
            x: [x, x + 3],
            y: [y, y + 2],
            w: [w, w - 6],
            h: [h, h - 4],
            duration: 90,
            easing: "easeout"
          }
        : {
            x: [x + 3, x],
            y: [y + 2, y],
            w: [w - 6, w],
            h: [h - 4, h],
            duration: 140,
            easing: "easeout"
          }
    );

    animate(
      knob,
      pressed
        ? {
            y: [normalY, pressedY],
            w: [knobSize, pressedSize],
            h: [knobSize, pressedSize],
            duration: 90,
            easing: "easeout"
          }
        : {
            y: [pressedY, normalY],
            w: [pressedSize, knobSize],
            h: [pressedSize, knobSize],
            duration: 140,
            easing: "easeout"
          }
    );
  },

  toggleAlarm() {
    const alarm =
      this.state.alarm;

    alarm.enabled =
      !alarm.enabled;

    const ok =
      scheduleAlarm(
        alarm
      );

    if (!ok) {
      alarm.enabled =
        false;

      this.refresh();

      this.showStatus(
        "COULD NOT SCHEDULE"
      );

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

  animateAlarmState(
    animated = true
  ) {
    const track =
      this.state.widgets.alarmSwitchTrack;

    const knob =
      this.state.widgets.alarmSwitchKnob;

    if (!track || !knob) {
      return;
    }

    const enabled =
      this.state.alarm.enabled;

    const x = 272;
    const y = 258;
    const w = 96;
    const h = 38;
    const knobSize = 26;

    const knobY =
      y +
      Math.floor(
        (h - knobSize) / 2
      );

    const offX =
      x + 6;

    const onX =
      x +
      w -
      knobSize -
      6;

    const targetX =
      enabled
        ? onX
        : offX;

    const currentX =
      enabled
        ? offX
        : onX;

    track.setProperty(
      prop.MORE,
      {
        color:
          enabled
            ? COLORS.mint
            : COLORS.surface2,

        x,
        y,
        w,
        h,
        radius: 21
      }
    );

    knob.setProperty(
      prop.MORE,
      {
        x:
          animated
            ? currentX
            : targetX,

        y: knobY,
        w: knobSize,
        h: knobSize,

        color:
          enabled
            ? 0x10241D
            : 0x5B6670,

        radius: 14
      }
    );

    if (animated) {
      animate(
        knob,
        {
          x: [
            currentX,
            targetX
          ],
          duration: 300,
          easing: "easeout"
        }
      );
    }
  },

  refreshOptionSwitch(
    key,
    animated = true
  ) {
    const enabled =
      Boolean(
        this.state.alarm[key]
      );

    const track =
      this.state.widgets[
        key +
        "SwitchTrack"
      ];

    const knob =
      this.state.widgets[
        key +
        "SwitchKnob"
      ];

    if (!track || !knob) {
      return;
    }

    const x = 272;
    const rowY =
      key === "sound"
        ? 310
        : 370;

    const y =
      rowY + 7;

    const w = 96;
    const h = 38;
    const knobSize = 26;

    const offX =
      x + 6;

    const onX =
      x +
      w -
      knobSize -
      6;

    const knobY =
      y +
      Math.floor(
        (h - knobSize) / 2
      );

    const targetX =
      enabled
        ? onX
        : offX;

    const currentX =
      enabled
        ? offX
        : onX;

    track.setProperty(
      prop.MORE,
      {
        color:
          enabled
            ? COLORS.mint
            : COLORS.surface2,

        x,
        y,
        w,
        h,
        radius: 21
      }
    );

    knob.setProperty(
      prop.MORE,
      {
        x:
          animated
            ? currentX
            : targetX,

        y: knobY,
        w: knobSize,
        h: knobSize,

        color:
          enabled
            ? 0x10241D
            : 0x5B6670,

        radius: 14
      }
    );

    if (animated) {
      animate(
        knob,
        {
          x: [
            currentX,
            targetX
          ],
          duration: 260,
          easing: "easeout"
        }
      );
    }
  },

  animateOpen() {
    const cardWidget =
      this.state.widgets.timeCard;

    if (cardWidget) {
      popIn(
        cardWidget,
        18,
        14,
        354,
        138,
        {
          scale: 0.95,
          duration: 360,
          easing: "easeout"
        }
      );
    }

    const rows = [
      this.state.widgets.alarmRow,
      this.state.widgets.soundRow,
      this.state.widgets.vibrationRow
    ];

    rows.forEach(
      (row, index) => {
        if (!row) {
          return;
        }

        row.setProperty(
          prop.MORE,
          {
            x: 26,
            alpha: 0
          }
        );

        animate(
          row,
          {
            x: [26, 18],
            alpha: [0, 255],
            duration: 280,
            easing: "easeout",
            offset:
              420 +
              index * 70
          }
        );
      }
    );

    this.state.widgets.controlLabels.forEach(
      (labelWidget) => {
        labelWidget.setProperty(
          prop.MORE,
          {
            x: 42,
            alpha: 0
          }
        );

        animate(
          labelWidget,
          {
            x: [42, 34],
            alpha: [0, 255],
            duration: 280,
            easing: "easeout",
            offset: 420
          }
        );
      }
    );

    const switches = [
      {
        track:
          this.state.widgets.alarmSwitchTrack,

        knob:
          this.state.widgets.alarmSwitchKnob,

        x: 272,
        y: 258
      },
      {
        track:
          this.state.widgets.soundSwitchTrack,

        knob:
          this.state.widgets.soundSwitchKnob,

        x: 272,
        y: 316
      },
      {
        track:
          this.state.widgets.vibrationSwitchTrack,

        knob:
          this.state.widgets.vibrationSwitchKnob,

        x: 272,
        y: 376
      }
    ];

    switches.forEach(
      (item) => {
        if (
          !item.track ||
          !item.knob
        ) {
          return;
        }

        const knobSize = 26;
        const h = 38;
        const knobY =
          item.y +
          Math.floor(
            (h - knobSize) / 2
          );

        item.track.setProperty(
          prop.MORE,
          {
            x: item.x + 10,
            y: item.y + 4,
            alpha: 0
          }
        );

        item.knob.setProperty(
          prop.MORE,
          {
            x: item.x + 10,
            y: knobY + 4,
            alpha: 0
          }
        );

        animate(
          item.track,
          {
            x: [item.x + 10, item.x],
            y: [item.y + 4, item.y],
            alpha: [0, 255],
            duration: 280,
            easing: "easeout",
            offset: 420
          }
        );

        animate(
          item.knob,
          {
            x: [
              item.x + 10,
              item.x
            ],
            y: [
              knobY + 4,
              knobY
            ],
            alpha: [0, 255],
            duration: 280,
            easing: "easeout",
            offset: 420
          }
        );
      }
    );
  },

  openTimePicker() {
    const alarm =
      this.state.alarm;

    timePicker({
      title: "Alarm time",

      hour: alarm.hour,
      minute: alarm.minute,

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

          if (eventType === 2) {
            this.persistAlarm();

            if (alarm.enabled) {
              scheduleAlarm(
                alarm
              );

              this.showStatus(
                "ALARM UPDATED"
              );
            } else {
              this.showStatus(
                "TIME UPDATED"
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
    if (
      this.state.widgets.repeatSummary
    ) {
      this.state.widgets.repeatSummary.setProperty(
        prop.MORE,
        {
          text:
            getRepeatSummary(
              this.state.alarm.days
            )
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
            this.state.alarm.days[index]
          );

        dayWidget.button.setProperty(
          prop.MORE,
          {
            color:
              selected
                ? COLORS.mint
                : COLORS.surface2
          }
        );

        dayWidget.text.setProperty(
          prop.MORE,
          {
            color:
              selected
                ? 0x10241D
                : COLORS.muted
          }
        );
      }
    );
  },

  refresh() {
    const alarm =
      this.state.alarm;

    if (this.state.widgets.timeText) {
      this.state.widgets.timeText.setProperty(
        prop.MORE,
        {
          text:
            formatAlarmTime(
              alarm.hour,
              alarm.minute
            ),
          color:
            alarm.enabled
              ? 0x10241D
              : COLORS.mint
        }
      );
    }

    if (this.state.widgets.timeCard) {
      this.state.widgets.timeCard.setProperty(
        prop.MORE,
        {
          color:
            alarm.enabled
              ? COLORS.mint
              : COLORS.surface
        }
      );
    }

    this.refreshMeta();
    this.refreshDays();

    this.animateAlarmState(false);
    this.refreshOptionSwitch(
      "sound",
      false
    );
    this.refreshOptionSwitch(
      "vibration",
      false
    );
  },

  showStatus(message) {
    const status =
      this.state.widgets.statusText;

    if (!status) {
      return;
    }

    status.setProperty(
      prop.MORE,
      {
        text: String(message),
        alpha: 255
      }
    );

    if (this.state.statusTimer) {
      clearTimeout(
        this.state.statusTimer
      );
    }

    this.state.statusTimer =
      setTimeout(
        () => {
          if (status) {
            animate(
              status,
              {
                alpha: [255, 0],
                duration: 250,
                easing: "easeout"
              }
            );
          }
        },
        1000
      );
  }
});

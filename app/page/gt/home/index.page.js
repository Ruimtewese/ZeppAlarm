import {
  setupPage,
  configureTheme,
  pillAligned,
  card,
  switchControl,
  timePicker,
  loadObject,
  saveObject,
  animate,
  animateGroup
} from "zeppcore";

import {
  prop
} from "@zos/ui";

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

    widgets: {
      days: []
    },

    testPlayer:
      null
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
        COLORS.background,
      radius: 0
    });
  },

  buildTime() {
    this.state.widgets.time =
      pillAligned({
        x: 20,
        y: 28,
        w: 350,
        h: 174,

        text:
          "7:00 AM",

        horizontal:
          "center",

        vertical:
          "center",

        textColor:
          COLORS.text,

        textSize:
          68,

        normalColor:
          COLORS.surface,

        pressColor:
          COLORS.surface2,

        radius:
          45,

        onClick: () => {
          this.openTimePicker();
        }
      });
  },

  buildDays() {
    const size = 44;
    const gap = 6;
    const startX = 20;
    const y = 220;

    this.state.widgets.days =
      [];

    DAYS.forEach(
      (
        day,
        index
      ) => {
        this.state.widgets.days[
          index
        ] =
          pillAligned({
            x:
              startX +
              index *
                (size + gap),

            y,

            w: size,
            h: size,

            text:
              day.label,

            horizontal:
              "center",

            vertical:
              "center",

            textColor:
              COLORS.muted,

            textSize:
              16,

            normalColor:
              COLORS.surface2,

            pressColor:
              COLORS.border,

            radius:
              22,

            onClick:
              () => {
                const alarm =
                  this.state.alarm;

                if (
                  alarm.days[
                    index
                  ] &&
                  getSelectedDayCount(
                    alarm.days
                  ) === 1
                ) {
                  return;
                }

                alarm.days[
                  index
                ] =
                  !alarm.days[
                    index
                  ];

                this.persistAlarm();

                this.refreshDays();

                if (
                  alarm.enabled
                ) {
                  scheduleAlarm(
                    alarm
                  );
                }
              }
          });
      }
    );
  },

  buildControls() {
    this.state.widgets.switch =
      switchControl({
        x: 20,
        y: 288,
        w: 168,
        h: 58,

        value: false,

        onColor:
          COLORS.mint,

        offColor:
          COLORS.surface2,

        pressedOnColor:
          COLORS.mintPressed,

        pressedOffColor:
          COLORS.border,

        onText:
          "ON",

        offText:
          "OFF",

        textColor:
          0x091015,

        textSize:
          18,

        onChange:
          (
            enabled
          ) => {
            this.state.alarm.enabled =
              Boolean(
                enabled
              );

            const ok =
              scheduleAlarm(
                this.state.alarm
              );

            if (
              !ok
            ) {
              this.state.alarm.enabled =
                false;

              this.state.widgets.switch.setValue(
                false
              );
            }

            this.refresh();
          }
      });

    this.state.widgets.switch =
      this.state.widgets.switch;
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
                ? COLORS.sky
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
      this.state.widgets.switch
    ) {
      this.state.widgets.switch.setValue(
        alarm.enabled
      );
    }

    this.refreshDays();
  },

});

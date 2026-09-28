# Zepp Alarm

A lightweight daily alarm for Zepp OS, built around ZeppCore.

## Features

- Large pill-style alarm time card
- ZeppCore timePicker for hour/minute selection
- Persistent daily alarm using @zos/alarm
- App Service wake-up
- Built-in alarm sound plus notification fallback
- One-tap ON/OFF control
- Test alarm sound button
- 390px design width for rounded-watch UI

## Stack

- Zepp OS 4.2
- GT target with st:r and st:s
- ZeppCore
- @zos/alarm
- Zepp OS App Service
- Zepp OS notification API

## Project layout

app.json
app.js
package.json

page/
  gt/
    home/
      index.page.js

app-service/
  alarm.js

assets/
  gt/

## Important

The app ID in app.json is currently 1000001 as a development placeholder. Replace it with the app ID assigned to this Mini Program before publishing.

Run npm install to install ZeppCore from GitHub.

For local ZeppCore development, the project can also use the local linking workflow.

## Alarm behavior

The app stores one alarm configuration:

- time
- enabled state
- persistent alarm ID

When enabled, the app schedules the next occurrence and configures it as a daily repeating alarm with persistent storage. The alarm wakes the App Service, which plays the built-in alarm sound and sends a notification.

The time picker is ZeppCore's picker wrapper, so the selection screen closes automatically after confirmation.

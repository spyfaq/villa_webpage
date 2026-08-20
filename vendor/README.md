# Vendored third-party assets

These files are served from this origin instead of a CDN so that no third party
receives visitors' IP addresses. That is a deliberate privacy choice, and the
cost of it is that updates are manual rather than automatic — nothing here
refreshes on its own.

## fullcalendar

| | |
|---|---|
| Version | 6.1.8 |
| Licence | MIT (see `fullcalendar/LICENSE.md`) |
| Upstream | https://github.com/fullcalendar/fullcalendar |

Only three of FullCalendar's packages are used. `ical.js` and
`@fullcalendar/icalendar` are deliberately absent: availability is read from
`availability.json` through a custom `events` function in `script.js`, so the
iCalendar plugin has nothing to do. FullCalendar v6 injects its own CSS, so
there is no stylesheet to vendor.

### Updating

```sh
VERSION=6.1.8   # change to the version you want

npm pack @fullcalendar/core@$VERSION \
         @fullcalendar/daygrid@$VERSION \
         @fullcalendar/interaction@$VERSION

for m in core daygrid interaction; do
  tar -xzf fullcalendar-$m-$VERSION.tgz
  cp package/index.global.min.js vendor/fullcalendar/$m.min.js
  rm -rf package fullcalendar-$m-$VERSION.tgz
done
```

Then update the version in this file and in the comment in `index.html`, and
check the availability calendar still renders, selects a date range, and refuses
a range that crosses blocked dates.

## fonts

`fonts/` holds woff2 files from [Fontsource](https://fontsource.org), which
repackages Google Fonts for self-hosting. Only the five weights `style.css`
actually declares are present — Inter 400/600/700 and Cormorant Garamond
500/600. If you add a weight to the stylesheet, add the matching file too, or
the browser will synthesise it and it will look wrong.

```sh
npm pack @fontsource/inter@5 @fontsource/cormorant-garamond@5
# extract, then copy the files you need from package/files/*-latin-*-normal.woff2
```

Both families are licensed under the SIL Open Font License 1.1.

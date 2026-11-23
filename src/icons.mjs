// Mockup-style SVG icon set. Replaces pictograph emoji in rendered UI text with inline SVG,
// so OS emoji fonts (which differ per platform and clash with the mockups) are never shown.
// Display layer only: game code keeps writing plain emoji; this module swaps them after each render.
// UI glyphs use currentColor (white on red buttons, brown elsewhere); food icons are small coloured illustrations.
const S = (body, vb = "0 0 24 24") => '<svg viewBox="' + vb + '" aria-hidden="true" focusable="false">' + body + "</svg>";
const C = "currentColor";

const ui = {
  info: S('<circle cx="12" cy="12" r="9.5" fill="none" stroke="' + C + '" stroke-width="2.2"/><circle cx="12" cy="7.2" r="1.25" fill="' + C + '"/><path fill="' + C + '" d="M10.9 10.2h2.2v7h-2.2z"/>'),
  menu: S('<path fill="none" stroke="' + C + '" stroke-width="2.4" stroke-linecap="round" d="M3.5 6h17M3.5 12h17M3.5 18h17"/>'),
  refresh: S('<path fill="none" stroke="' + C + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M20 7v5h-5M4 17v-5h5"/><path fill="none" stroke="' + C + '" stroke-width="2.2" stroke-linecap="round" d="M5.7 9A7 7 0 0 1 18 6.8L20 12M4 12l2 5.2A7 7 0 0 0 18.3 15"/>'),
  play: S('<path fill="' + C + '" d="M6 3.8 21 12 6 20.2z"/>'),
  down: S('<path fill="none" stroke="' + C + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="m5 9 7 7 7-7"/>'),
  left: S('<path fill="none" stroke="' + C + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="m15 5-7 7 7 7"/>'),
  check: S('<path fill="none" stroke="' + C + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="m4 12.5 5.2 5L20 6.5"/>'),
  star: S('<path fill="' + C + '" d="m12 1.8 3.1 6.4 7 .9-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-4.9 7-.9z"/>'),
  testTube: S('<path fill="none" stroke="' + C + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" d="M9 3h6M10 3v8l-4.7 8.1A1.9 1.9 0 0 0 7 22h10a1.9 1.9 0 0 0 1.7-2.9L14 11V3M8 17h8"/>'),
  right: S('<path fill="none" stroke="' + C + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M3 12h17m-7-7 7 7-7 7"/>'),
  gear: S('<path fill="' + C + '" d="M10.3 2h3.4l.5 2.6 1.6.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.6 2.6.5v3.4l-2.6.5-.7 1.6 1.5 2.2-2.4 2.4-2.2-1.5-1.6.7-.5 2.6h-3.4l-.5-2.6-1.6-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.6L2 13.7v-3.4l2.6-.5.7-1.6-1.5-2.2 2.4-2.4 2.2 1.5 1.6-.7zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>'),
  book: S('<path fill="' + C + '" d="M2 5.2C4.8 4 8 4.2 11 6v14c-3-1.8-6.2-2-9-.8zm20 0C19.2 4 16 4.2 13 6v14c3-1.8 6.2-2 9-.8z"/><path fill="#fff6" d="M4 8.2c2-.5 3.8-.3 5.4.5v1.3C7.8 9.2 6 9 4 9.5zm0 3c2-.5 3.8-.3 5.4.5V13C7.8 12.2 6 12 4 12.5z"/>'),
  folder: S('<path fill="' + C + '" d="M2 6.5A1.5 1.5 0 0 1 3.5 5h5.2l2 2h9.8A1.5 1.5 0 0 1 22 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5z"/><path fill="#fff5" d="M3.5 10h17v1.4h-17z"/>'),
  power: S('<path fill="none" stroke="' + C + '" stroke-width="2.8" stroke-linecap="round" d="M12 3v8M6.6 6.2a8 8 0 1 0 10.8 0"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2.5" fill="' + C + '"/><rect x="5" y="10" width="14" height="9" rx="1" fill="#fff8"/><path fill="' + C + '" d="M7 2.5h2.4v5H7zm7.6 0H17v5h-2.4z"/><path fill="' + C + '" d="M7 12h2.5v2.2H7zm3.8 0h2.5v2.2h-2.5zm3.7 0H17v2.2h-2.5zM7 15.5h2.5v2.2H7zm3.8 0h2.5v2.2h-2.5z"/>'),
  clock: S('<circle cx="12" cy="12" r="10" fill="' + C + '"/><circle cx="12" cy="12" r="7.6" fill="#fff9"/><path fill="none" stroke="' + C + '" stroke-width="2.2" stroke-linecap="round" d="M12 7.5V12l3 2"/>'),
  stopwatch: S('<path fill="' + C + '" d="M9.5 1.5h5v2.2h-5z"/><circle cx="12" cy="14" r="8.5" fill="' + C + '"/><circle cx="12" cy="14" r="6.4" fill="#fff9"/><path fill="none" stroke="' + C + '" stroke-width="2.2" stroke-linecap="round" d="M12 10v4.2"/>'),
  coins: S('<ellipse cx="12" cy="17" rx="8" ry="3.4" fill="#c98a1b"/><ellipse cx="12" cy="13.6" rx="8" ry="3.4" fill="#e0a92a"/><ellipse cx="12" cy="10.2" rx="8" ry="3.4" fill="#c98a1b"/><ellipse cx="12" cy="8.2" rx="8" ry="3.4" fill="#f6cf4f"/><ellipse cx="12" cy="8.2" rx="4.6" ry="1.7" fill="#e0a92a"/>'),
  chat: S('<path fill="' + C + '" d="M4 3.5h16A2.5 2.5 0 0 1 22.5 6v9A2.5 2.5 0 0 1 20 17.5h-9l-5 4v-4H4A2.5 2.5 0 0 1 1.5 15V6A2.5 2.5 0 0 1 4 3.5z"/><circle cx="7.5" cy="10.5" r="1.5" fill="#fff"/><circle cx="12" cy="10.5" r="1.5" fill="#fff"/><circle cx="16.5" cy="10.5" r="1.5" fill="#fff"/>'),
  user: S('<circle cx="12" cy="7.5" r="4.5" fill="' + C + '"/><path fill="' + C + '" d="M3.5 21.5c0-5 3.8-8 8.5-8s8.5 3 8.5 8z"/>'),
  users: S('<circle cx="8.5" cy="8" r="3.8" fill="' + C + '"/><path fill="' + C + '" d="M1.5 20c0-4.2 3.1-6.8 7-6.8s7 2.6 7 6.8z"/><circle cx="16.5" cy="7" r="3.2" fill="' + C + '" opacity=".75"/><path fill="' + C + '" opacity=".75" d="M16.2 12.2c3.5 0 6.3 2.3 6.3 6.3h-5.2c-.2-2.6-1.1-4.6-2.8-5.9.5-.3 1.1-.4 1.7-.4z"/>'),
  clipboard: S('<rect x="4" y="3.5" width="16" height="19" rx="2.5" fill="' + C + '"/><rect x="6.2" y="6.5" width="11.6" height="13.8" rx="1" fill="#fff"/><path fill="' + C + '" d="M8.5 1.5h7v4h-7z"/><path fill="' + C + '" d="M8 9.5h8v1.6H8zm0 3.2h8v1.6H8zm0 3.2h5.5v1.6H8z"/>'),
  chart: S('<path fill="' + C + '" d="M3 20h18v2H3zM4.5 12h3.5v7H4.5zm5.8-4h3.5v11h-3.5zm5.8-4.5h3.5V19h-3.5z"/>'),
  trend: S('<path fill="' + C + '" d="M3 20h18v2H3z"/><path fill="none" stroke="' + C + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 3.5 3L20 6.5"/><path fill="' + C + '" d="M15.5 5h6v6z"/>'),
  house: S('<path fill="' + C + '" d="M12 2.5 1.5 11.5H4.5V21h5.5v-6h4v6h5.5v-9.5h3z"/>'),
  store: S('<path fill="' + C + '" d="M3 3h18l1.5 6H1.5z"/><path fill="#fff7" d="M4.5 4.5h3l-.6 3.4H3.6zm6 0h3v3.4h-3zm6 0h3l.9 3.4h-3.3z"/><path fill="' + C + '" d="M3.5 10.5h17V21h-17z"/><path fill="#fff" d="M6 13h5v5H6zm7.5 0h4v8h-4z"/>'),
  basket: S('<path fill="none" stroke="' + C + '" stroke-width="2.2" stroke-linecap="round" d="M7 9l4-6m6 6-4-6"/><path fill="' + C + '" d="M1.5 9h21l-2.2 11.5a1.5 1.5 0 0 1-1.5 1.2H5.2a1.5 1.5 0 0 1-1.5-1.2z"/><path fill="#fff6" d="M7 12h2v7H7zm4 0h2v7h-2zm4 0h2v7h-2z"/>'),
  box: S('<path fill="' + C + '" d="M12 2 21.5 6.5v11L12 22l-9.5-4.5v-11z"/><path fill="#fff5" d="M12 11.2 21.5 6.5 12 2 2.5 6.5zM12 11.2V22"/><path fill="none" stroke="#fff8" stroke-width="1.2" d="M12 11.2V22M2.5 6.5 12 11.2l9.5-4.7"/>'),
  target: S('<circle cx="12" cy="12" r="10" fill="#c4231b"/><circle cx="12" cy="12" r="7" fill="#fff"/><circle cx="12" cy="12" r="4.2" fill="#c4231b"/><circle cx="12" cy="12" r="1.6" fill="#fff"/>'),
  crown: S('<path fill="#f2b230" stroke="#9a5a10" stroke-width="1.2" stroke-linejoin="round" d="M2.5 7.5 7.5 12 12 4l4.5 8 5-4.5-2 12h-15z"/><rect x="4.5" y="19" width="15" height="2.5" rx="1" fill="#d8901a"/><circle cx="12" cy="4" r="1.6" fill="#fff3b0"/><circle cx="2.5" cy="7.5" r="1.4" fill="#fff3b0"/><circle cx="21.5" cy="7.5" r="1.4" fill="#fff3b0"/>'),
  sparkle: S('<path fill="#f6c63a" d="M12 1.5c.9 5 2.6 6.7 7.5 7.5-4.9.8-6.6 2.5-7.5 7.5-.9-5-2.6-6.7-7.5-7.5 4.9-.8 6.6-2.5 7.5-7.5z"/><path fill="#ffe38a" d="M19 14.5c.4 2.3 1.2 3.1 3.5 3.5-2.3.4-3.1 1.2-3.5 3.5-.4-2.3-1.2-3.1-3.5-3.5 2.3-.4 3.1-1.2 3.5-3.5zM5 15.5c.3 1.8.9 2.4 2.7 2.7-1.8.3-2.4.9-2.7 2.7-.3-1.8-.9-2.4-2.7-2.7 1.8-.3 2.4-.9 2.7-2.7z"/>'),
  party: S('<path fill="#e0a92a" d="M2.5 21.5 8 6.5l9.5 9.5z"/><path fill="#c4231b" d="M5.3 13.8 7 9.2l7.8 7.8-4.6 1.7z"/><circle cx="16" cy="4" r="1.5" fill="#c4231b"/><circle cx="20.5" cy="8.5" r="1.5" fill="#3a8fd8"/><path fill="none" stroke="var(--state-success)" stroke-width="1.8" stroke-linecap="round" d="M12 6c1-2 .5-3.5 2-4.5M18 12c2-1 3.5-.5 4.5-2"/>'),
  cloche: S('<path fill="' + C + '" d="M12 4.5a1.6 1.6 0 1 1 0 .1zM3 17a9 9 0 0 1 18 0z"/><rect x="1.5" y="17.5" width="21" height="2.6" rx="1.3" fill="' + C + '"/><path fill="#fff6" d="M6.5 15a6 6 0 0 1 4-4.6l.4 1.1A4.8 4.8 0 0 0 7.7 15z"/>'),
  bell: S('<path fill="' + C + '" d="M12 2.5a1.5 1.5 0 0 1 1.5 1.5v.7a6 6 0 0 1 4.5 5.8v4.5l2 2.5H4l2-2.5v-4.5a6 6 0 0 1 4.5-5.8V4A1.5 1.5 0 0 1 12 2.5zM9.5 19.5h5a2.5 2.5 0 0 1-5 0z"/>'),
  tools: S('<path fill="' + C + '" d="M14.6 2.6a5 5 0 0 0-5.4 6.6L2.6 15.8a2.1 2.1 0 1 0 3 3l6.6-6.6a5 5 0 0 0 6.6-5.4L16 9.6l-2.9-.7-.7-2.9z"/><path fill="' + C + '" opacity=".8" d="m13.5 14.6 2-2 6 6a1.4 1.4 0 0 1-2 2z"/>'),
  sun: S('<circle cx="12" cy="12" r="5" fill="#f2a12a"/><path fill="none" stroke="#f2a12a" stroke-width="2.2" stroke-linecap="round" d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/>'),
  moon: S('<path fill="#f2c14e" d="M15.5 2.5A9.5 9.5 0 1 0 21.5 17 8 8 0 0 1 15.5 2.5z"/>'),
  clover: S('<g fill="var(--state-success)"><circle cx="8.3" cy="8.3" r="4"/><circle cx="15.7" cy="8.3" r="4"/><circle cx="8.3" cy="15.7" r="4"/><circle cx="15.7" cy="15.7" r="4"/></g><path fill="none" stroke="#2f5f22" stroke-width="1.8" stroke-linecap="round" d="M12 12c1.5 4 3 6.5 5.5 9"/>'),
  laurel: S('<path fill="none" stroke="#e0a92a" stroke-width="1.8" stroke-linecap="round" d="M5 21C4 15 6 8 12 3"/><g fill="#f2c14e"><ellipse cx="9.2" cy="6" rx="1.6" ry="3" transform="rotate(45 9.2 6)"/><ellipse cx="6.4" cy="9.6" rx="1.6" ry="3" transform="rotate(25 6.4 9.6)"/><ellipse cx="5" cy="14" rx="1.6" ry="3" transform="rotate(5 5 14)"/><ellipse cx="11" cy="9.6" rx="1.5" ry="2.8" transform="rotate(70 11 9.6)"/><ellipse cx="9" cy="13.6" rx="1.5" ry="2.8" transform="rotate(60 9 13.6)"/></g>'),
  fire: S('<path fill="#f0702a" d="M12 1.5c1 3.6 6.5 6.4 6.5 12.5A6.5 6.5 0 0 1 5.5 14c0-3.4 2.1-5 3-7.4.6 1.7 1.4 2.6 2.3 3C11.4 7 11 4.5 12 1.5z"/><path fill="#ffd34a" d="M12 11c.5 1.8 3.2 3 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-1.6 1-2.5 1.6-3.6.3.8.7 1.2 1.1 1.4.3-1.2.2-2.3.5-3.6z"/>'),
  chopsticks: S('<path fill="#c98a4b" d="m3.2 19.6 15.6-17 1.2 1.1-15.4 17.3z"/><path fill="#c98a4b" d="m7.4 21.6 13.2-14.8 1.2 1L8.8 22.6z"/><path fill="#c4231b" d="m16.6 5 2.2-2.4 1.2 1.1-2.1 2.4zm2 4.4 2-2.6 1.2 1-2 2.6z"/>'),
  cup: S('<path fill="' + C + '" d="M3 8h14v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z"/><path fill="none" stroke="' + C + '" stroke-width="2" d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path fill="none" stroke="' + C + '" stroke-width="1.6" stroke-linecap="round" opacity=".6" d="M7 2.5c-1 1.5 1 2.5 0 4m4-4c-1 1.5 1 2.5 0 4"/>'),
  warning: S('<path fill="#f2b230" d="M12 2 23 21H1z"/><path fill="var(--text-ink)" d="M10.8 8h2.4l-.4 7h-1.6zM12 16.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z"/>'),
  music: S('<path fill="' + C + '" d="M9 4.5 20 2v13.5a3 3 0 1 1-2-2.8V6.3L11 8v10a3 3 0 1 1-2-2.8z"/>'),
  pause: S('<rect x="5" y="3.5" width="5" height="17" rx="1.2" fill="' + C + '"/><rect x="14" y="3.5" width="5" height="17" rx="1.2" fill="' + C + '"/>'),
  chef: S('<path fill="' + C + '" d="M7 13.5h10V20a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20z"/><path fill="' + C + '" d="M6.5 13A4.5 4.5 0 0 1 7.6 4.2 5 5 0 0 1 16.4 4.2 4.5 4.5 0 0 1 17.5 13z"/><path fill="#fff6" d="M8.5 16h7v1.4h-7z"/>'),
  powerBtn: S('<path fill="none" stroke="' + C + '" stroke-width="2.8" stroke-linecap="round" d="M12 3v8M6.6 6.2a8 8 0 1 0 10.8 0"/>'),
  bulb: S('<path fill="#f6c63a" d="M12 2a7 7 0 0 1 4.2 12.6c-.8.6-1.2 1.4-1.2 2.4h-6c0-1-.4-1.8-1.2-2.4A7 7 0 0 1 12 2z"/><path fill="#8a6a3a" d="M9 18h6v1.6H9zm1 2.4h4a2 2 0 0 1-4 0z"/>'),
  fork: S('<path fill="' + C + '" d="M6 2h1.4v6h1.2V2H10v6h1.2V2h1.4v7.2a3 3 0 0 1-2.2 2.9V22H8V12.1A3 3 0 0 1 5.8 9.2V2zM17 2c2 1 3 3.5 3 7v4h-2v9h-2.4V2z"/>'),
};
const food = {
  meat: S('<path fill="#e06b78" d="M4 7.5C6.5 3.5 15 2.8 19.5 6.5s1.5 11.5-4.5 13-14-2.5-13.5-7.5c.2-1.8.9-3.3 2.5-4.5z"/><path fill="#f5c6cb" d="M7 8.5c2-2 7.5-2.5 10.5 0-3.5-.8-7-.6-10.5 0zm-1.5 5c3 1.6 7 2 11 .5-3.5 2.5-8 2.5-11-.5z"/><path fill="#b8404f" d="M14.5 17c2.4-.8 4.2-3 4.4-5.6.6 3.3-1.3 6.2-4.4 5.6z"/>'),
  breading: S('<path fill="#d9a24a" d="M2.5 13h19a9.5 6.5 0 0 1-19 0z"/><ellipse cx="12" cy="13" rx="9.5" ry="2.6" fill="#f7d98a"/><g fill="#e7b85c"><circle cx="8" cy="12.5" r="1.1"/><circle cx="11.5" cy="11.6" r="1"/><circle cx="15.5" cy="12.6" r="1.2"/><circle cx="13" cy="13.6" r=".9"/><circle cx="9.8" cy="13.8" r=".8"/></g><path fill="#c98a4b" d="M4.5 9.5c1-2.5 4-3.5 6.5-2.8L10 9z"/>'),
  pan: S('<rect x="15.5" y="11" width="8" height="2.6" rx="1.3" fill="#5a3a2a" transform="rotate(-12 15.5 11)"/><ellipse cx="9.5" cy="14" rx="8.5" ry="5.6" fill="#3d3a3c"/><ellipse cx="9.5" cy="13.2" rx="7" ry="4.3" fill="#e3a33a"/><ellipse cx="9.5" cy="13" rx="5" ry="2.6" fill="#c56d1e"/><g fill="#ffe3a0"><circle cx="5" cy="12" r=".8"/><circle cx="14" cy="14.6" r=".9"/><circle cx="8" cy="15.6" r=".7"/></g><path fill="none" stroke="#fff8" stroke-width="1.2" stroke-linecap="round" d="M7 6.5c-.8-1.2.6-2 0-3.3m3.5 3.3c-.8-1.2.6-2 0-3.3"/>'),
  sauce: S('<path fill="#8a4a1c" d="M2.5 11h19a9.5 8 0 0 1-19 0z"/><ellipse cx="12" cy="11" rx="9.5" ry="2.8" fill="#5a2410"/><ellipse cx="10" cy="10.6" rx="3.5" ry=".9" fill="#a5582a"/><path fill="none" stroke="#c98a4b" stroke-width="2" stroke-linecap="round" d="M16 10.5 21.5 3"/>'),
  cabbage: S('<circle cx="12" cy="13" r="9" fill="#9bc94a"/><path fill="#c8e58a" d="M12 4.5c3.5 2 4.5 6 3 10-1.5-3-3.8-4.2-6.5-4 .6-2.8 1.7-4.8 3.5-6z"/><path fill="none" stroke="#6f9a2a" stroke-width="1.3" stroke-linecap="round" d="M12 21c-1-4 0-8 3-11M6.5 9c2.5 1 4 3.5 4 7"/>'),
  rice: S('<path fill="#c4231b" d="M2.5 12h19a9.5 8.5 0 0 1-19 0z"/><path fill="#fff" d="M3.5 12c0-4.5 3.8-7.5 8.5-7.5s8.5 3 8.5 7.5z"/><g fill="#e9e1d2"><ellipse cx="8" cy="9" rx="1" ry=".6"/><ellipse cx="12" cy="7.5" rx="1" ry=".6"/><ellipse cx="15.5" cy="9.5" rx="1" ry=".6"/><ellipse cx="10.5" cy="10.6" rx="1" ry=".6"/></g><path fill="#fff5" d="M4.5 13.5h15c-.4 1-1 1.9-1.8 2.6H6.3c-.8-.7-1.4-1.6-1.8-2.6z"/>'),
  plated: S('<ellipse cx="12" cy="14" rx="11" ry="6.5" fill="#f4efe6"/><ellipse cx="12" cy="13.6" rx="8.6" ry="4.8" fill="#fff"/><ellipse cx="15.8" cy="11.2" rx="3.6" ry="2.6" fill="#9bc94a"/><ellipse cx="10.5" cy="14" rx="6.4" ry="3.4" fill="#d98a2e"/><path fill="#6a2a10" d="M5.5 13.2c2-1.6 7.5-2 10.3-.2.4 1.6-.6 2.8-2.6 3.2-2.4.5-6 .2-7.5-1.2z"/>'),
};
const map = {
  "ⓘ": ui.info, "☰": ui.menu, "↻": ui.refresh, "▶": ui.play, "▼": ui.down, "◀": ui.left, "✓": ui.check, "✔": ui.check, "★": ui.star, "🧪": ui.testTube, "➜": ui.right,
  "⚙️": ui.gear, "⚙": ui.gear, "📖": ui.book, "📂": ui.folder, "🚪": ui.power, "📅": ui.calendar, "🕒": ui.clock, "⏱️": ui.stopwatch, "⏱": ui.stopwatch,
  "💰": ui.coins, "🪙": ui.coins, "💬": ui.chat, "👤": ui.user, "👥": ui.users, "📋": ui.clipboard, "🧾": ui.clipboard, "📝": ui.clipboard,
  "📊": ui.chart, "📈": ui.trend, "🏠": ui.house, "🏮": ui.store, "🧺": ui.basket, "📦": ui.box, "🎯": ui.target, "👑": ui.crown,
  "✨": ui.sparkle, "🎉": ui.party, "🎊": ui.party, "🛎️": ui.cloche, "🛎": ui.cloche, "🔔": ui.bell, "🛠️": ui.tools, "🛠": ui.tools,
  "☀️": ui.sun, "☀": ui.sun, "🌙": ui.moon, "🍀": ui.clover, "🌿": ui.laurel, "🔥": ui.fire, "🥢": ui.chopsticks, "☕": ui.cup,
  "⚠️": ui.warning, "⚠": ui.warning, "🎵": ui.music, "⏸️": ui.pause, "⏸": ui.pause, "🍴": ui.fork,
  "🧑‍🍳": ui.chef, "⏻": ui.powerBtn, "💡": ui.bulb, "🥩": food.meat, "🍞": food.breading, "🍳": food.pan, "🥣": food.sauce, "🥬": food.cabbage, "🍚": food.rice, "🍽️": food.plated, "🍽": food.plated,
};
const keys = Object.keys(map).sort((a, b) => b.length - a.length);
const re = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gu");
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION", "TITLE"]);

export function swapIcons(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (SKIP.has(n.parentNode?.nodeName) ? NodeFilter.FILTER_REJECT : (re.lastIndex = 0, re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)),
  });
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  for (const node of hits) {
    const frag = document.createDocumentFragment(), text = node.nodeValue;
    let last = 0;
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      const span = document.createElement("span");
      span.className = "ico";
      span.innerHTML = map[m[0]];
      frag.append(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}

const app = document.getElementById("app");
const obs = new MutationObserver(() => { obs.disconnect(); swapIcons(app); obs.observe(app, { childList: true, subtree: true, characterData: true }); });
swapIcons(app);
obs.observe(app, { childList: true, subtree: true, characterData: true });

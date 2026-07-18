'use strict';

// Onboarding 相遇仪式 script (CHARTER §7 / MIRA_LANGUAGE §四) — zh/en. Loaded as a
// plain <script> global (the onboarding renderer has no module system); the main
// process sends the resolved locale in onboarding:init and the script picks here.
// Strings may hold rich text (<br>, brand <span>) — all hardcoded, no injection.

window.OB_STRINGS = {
  zh: {
    hello: '你好，我是 Mira',
    intro1: '我住在你的屏幕角落，<br>不打扰你',
    intro2: '你看屏幕太久时，我会提醒你<br>——歇一下，看看远处',
    tryIntro: '现在，我们先一起试一次',
    tryBtn: '好，来试试',
    fade: '看屏幕久了，<br>气色会一点点淡下去',
    restNow: '那就歇一下——<br>看看远处，等着它亮回来',
    afterRest: '这样就好，<br>是不是清楚了一点',
    explainShort: '刚才那个，是短歇——<br>像眨一次长眼，随时来一下',
    explainNap: '累得深了，还可以小睡一会儿<br>——闭眼久一点，歇得更透',
    pickPrompt: '小睡多久，你自己定',
    pickDone: '好了',
    outro: '好了，我记住了，之后我就<br>住在屏幕顶端的岛里陪着你',
    brand: '<span class="ob__brand-name">EyeFlow</span>守护你看清世界的方式',
  },
  en: {
    hello: "Hi, I'm Mira",
    intro1: 'I live in the corner of your screen,<br>out of your way',
    intro2: "When you've looked too long,<br>I'll nudge you — rest, look far",
    tryIntro: "Let's try it once, together",
    tryBtn: "Okay, let's try",
    fade: 'Look too long and<br>the glow slowly fades',
    restNow: 'So take a break —<br>look far, and watch it come back',
    afterRest: 'There —<br>a little clearer now?',
    explainShort: 'That was a short break —<br>like one long blink, anytime',
    explainNap: 'More worn out? Take a nap —<br>eyes closed longer, rest deeper',
    pickPrompt: 'How long to nap is up to you',
    pickDone: 'Done',
    outro: "Got it. From now on I'll<br>be in the island up top, with you",
    brand: '<span class="ob__brand-name">EyeFlow</span> — keeping the world clear to you',
  },
};

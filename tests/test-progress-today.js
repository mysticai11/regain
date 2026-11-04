const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Testing Progress Screen, Week Strip Override & Today Screen Overhaul ---');

// 1. Progress Screen: Workout History Presentation
assert.ok(html.includes('class="history-session-details"'), 'Sessions must use history-session-details (collapsed by default)');
assert.ok(html.includes('.history-session-header'), 'History session header CSS class must exist');
assert.ok((html.includes('min-height: 64px') || html.includes('min-height:64px')) && (html.includes('background: #141416') || html.includes('background:#141416')) && (html.includes('border-radius: 12px') || html.includes('border-radius:12px')), 'Session header must be 64px filled bar #141416 with 12px radius');
assert.ok(html.includes('margin-bottom: 24px'), 'Sessions must have 24px gap between them');
assert.ok(html.includes('history-chevron'), 'Chevron with rotation on open must exist');
assert.ok(html.includes('\\u00A0') || html.includes('&nbsp;') || html.includes('\u00A0'), 'Orphan prevention on titles must be present');
assert.ok(html.includes('white-space: nowrap') && html.includes('sets'), 'Stats text ("50 min · 13 sets") must not wrap');
assert.ok(html.includes('border-radius:50%;background:#C6F432;display:inline-block"></span>PR') || html.includes('color:#C6F432;font-weight:700">•</span> PR'), 'PR with lime dot must be shown for session PRs');
const workoutHistoryCode = html.slice(html.indexOf('function workoutHistoryHTML()'), html.indexOf('function renderProgressSimple()'));
assert.ok(!workoutHistoryCode.includes('Best \' + maxW'), 'Generic Best kg label must be dropped from workout history');

// 2. Progress Screen: Chart & Tab Bar
assert.ok(html.includes('height: 120px') || html.includes('height:120px') || html.includes('viewBox="0 0 340 120"') || html.includes('height: 110px'), 'Chart height must be <= 120px');
assert.ok(html.includes('stroke="#F5F5F4"') && html.includes('<circle'), 'Chart must render visible line with dots per weigh-in');
assert.ok(html.includes('padding-bottom: max(10px, env(safe-area-inset-bottom, 10px))'), 'Tab bar safe area padding must prevent cutoff');

// 3. Week strip & Manual Workout Selection
assert.ok(html.includes('data-pick-today-strip-date'), 'Week strip cells must be tappable with date key');
assert.ok(html.includes('openWorkoutOverrideSheet'), 'Workout override sheet function must exist');
assert.ok(html.includes('Choose workout for'), 'Sheet title must say "Choose workout for [Date]"');
assert.ok(html.includes('Suggested'), 'Suggested workout must be labeled "Suggested"');
assert.ok(html.includes('Rest day'), 'Sheet must include a Rest day option');
assert.ok(html.includes('id="changeWorkoutBtn"'), 'Change white text action must exist on Today workout block');
assert.ok(html.includes('id="resetSuggestedWorkoutBtn"'), 'Reset to suggested action must exist when override is present');
assert.ok(html.includes('targetRec.selectedWorkout = null') && html.includes('targetRec.selectedWorkout = parseInt'), 'Override must save targetRec.selectedWorkout for that date only');

// Strip dots: trained = white, selected day = ring, today = white filled
assert.ok(html.includes('border:1.5px solid #F5F5F4;background:transparent') || html.includes('border: 1.5px solid #F5F5F4'), 'Selected untrained day dot must be a ring');
assert.ok(html.includes('background:#F5F5F4'), 'Trained or today dot must be white filled');

// 4. Today Screen: Plain lists, Bodyweight 48px/15px, No Start Glow, Food Name 2 lines
const todayRenderCode = html.slice(html.indexOf('function renderTodaySimple()'), html.indexOf('function renderApp()'));
assert.ok(!todayRenderCode.includes('class="glass-card"'), 'Today screen food and staples must not use glass-card');
assert.ok(!todayRenderCode.includes('Recent foods</div>'), 'Duplicate Recent foods must not appear on Today screen');
assert.ok(html.includes('font-size:48px') && html.includes('15px') && html.includes('kg</span>'), 'Bodyweight 48px number and 15px kg baseline-aligned');
assert.ok(html.includes('-webkit-line-clamp:2'), 'Food names must allow 2 lines max with no cutoff ellipsis');
assert.ok(html.includes('box-shadow:none') || html.includes('box-shadow: none'), 'Start button glow must be removed');
assert.ok(html.includes('background:#C6F432;color:#0B0B0C'), 'Start button pure lime #C6F432 and dark text');

console.log('✓ All Progress Screen, Week Strip Override, and Today Screen assertions passed with 100% success!');

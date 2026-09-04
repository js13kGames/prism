// Dev helper: node tools/mobile.mjs — phone-viewport screenshots of the select grid and the Spectrum HUD.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const srv = spawn('node', ['dev.js'], { env: { ...process.env, PORT: '8094' }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), p = await ctx.newPage();
await p.goto('http://localhost:8094/'); await p.waitForTimeout(400);
await p.evaluate(() => localStorage.prism26_progress = JSON.stringify({ done: Array(29).fill(1), stars: [1, 0, 1], snd: 1 }));
await p.reload(); await p.waitForTimeout(300);
await p.click('[data-a=go]'); await p.waitForTimeout(200); await p.screenshot({ path: 'test-results/v2-mobile-select.png' });
await p.click('[data-a=lv][data-v="26"]'); await p.waitForTimeout(200); await p.screenshot({ path: 'test-results/v2-mobile-draw.png' });
await b.close(); srv.kill();

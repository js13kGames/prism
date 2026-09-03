Your game must not exceed 13KB
Your game's code and assets must be zipped into a .zip archive with ≤ 13,312 bytes\*.

The archive must contain an index.html file in the top level directory, and it must work in the browser once unzipped, allowing your game to be played straight away.

- 13 × 1024. And yes, you are technically correct — those are kibibytes (KiB).

No external resources
All game assets, data and code must be contained in your .zip.

Specific categories (like WebXR) may allow fine-grained exceptions, but reliance on external assets will exclude your game from the overall ranking.

Theme: Unicorns and Rainbows
The theme is a rating criterion and impacts your score, but you are free to interpret and implement it however you think is best.

Categories
Our 2 base categories, Desktop and Mobile, are fully covered by these rules. You can also compete in categories which have their own extra rules:

Online
WebXR
Some rules can be mutually exclusive. When you're uncertain — just ask.
Use the source, Luke!
The competition focuses on size, but we value knowledge sharing just as much. The submission form will ask you to provide two sources of your game:

Playable: your zipped game package,
Readable: a GitHub repository with readable, unmangled source code.
Your repository should contain the entire source code needed to actually build your game — not just an unzipped version of it. We clone that repository for posteriority under the js13kGames organization on GitHub as a learning resource for others. You are free to continue working on your game past its submission (we'll have a snapshot of the version you submitted).

Make sure it works
Your game must work and be playable in at least two browsers: latest Chrome and Firefox. There must be no console errors.

Other errors during gameplay can negatively affect your ratings as voters take them into account, but will not disqualify your game.

Be neighbourly
Be mindful of shared resources and only touch data you are sure is yours. Games on our site share the same origin, so if you use localStorage — prefix your keys with a unique namespace. Do not use localStorage.clear() as it would affect all games.

New content only
Do not submit old games or demos. You have a whole month to work on something creative, and that's more than enough time. Verbatim Breakout or Flappy Bird clones out of tutorials defeat the purpose of actual learning and are frowned upon by our community (which will reflect in poor ratings for your game). Cool, fresh ideas — even lacking in technical finesse — are in turn a very welcome sight.

You can, however, enrich your game with already existing content and resources, as long as you have the (legal) right to use them and it's in line with all other rules.

Licensing
You must have the rights to use and publish every asset used in your game. We are generally lenient — except when it comes to violations of the rights of others.

At the same time we'll do our best to help you protect your rights: please report anyone who distributes your game without your consent. For the legalese, see Copyright ownership.

Teams
You can work on your game with anyone you want. Just remember that prizes are limited, so you'll have to share your trophies with your teammates. Naturally, everyone on your team should also conduct themselves excellently towards others.

Drafts & submissions
You can register a draft and preview your game live before you fully submit.

You may submit more than one game, but you can only have a single draft open at a time. Sending the same game as independent submissions targeting different platforms (e.g. separate desktop and mobile builds) is forbidden.

Acceptance
We review submissions manually, which can take a couple of days. We reserve the right to reject any submission without giving a reason, although we strive to let you resolve any issues instead of simply rejecting your game.

Deadlines
Submissions: 13 August, 13:00 CEST to 13 September 2026, 13:00 CEST
Unfinished: 14 September 2026
You may still submit your draft as unfinished. Unsubmitted drafts will be deleted otherwise.
Bugfixes: 14 September 2026
You may still still submit a PR to fix minor issues. Every change must be clearly documented in a GitHub pull request that will be manually reviewed. PRs containing new features will be rejected.
Voting: 14 September to 4 October 2026
You may still submit a PR to fix critical issues that prevent your game from being played or finished.
Code of conduct
All participants and judges at js13kGames are required to agree with the following code of conduct. Organizers will enforce this code throughout the online event. We are expecting cooperation from all participants to help ensure a safe environment for everybody.

js13kGames is dedicated to providing a harassment-free competition experience for everyone, regardless of gender, sexual orientation, disability, physical appearance, body size, race, or religion. We do not tolerate harassment of competition participants in any form. Competition participants violating these rules may be sanctioned or expelled from the competition at the discretion of the competition organizers.

TL;DR: Be excellent to each other.
For more details see Berlin Code of Conduct.

Copyright ownership
The following terms apply to participation in this competition ("Competition"). Entrants may create original solutions, prototypes, datasets, scripts, or other content, materials, discoveries or inventions (a “Submission”). The Competition is organized by the Competition Organizer. Entrants retain ownership of all intellectual and industrial property rights (including moral rights) in and to Submissions.

As a condition of submission, Entrant grants the Competition Organizer, its subsidiaries, agents and partner companies, a perpetual, irrevocable, worldwide, royalty-free, and non-exclusive license to use, reproduce, adapt, modify, publish, distribute, publicly perform, create a derivative work from, and publicly display the Submission.

Entrants provide submissions on an "as is" basis, without warranties or conditions of any kind, either express or implied, including, without limitation, any warranties or conditions of title, non-infringement, merchantability, or fitness for a particular purpose.

Privacy policy
By entering your personal data and sending a game through the submit form you agree to receive email communication about important events of the competition (like announcing the winners or sending out the digital prizes), but also curated content from our partners about their tools, services, or job offers. We will never share your personal data with anyone, though.

The GDPR defines certain rights of EU citizens with regards to their personal data, but we extend those to all visitors regardless of their location. Simply get in touch via contact@js13kgames.com and your registered e-mail\*:

Access – You can request more information about the personal data we hold about you and request a copy of it;
Rectification and erasure – If you believe that any personal data we hold about you is incorrect or incomplete, or simply wish to erase some or all of it from our systems, you can request such change;
Restriction and objection – You can ask us to restrict further processing of your personal data and prohibit certain data processing operations, such as the processing of your data for direct marketing purposes;
Portability – You can ask for a copy of your personal data in a machine-readable format. You can also request that we transmit the data to another entity where technically feasible;
Complaint – You have the right to lodge a complaint about our practices with respect to your personal data with the supervisory authority (Data Protection Authority) of your country;

- Note: Since the competition is run by a private individual and is not a business, local regulations do luckily not require us to keep your data on file for years. We purge all non-public personally identifiable data once physical prizes have been sent out to their recipients and only keep your e-mail address (as received from GitHub when you log in) on hand. This, however, also means that at minimum, in order for us to be able to verify you are who you claim you are, you need to get in touch with us through that same e-mail address.

Frequently asked questions
Why exactly 13KB?
Well... why not? :)
What's in it for you? Are you getting paid?
Nope, it's my own idea and it's made for pure fun. Sponsorships are very welcome, however, as I regularly spend my own money to cover t-shirts & swag, and worldwide shipping of the prizes etc.
What does "zipped" mean, exactly?
The game's package should be zipped with your usual system archiver. The only allowed format is .zip. It should unpack on any platform without problems.
Can I use Flash/some other proprietary tech?
No, your game must run in a browser without requiring the player to install anything on their system (even a browser extension).
Can I use TypeScript, WebAssembly or Rust?
Yes, you can use any technology that either directly runs in the browser (JavaScript, WASM) or compiles to such — but the package you submit to the competition must only contain browser-runnable code (i.e. an actual HTML page, not a binary).
Can I use WebGL/WebGPU?
Sure, though it might be hard to fit it into 13 kilobytes if you plan on doing an FPS gam… oh, nevermind.
Can I use Google Fonts?
No, as those are external assets and violate rule #2. You are, however, allowed to ask users to live-load a web font to support some characters or emoji on devices that can't display them properly, but you have to make sure your game will work without them.

You can, naturally, use custom fonts if you manage to include them directly in your 13KB package.
Can I use Google Analytics/stat collection services?
No, as those are external services and violate rule #2. While you can, in theory, fit non-external tracking/metrics code in your package, there's little point to it, since you can only save that data client-side anyway. Furthermore, making sure your particular approach to tracking is in line with all privacy laws would be a nightmare to verify, which is why we forbid it altogether.
Do I have to register somewhere?
Yes, submitting your game requires an account on GitHub and using it to log in to our website. We expect your game's repository to reside on GitHub, after all.
How many games can I submit?
The limit is 13... just kidding, you can submit as many as you want.

The fine print
Rules
External resources
You are free to send data between players in your room however you wish, but all data must be generated by your game (i.e. by the code you submit as part of your 13KB .zip).

You can use user-generated content as input, but only if your game itself has been used to create that content (e.g. through a level editor).

Offline-first
Your game must work offline (e.g. be playable by a single player). Online features must be optional.

You can use PartySocket
You are free to import PartySocket from our server: partysocket.jsESM, v1.3.0 — no need to include it in your 13KB .zip.

While purely optional, Cloudflare's PartySocket provides some convenience (e.g. reconnects and buffering) on top of native WebSockets, and plays well with our relay, all powered by Cloudflare's Durable Objects.

Work in progress
This category is an experimental addition to js13kGames — its exact rules may change at any moment, although we will do our utmost to avoid this.

External library allowed
Special rule
All the base rules apply, with an exception to rule #2 — you can use A-Frame, Babylon.js, PlayCanvas or Three.js in your game.

It must be one of the versions hosted by us.

The fine print
Details
Libraries
Pick one of these versions:

A-Frame1.8.0 — use UMD
Babylon.js9.20.0 — use UMD
PlayCanvas2.21.3 — use UMD
Three.jsr185 — use ESM
Import them however you want (but don't bundle them with your game).

Don't worry if they load additional resources by default — but do not load any extra assets.
WebXR versus other categories
Games using any of these external libraries cannot simultaneously participate in any of our base categories (Desktop / Mobile).

Unless you avoid using any of the libraries, in which case you would be free to also compete in any of the other categories, on top of WebXR.

Hardware prize and video
The Meta Quest 3S is sponsored by the Meta Quest Japan team, and will be shipped directly from their office. You will have to pay all the necessary taxes if those get imposed on the package once delivered to your country.

We would also like to get a video of the winning game being played on the device when it arrives.

Category
Wavedash
Deploy and publish your game on Wavedash to be eligible for prizes, the winners will be judged by the Wavedash founders.

Rewards
Prizes
Grand prize: $750 ($600 cash, $150 Wavedash Credit)
Runner-up prize: $500 ($400 cash, $100 Wavedash Credit)
Third place: $250 ($150 cash, $100 Wavedash Credit)
In addition, every Wavedash challenge participant that satisfies all requirements and publishes a game on Wavedash will receive $10 in Wavedash Credit.

The fine print
Details
Extra week
The deadline for deploying and publishing your game on Wavedash is extended by 7 days, so you have time until September 20th to do that. Remember it's only for that purpose alone though - no adding extra features or bugfixing allowed.

Support on Discord
Learn more at docs.wavedash.com. Have questions? Support will be provided through Wavedash’s Discord.

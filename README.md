# rubigolo
[![Build Status](https://travis-ci.org/kubicle/rubigolo.svg?branch=develop)](https://travis-ci.org/kubicle/rubigolo)
[![Code Climate](https://codeclimate.com/github/kubicle/rubigolo/badges/gpa.svg)](https://codeclimate.com/github/kubicle/rubigolo)
[![Test Coverage](https://codeclimate.com/github/kubicle/rubigolo/badges/coverage.svg)](https://codeclimate.com/github/kubicle/rubigolo/coverage)

Game of Go (weiqi, igo, baduk), originally started in Ruby (hence the name), then translated to Javascript... In development, of course. 

- [run it](http://rawgit.com/kubicle/rubigolo/master/index.html) in your browser.
- [run tests](http://rawgit.com/kubicle/rubigolo/master/js/ui/tests.html)

Old Ruby version: check the [help page](http://htmlpreview.github.io/?https://github.com/kubicle/rubigolo/blob/master/help-index.html)

Dependencies
============

- [WGo.js](http://github.com/waltheri/wgo.js) is included in the project
- Browserify, watchify, lessify are used for the build

How to build
============

```
npm install
npm start
```

=======

## December 2015 News
* Latest AI (Droopy) wins against old one (Frankie) around 95% of the time. Freezing Droopy as it is and starting a 3rd version from here; introducing Chuckie...
* Not much progres on the other fronts. Worked a bit on GTP but my access to OGS is not working. Thinking of trying KGS instead.
* Test status: AI tests: 6 TODOs, 58 tests, 158 checks (0 errors nor warnings but more TODOs in the code).

## October 2015 News
* Streamlined the tests and did the setup for [Travis CI](https://travis-ci.org/).
* Could measure the improvement of the AI: no idea about the outside world yet, but the new AI beats the old one around 80 times out of 100 on a 9x9. Much more things I want to improve, including many not so difficult ones (before coding they all look like this, actually... haha)
* Working on Go Text Protocol interface. Coming soon! I am impatient, see the 2 points below.
* The great folks at [OGS](http://online-go.com) gave me an access (kudos!) for my yet-to-be-plugged-in bot. This is very exciting. Their site looks great BTW, the best place I saw so far. Beside many other cool features, their tutorial for beginner is super neat and it starts automatically when you create an account (and say you never played before). Check it out!
* Found an online library of tests: the [Go Test Collection](https://webdocs.cs.ualberta.ca/~games/go/cgtc/). They can be run via GTP as well, so I cannot wait to plug them in... though I already have a very long list of improvements to do, even without finding how many of these tests the AI will happily fail!

## September 2015 News
* As planned, failing unit tests now show with a mini UI so investigation is possible on the spot. This has been helping quite a lot already to fix and improve the AI.
* The regular game UI has evolved quite a bit; playing on an Android phone screen is not too awkward. The look remains very basic as I am not planning to put much efforts in this area. Ah and we now use Less instead of old CSS.
* Reorganized the AI files (now including the board analyser) to a separate directory. Will keep snapshots of the AI whenever meaningful evolutions occur. Named the current version "Frankie". I will use it as a baseline to measure the future versions. Next evolving version is called "Droopy" (the slow dog, you know...)
* AI has made moderate progress in various areas, the main change being the decommission of "Executioner": Hunter is now in charge of the chases in general, so it can do it better. Some more improvements and refactoring in the pipe around group life&death evaluation.
* Added the repo to CodeClimate, yay! Will adjust ESLint settings soon.
* Test status: AI tests: 9 FIXME, 37 tests, 91 checks, exceptions: 0, failed: 1, warnings: 1

## July 2015 News
* Brand new UI using [WGo.js](http://github.com/waltheri/wgo.js). I think around 30% of the UI work is done at this point.
* Re-started the interesting work on AI. Most of the new code and changes so far are about identifying groups, dead groups, "brother" groups, etc. for score counting and position evaluation.
* Worked on the unit tests: we have more of them, they are clearer to read, and it is easier to add new ones. More work is needed: the goal is to have easier ways to interpret the result of failing tests. Until now, failures gave only a text log, very tiring to analyze. I plan to use the UI to show errors.

## April 2015 News
This project is still moving, on and off, depending how much time I can spend on it.

* JavaScript: I diverted quite a bit of effort into [babyruby2js](http://rawgit.com/kubicle/babyruby2js). The result is now nearly working. At this point the JS code does exactly what the ruby code does - for the core of the game, since the UI in JS will bring a new load of fun here. It is time to say goodbye (or at least "see you later") to Ruby. The unit tests are now passing in JS (or failing at the same place the ruby ones are failing). The speed increased by a factor 2 to 10, depending on the test.
* AI did not evolve at this point. Hopes are much lower than before but I did not give up yet and will not, at least until next time I manage to get another chunk of efforts at it.
* Gave up the "more than 2 players" option. This made the code more complex and does not seem to make sense because the rules would have to be different for a balance/strategy to be possible and interesting.
* No progress on the UI yet. Javascript is the way to go.

## Older news (2014)
This project is paused at this time.
* Score counting is working not too bad.
* Very basic AI. We still have some ambition for this part, or at least we hope to have fun trying to make it better!
* Thought about implementing GTP - one day...

## Even older news (2013)
Main missing features are staggering:
* No AI so you cannot play against the program. We have a huge ambition for this part, or at least are planning to have a hell of a fun trying to build it!
* No internet remote server ability. This can be another fun part to add. Note that if it works one day we would really like to see a game happen between 3 or 4 players, since this is an added feature that we were curious about.
* No real GUI yet. The simplistic GUI you can access by using the links below has the convenient advantage to allow us to test the program using a mouse instead of entering all the moves in console mode... This is why it was coded.
* Mmm... Thinking a bit, we are also missing a score counting feature, and probably a bunch of other things I cannot think of right now. Life is fun! :)

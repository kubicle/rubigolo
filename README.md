# rubigolo

Game of Go (weiqi, igo, baduk, etc.), originally started in Ruby (hence the name), then translated to Javascript... In development, of course. 

- [run it](http://rawgit.com/kubicle/rubigolo/master/index.html) in your browser.
- [unit tests](http://rawgit.com/kubicle/rubigolo/master/js/ui/tests.html)
[![Code Climate](https://codeclimate.com/github/kubicle/rubigolo/badges/gpa.svg)](https://codeclimate.com/github/kubicle/rubigolo)

Old Ruby version: check the [help page](http://htmlpreview.github.io/?https://github.com/kubicle/rubigolo/blob/master/help-index.html)

Dependencies
============

- [WGo.js](http://github.com/waltheri/wgo.js) is included in the project
- Browserify, watchify, lessify are used for the build

How to build
============

npm install
npm start

=======

## July 2015 News
* Brand new UI using [WGo.js](http://github.com/waltheri/wgo.js). I think around 30% of the UI work is done at this point.
* Re-started the interesting work on AI. Most of the new code and changes so far are about identifying groups, dead groups, "brother" groups, etc. for score counting and position evaluation.
* Worked on the unit tests: we have more of them, they are clearer to read, and it is easier to add new ones. More work is needed: the goal is to have easier ways to interpret the result of failing tests. Until now, failures gave only a text log, very tiring to analyze. I plan to use the UI to show errors.

## April 2015 News
This project is still moving, on and off, depending how much time I can spend on it.

* JavaScript: I diverted quite a bit of effort into "babyruby2js" (same repo). The result is now nearly working. At this point the JS code does exactly what the ruby code does - for the core of the game, since the UI in JS will bring a new load of fun here. It is time to say goodbye (or at least "see you later") to Ruby. The unit tests are now passing in JS (or failing at the same place the ruby ones are failing). The speed increased by a factor 2 to 10, depending on the test.
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

require 'trollop'

require_relative "logging"
require_relative "game_logic"
require_relative "score_analyser"
require_relative "ai1_player"
require_relative "console_human_player"

class ConsoleGame

	# Create game & players
	def initialize(opts)
		@game = GameLogic.new
		@game.messages_to_console(true)
		@game.new_game(opts[:size], opts.handicap)
		@goban = @game.goban
		@players = []
		2.times do |color|
  		@players[color] = opts.ai>color ? Ai1Player.new(@goban,color) : ConsoleHumanPlayer.new(@goban,color)
		end
		@game.load_moves(opts.load) if opts.load
		# if no human is playing we create one to allow human interaction
		@spectator = opts.ai >= 2 ? ConsoleHumanPlayer.new(@goban,-1) : nil
    @scorer = ScoreAnalyser.new
	end

  # Show prisoner counts during the game  
  def show_prisoners
    prisoners = @game.prisoners?
    prisoners.size.times do |c|
      puts "#{prisoners[c]} #{Grid::COLOR_NAMES[c]} (#{Grid::COLOR_CHARS[c]}) are prisoners"
    end
    puts ""
  end
  
	def propose_console_end
    text = @scorer.compute_score(@goban, @game.komi, @game.who_resigned)
    puts @goban.scoring_grid.to_text { |c| Grid::COLOR_CHARS[c] }
  	text.each { |line| puts line }

	  # We ask human players; AI always accepts
	  @players.each do |player|
		  if player.is_human and !player.propose_score
			  # Ending refused, we will keep on playing
			  @game.accept_ending(false)
			  return
		  end
	  end
    @game.accept_ending(true)
	end

	def get_move_or_cmd
		if !@spectator or @num_autoplay > 0
		  @num_autoplay -= 1
		  return @players[@game.cur_color].get_move
		else
		  return @spectator.get_move(@game.cur_color)
		end
	end

	def play_move_or_cmd(move)
    if move.start_with?("cont")
      @num_autoplay = move.split(":")[1].to_i
      @num_autoplay = 1 if @num_autoplay == 0 # no arg is equivalent to continue:1
    elsif move.start_with?("pris")
      show_prisoners
    elsif move.start_with?("hist")
    	puts @game.history_string
    elsif move == "dbg" then
      @goban.debug_display
    elsif move == "help" then # this help is for console only
      puts "Move (e.g. b3) or pass, undo, resign, history, dbg, log:(level)=(1/0), load:(moves), continue:(times)"
      puts "Four letter abbreviations are accepted, e.g. \"hist\" is valid to mean \"history\""
    else
	    @game.play_one_move(move)
	  end
	end

	def play_game
		@num_autoplay = 0
		while ! @game.game_ended
		  if @game.game_ending
		    propose_console_end
		    next
		  end
		  move = get_move_or_cmd
		  play_move_or_cmd(move)
		end
		puts "Game ended."
		puts @game.history_string
	end

end

opts = Trollop::options do
  opt :size, "Goban size", :default => 9
  opt :ai, "How many AI players", :default => 2
  opt :handicap, "Number of handicap stones", :default => 0
  opt :load, "Game to load like e4,c3,d5", :type => :string
end
puts "Command line options received: #{opts}"

# Start the game
ConsoleGame.new(opts).play_game

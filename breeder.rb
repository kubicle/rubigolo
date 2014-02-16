require 'trollop'

require_relative "logging"
require_relative "time_keeper"
require_relative "game_logic"
require_relative "score_analyser"
require_relative "ai1_player"

$debug_breed = false # TODO move me somewhere else?

class Breeder

  GENERATION_SIZE = 26 # must be even number
  MUTATION_RATE = 0.03 # e.g. 0.02 is 2%
  WIDE_MUTATION_RATE = 0.10 # how often do we "widely" mutate
  KOMI = 4.5
  TOO_SMALL_SCORE_DIFF = 3 # if final score is less that this, see it as a tie game

  def initialize(game_size)
    @size = game_size
    @timer = TimeKeeper.new
    @timer.calibrate(0.7)
    @game = GameLogic.new
    @game.messages_to_console(true)
    @game.set_log_level("all=0")
    @game.new_game(@size)
    @goban = @game.goban
    @players = [Ai1Player.new(@goban, BLACK), Ai1Player.new(@goban, WHITE)]
    @scorer = ScoreAnalyser.new
    @gen_size = GENERATION_SIZE
    first_generation
  end

  def first_generation
    @control_genes = @players[0].genes.clone
    @generation = []
    @new_generation = []
    @gen_size.times do |i|
      @generation.push(@players[0].genes.clone.mutate_all!)
      @new_generation.push(Genes.new)
    end
    @score_diff = []
  end
  
  def play_until_game_ends
    while ! @game.game_ending
      cur_player = @players[@game.cur_color]
      move = cur_player.get_move
      begin
        @game.play_one_move(move)
      rescue StandardError => err
        puts "#{err}"
        puts "Exception occurred during a breeding game.\n#{cur_player} with genes: #{cur_player.genes}"
        puts @game.history_string
        raise
      end
    end
  end

  # Plays a game and returns the score difference in points
  def play_game(name1,name2,p1,p2)
    # @timer.start("AI VS AI game",0.5,3)
    @game.new_game(@size,0,KOMI)
    @players[0].prepare_game(p1)
    @players[1].prepare_game(p2)
    play_until_game_ends
    score_diff = @scorer.compute_score_diff(@goban, KOMI)
    # @timer.stop(false) # no exception if it takes longer but an error in the log
    $log.debug("\n##{name1}:#{p1}\nagainst\n##{name2}:#{p2}") if $debug_breed
    $log.debug("Distance: #{'%.02f' % p1.distance(p2)}") if $debug_breed
    $log.debug("Score: #{score_diff}") if $debug_breed
    $log.debug("Moves: #{@game.history_string}") if $debug_breed
    @goban.console_display if $debug_breed
    return score_diff
  end

  def run(num_tournaments, num_match_per_ai)
    num_tournaments.times do |i| # TODO: Find a way to appreciate the progress
      @timer.start("Breeding tournament #{i+1}/#{num_tournaments}: each of #{@gen_size} AIs plays #{num_match_per_ai} games",5.5,36)
      one_tournament(num_match_per_ai)
      @timer.stop(false)
      reproduction
      control
    end
  end
  
  # NB: we only update score for black so komi unbalance does not matter.
  # Sadly this costs us a lot: we need to play twice more games to get score data...
  def one_tournament(num_match_per_ai)
    $log.debug("One tournament starts for #{@generation.size} AIs") if $debug_breed
    @gen_size.times { |p1| @score_diff[p1] = 0 }
    num_match_per_ai.times do
      @gen_size.times do |p1|
        p2 = rand(@gen_size - 1)
        p2 = @gen_size - 1 if p2 == p1
        diff = play_game(p1.to_s,p2.to_s,@generation[p1],@generation[p2])
        if diff.abs < TOO_SMALL_SCORE_DIFF
          diff = 0
        else
          diff = diff.abs / diff # get sign of diff only -> -1,+1
        end
        # diff is now -1, 0 or +1
        @score_diff[p1] += diff
        $log.debug("Match ##{p1} against ##{p2}; final scores ##{p1}:#{@score_diff[p1]}, ##{p2}:#{@score_diff[p2]}") if $debug_breed
      end
    end
    
    @rank
  end
  
  def reproduction
    $log.debug("=== Reproduction time for #{@generation.size} AI") if $debug_breed
    @picked = Array.new(@gen_size,0)
    @max_score = @score_diff.max
    @winner = @generation[@score_diff.find_index(@max_score)]
    @pick_index = 0
    0.step(@gen_size-1,2) do |i|
      parent1 = pick_parent
      parent2 = pick_parent
      parent1.mate(parent2, @new_generation[i], @new_generation[i+1], MUTATION_RATE, WIDE_MUTATION_RATE)
    end
    @gen_size.times { |i| $log.debug("##{i}, score #{@score_diff[i]}, picked #{@picked[i]} times") } if $debug_breed
    # swap new generation to replace old one
    swap = @generation
    @generation = @new_generation
    @new_generation = swap
    @generation[0] = @winner # TODO review this; we force the winner (a parent) to stay alive
  end

  def pick_parent
    while true
      i = @pick_index
      @pick_index = ( @pick_index + 1 ) % @gen_size
      if rand < @score_diff[i] / @max_score
        @picked[i] += 1
        # $log.debug("Picked parent #{i} (score #{@score_diff[i]})") if $debug_breed
        return @generation[i]
      end
    end
  end
  
  def control
    previous = $debug_breed
    $debug_breed = false
    num_control_games = 30
    $log.debug("Playing #{num_control_games * 2} games to measure the current winner against our control AI...")
    total_score = num_wins = num_wins_w = 0
    num_control_games.times do
      score = play_game("control","winner",@control_genes,@winner)
      score_w = play_game("winner","control",@winner,@control_genes)
      num_wins += 1 if score>0
      num_wins_w += 1 if score_w<0
      total_score += score - score_w
    end
    $debug_breed = true
    $log.debug("Average score: #{total_score/num_control_games}") if $debug_breed
    $log.debug("Winner genes: #{@winner}") if $debug_breed
    $log.debug("Distance between control and current winner genes: #{'%.02f' % @control_genes.distance(@winner)}") if $debug_breed
    $log.debug("Total score of control against current winner: #{total_score} (out of #{num_control_games*2} games, control won #{num_wins} as black and #{num_wins_w} as white)") if $debug_breed
    $debug_breed = previous
  end

  # Play many games AI VS AI to verify black/white balance
  def bw_balance_check(num_games,size)
    @timer.start("bw_balance_check", num_games/1000.0*50, num_games/1000.0*512)
    $log.debug("Checking black/white balance by playing #{num_games} games (komi=#{KOMI})...")
    total_score = num_wins = 0
    num_games.times do
      score = play_game("control","control",@control_genes,@control_genes)
      num_wins += 1 if score>0
      raise "tie game?!" if score == 0
      total_score += score
    end
    @timer.stop(false) #size == 9) # if size is not 9 our perf numbers are of course meaningless
    $log.debug("Average score of control against itself: #{total_score/num_games}")
    $log.debug("Out of #{num_games} games, black won #{num_wins} times")
    return num_wins
  end

end

if ! $test_all and ! $test
  opts = Trollop::options do
    opt :size, "Goban size", :default => 9
    opt :num_tour, "Number of tournaments", :default => 2
    opt :match_per_ai, "Number of matches per AI per tournament", :default => 3
  end
  
  breeder = Breeder.new(opts[:size])
  breeder.run(opts[:num_tour], opts[:match_per_ai])
end

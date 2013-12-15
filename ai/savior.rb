# Saviors rescue ally groups in atari

require_relative "heuristic"
require_relative "hunter"

class Savior < Heuristic

  def initialize(player)
    super
    @enemy_hunter = Hunter.new(player,true)
  end
  
  def init_color
    super
    @enemy_hunter.init_color
  end

  def eval_move(i,j)
    stone = @goban.stone_at?(i,j)
    threat = support = 0
    group = nil
    stone.unique_allies(@color).each do |g|
      if g.lives == 1
        threat += g.stones.size
        group = g # usually only 1 is found but it works for more
      else
        support += g.lives - 1
      end
    end
    return 0 if threat == 0 # no threat
    support += stone.num_empties?
    $log.debug("Savior heuristic looking at #{i},#{j}: threat is #{threat}, support is #{support}") if $debug
    return 0 if support < 2  # nothing we can do here
    if support == 2
      # when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
      return 0 if @enemy_hunter.atari_is_caught?(group)
    end
    $log.debug("=> Savior heuristic thinks we can save a threat of #{threat} in #{i},#{j}") if $debug
    return threat
  end

end

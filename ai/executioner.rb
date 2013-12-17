# Executioner only preys on enemy groups in atari

require_relative "heuristic"

class Executioner < Heuristic

  def initialize(player)
    super
  end

  def eval_move(i,j)
    stone = @goban.stone_at?(i,j)
    threat = 0
    stone.unique_enemies(@color).each do |g|
      threat += g.stones.size if g.lives == 1
    end
    $log.debug("Executioner heuristic found a threat of #{threat} at #{i},#{j}") if $debug and threat>0
    return threat
  end

end

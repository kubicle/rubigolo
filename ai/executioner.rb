# Executioner only preys on enemy groups in atari

require_relative "heuristic"

class Executioner < Heuristic

  def initialize(player)
    super
  end

  def eval_move(i,j)
    stone = @goban.stone_at?(i,j)
    threat = saving = 0
    stone.unique_enemies(@color).each do |g|
      next if g.lives > 1 # NB: more than 1 is a job for hunter
      threat += g.stones.size
      g.all_enemies.each do |ally|
        next if ally.lives > 1
        saving += ally.stones.size
      end
    end
    return 0 if threat == 0
    $log.debug("Executioner heuristic found a threat of #{threat} at #{i},#{j}") if $debug
    $log.debug("...this would also save #{saving}") if $debug and saving > 0
    return threat + saving
  end

end

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
    threat = eval_escape(i,j,stone)
    $log.debug("=> Savior thinks we can save a threat of #{threat} in #{i},#{j}") if $debug and threat>0
    return threat
  end

private

  def eval_escape(i,j,stone)
    threat = lives_added = 0
    stone.unique_allies(@color).each do |g|
      new_threat = nil
      if g.lives == 1
        # NB: if more than 1 group in atari, they merge if we play this "savior" stone
        new_threat = g.stones.size
      elsif g.lives == 2
        $log.debug("Savior asking hunter to look at #{i},#{j}: pre-atari on #{g}") if $debug
        new_threat = @enemy_hunter.eval_move(i,j)
      end
      if !new_threat
        lives_added += g.lives - 1
      else
        threat += new_threat
      end
    end
    return 0 if threat == 0 # no threat
    lives_added += stone.num_empties?
    # $log.debug("Savior looking at #{i},#{j}: threat is #{threat}, lives_added is #{lives_added}") if $debug
    return 0 if lives_added < 2  # nothing we can do here
    if lives_added == 2
      # when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
      $log.debug("Savior asking hunter to look at #{i},#{j}: threat=#{threat}, lives_added=#{lives_added}") if $debug
      Stone.play_at(@goban,i,j,@color)
      is_caught = @enemy_hunter.escaping_atari_is_caught?(stone)
      Stone.undo(@goban)
      if is_caught
        $log.debug("Savior giving up on threat of #{threat} in #{i},#{j}") if $debug
        return 0
      end
    end
    return threat
  end

end

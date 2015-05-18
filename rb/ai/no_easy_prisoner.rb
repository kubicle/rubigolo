# Should recognize when our move is foolish...

require_relative "heuristic"
require_relative "hunter"

class NoEasyPrisoner < Heuristic

  def initialize(player)
    super
    set_as_negative
    @enemy_hunter = Hunter.new(player,true)
  end

  def init_color
    super
    @enemy_hunter.init_color
  end

  def eval_move(i,j)
    # NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    # be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).
    stone = Stone.play_at(@goban,i,j,@color)
    g = stone.group
    score = 0
    if g.lives == 1
      score = - g.stones.size
      $log.debug("NoEasyPrisoner says #{i},#{j} is plain foolish (#{score})") if $debug
    elsif g.lives == 2
      $log.debug("NoEasyPrisoner asking Hunter to look at #{i},#{j}") if $debug
      if @enemy_hunter.escaping_atari_is_caught?(stone)
        score = - g.stones.size
        $log.debug("NoEasyPrisoner (backed by Hunter) says #{i},#{j} is foolish  (#{score})") if $debug
      end
    end
    Stone.undo(@goban)
    return score
  end

end

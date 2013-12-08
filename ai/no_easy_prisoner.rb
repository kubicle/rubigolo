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
    begin
      stone = Stone.play_at(@goban,i,j,@color)
      g = stone.group
      score = - g.stones.size
      if g.lives == 1
        $log.debug("NoEasyPrisoner heuristic says #{i},#{j} is plain foolish (#{score})") if $debug
        return score
      end
      if g.lives == 2
        if @enemy_hunter.escaping_atari_is_caught?(stone)
          $log.debug("NoEasyPrisoner heuristic (backed by Hunter) says #{i},#{j} is foolish  (#{score})") if $debug
          return score
        end
      end
      return 0 # "all seems fine with this move"
    ensure
      Stone.undo(@goban)
    end
  end

end

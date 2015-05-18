# Basic: a move that connects 2 of our groups is good.
# TODO: this could threaten our potential for keeping eyes, review this.

require_relative "heuristic"

class Connector < Heuristic

  def initialize(player)
    super
    @infl_coeff = get_gene("infl", 0.07, 0.01, 0.5)
    @ally_coeff1 = get_gene("ally-1enemy", 0.33, 0.01, 1.0)
    @ally_coeff2 = get_gene("ally-more-enemies", 1.66, 0.01, 3.0)
  end

  def eval_move(i,j)
    # we care a lot if the enemy is able to cut us,
    # and even more if by connecting we cut them...
    # TODO: the opposite heuristic - a cutter; and make both more clever.
    stone = @goban.stone_at?(i,j)
    enemies = stone.unique_enemies(@color)
    num_enemies = enemies.size
    allies = stone.unique_allies(@color)
    num_allies = allies.size
    return 0 if num_allies < 2 # nothing to connect here
    return 0 if num_allies == 3 and num_enemies == 0 # in this case we never want to connect unless enemy comes by
    return 0 if num_allies == 4
    if num_allies == 2
      s1 = s2 = nil; non_unique_count = 0
      stone.neighbors.each do |s|
        s1 = s if s.group == allies[0]
        s2 = s if s.group == allies[1]
        non_unique_count += 1 if s.color == @color
      end
      return 0 if non_unique_count == 3 and num_enemies == 0
      # Case of diagonal (strong) stones (TODO: handle the case with a 3rd stone in same group than 1 or 2)
      if non_unique_count == 2 and s1.i != s2.i and s1.j != s2.j
        # No need to connect if both connection points are free
        return 0 if @goban.empty?(s1.i,s2.j) and @goban.empty?(s2.i,s1.j)
      end
    end
    case num_enemies
    when 0 then eval = @infl_coeff / @inf.map[j][i][@color]
    when 1 then eval = @ally_coeff1 * num_allies
    else eval = @ally_coeff2 * num_allies
    end
    $log.debug("Connector gives #{'%.2f' % eval} to #{i},#{j} (allies:#{num_allies} enemies: #{num_enemies})") if $debug
    return eval
  end

end

# Quite a dumb way of "pushing" our influence further...

require_relative "heuristic"

class Pusher < Heuristic

  def initialize(player)
    super
    @ally_coeff = get_gene("ally-infl", 0.1, 0.01, 4.0)
    @enemy_coeff = get_gene("enemy-infl", 0.4, 0.01, 4.0)
  end

  def eval_move(i,j)
    stone = @goban.stone_at?(i,j)
    inf = @inf.map[j][i]
    enemy_inf = 0
    @enemy_colors.each { |c| enemy_inf += inf[c] }
    ally_inf = inf[@color]
    
    return 0 if enemy_inf == 0 or ally_inf == 0
    score = 0.33 * (@enemy_coeff * enemy_inf - @ally_coeff * ally_inf)
    $log.debug("Pusher heuristic sees influences #{ally_inf} - #{enemy_inf} at #{i},#{j} -> #{'%.03f' % score}") if $debug
    return score
  end

end

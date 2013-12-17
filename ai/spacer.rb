# Vague idea that playing where we already have influence is moot.

require_relative "heuristic"

class Spacer < Heuristic

  def initialize(player)
    super
    @infl_coeff = get_gene("infl", 2.0, 0.0, 8.0)
    @corner_coeff = get_gene("corner", 2.0, 0.0, 8.0)
  end

  def eval_move(i,j)
    enemy_inf = ally_inf = 0
    stone = @goban.stone_at?(i,j)
    
    inf = @inf.map[j][i]
    @enemy_colors.each { |c| enemy_inf += inf[c] }
    ally_inf += inf[@color]
    
    stone.neighbors.each do |s|
      inf = @inf.map[s.j][s.i]
      @enemy_colors.each { |c| enemy_inf += inf[c] }
      ally_inf += inf[@color]
    end
    total_inf = enemy_inf + ally_inf

    corner = 3
    db_x = distance_from_border(i)
    db_y = distance_from_border(j)
    dc_x = 1 + (db_x - corner).abs
    dc_y = 1 + (db_y - corner).abs
    dc = dc_x + dc_y
  
    # hacky: why play on border if no one is around?
    total_inf += (20*(2 - db_x))/(total_inf+1) if db_x<2
    total_inf += (20*(2 - db_y))/(total_inf+1) if db_y<2

    return 1.33 / (total_inf * @infl_coeff + dc * @corner_coeff +1)
  end    
  
  def distance_from_border(n)
    if n - 1 < @size - n then return n - 1 else return @size - n end
  end

end

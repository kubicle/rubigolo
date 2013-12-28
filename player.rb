class Player

  attr_reader :goban, :color, :is_human

  def initialize(is_human, goban)
    @is_human = is_human
    @goban = goban
  end
  
  def set_color(color)
    @color = color
  end
  
end

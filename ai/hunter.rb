# Hunters find threats to struggling enemy groups.
# Ladder attack fits in here.

require_relative "heuristic"

class Hunter < Heuristic

  def initialize(player,consultant=false)
    super
  end

  def eval_move(i,j,level=1)
    stone = @goban.stone_at?(i,j)
    threat = 0
    stone.unique_enemies(@color).each do |g|
      next if g.lives != 2
      next if 1 == g.all_enemies.each { |e| break(1) if e.lives < g.lives }
      $log.debug("Hunter heuristic (level #{level}) looking at #{i},#{j} threat on #{g}") if $debug
      Stone.play_at(@goban,i,j,@color) # our attack takes one of the 2 last lives (the one in i,j)
      caught = atari_is_caught?(g,level)
      Stone.undo(@goban)
      threat += g.stones.size if caught
    end # each g
    $log.debug("Hunter heuristic found a threat of #{threat} at #{i},#{j}") if $debug and threat>0
    return threat
  end

  def atari_is_caught?(g,level=1)
    all_lives = g.all_lives
    raise "Unexpected: hunter #1: #{all_lives.size}" if all_lives.size != 1
    last_life = all_lives.first
    stone = Stone.play_at(@goban,last_life.i,last_life.j,g.color) # enemy's escape move
    begin
      return escaping_atari_is_caught?(stone,level)
    ensure
      Stone.undo(@goban)
    end
  end

  # stone is the atari escape move
  def escaping_atari_is_caught?(stone,level=1)
    g = stone.group
    return false if g.lives > 2
    return true if g.lives == 0
    # g.lives is 1 or 2
    stone.neighbors.each do |ally_threatened|
      next if ally_threatened.color != @color
      return false if ally_threatened.group.lives < g.lives
    end
    return true if g.lives == 1
    empties = stone.empties
    empties = g.all_lives if empties.size != 2
    raise "Unexpected: hunter #2" if empties.size != 2
    e1 = empties[0]; e2 = empties[1] # need to keep the empties ref since all_lives returns volatile content
    #  recursive descent
    $log.debug("Enemy has 2 lives left: #{e1} and #{e2}") if $debug
    return (eval_move(e1.i,e1.j,level+1) > 0 or eval_move(e2.i,e2.j,level+1) > 0)
  end
  
end

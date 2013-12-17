# Hunters find threats to struggling enemy groups.
# Ladder attack fits in here.

require_relative "heuristic"

class Hunter < Heuristic

  def initialize(player,consultant=false)
    super
  end

  def eval_move(i,j,level=1)
    stone = @goban.stone_at?(i,j)
    empties = stone.empties
    allies = stone.unique_allies(@color)
    eg1 = eg2 = eg3 = nil
    snapback = false
    stone.unique_enemies(@color).each do |eg|
      next if eg.lives != 2 # NB if 1 this is a case for Executioner
      # if even a single of our groups around is in atari this will not work (enemy will kill our group and escape)
      next if 1 == eg.all_enemies.each { |ag| break(1) if ag.lives < 2 }
      if empties.size == 1 and allies.size == 0
        # unless this is a snapback, this is a dumb move
        empty = stone.neighbors.each { |n| break(n) if n.color == EMPTY }
        # it is a snapback if the last empty point (where the enemy will have to play) 
        # would not make the enemy group connect to another enemy group
        # (equivalent to: the empty point has no other enemy group as neighbor)
        enemies_around_empty = empty.unique_allies(eg.color)
        next if enemies_around_empty.size != 1 or enemies_around_empty.first != eg
        # here we know this is a snapback
        snapback = true
        $log.debug("Hunter sees a snapback in #{stone}") if $debug
      end
      $log.debug("Hunter (level #{level}) looking at #{i},#{j} threat on #{eg}") if $debug
      if !eg1 then eg1 = eg elsif !eg2 then eg2 = eg else eg3 = eg end
    end # each eg
    return 0 if !eg1
    # unless snapback, make sure our new stone's group is not in atari
    if !snapback and empties.size<2
      lives = empties.size
      allies.each { |ag| lives += ag.lives - 1 }
      return 0 if lives < 2
    end
    Stone.play_at(@goban,i,j,@color) # our attack takes one of the 2 last lives (the one in i,j)
    # keep the max of both attacks (if both are succeeding)
    taken = atari_is_caught?(eg1,level) ? eg1.stones.size : 0
    taken2 = eg2 && atari_is_caught?(eg2,level) ? eg2.stones.size : 0
    taken3 = eg3 && atari_is_caught?(eg3,level) ? eg3.stones.size : 0
    taken = taken2 if taken < taken2
    taken = taken3 if taken < taken3
    Stone.undo(@goban)
    $log.debug("Hunter found a threat of #{taken} at #{i},#{j}") if $debug and taken>0
    return taken
  end

  def atari_is_caught?(g,level=1)
    all_lives = g.all_lives
    raise "Unexpected: hunter #1: #{all_lives.size}" if all_lives.size != 1
    last_life = all_lives.first
    stone = Stone.play_at(@goban,last_life.i,last_life.j,g.color) # enemy's escape move
    is_caught = escaping_atari_is_caught?(stone,level)
    Stone.undo(@goban)
    $log.debug("Hunter: group in atari would be caught: #{g}") if $debug
    return is_caught
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

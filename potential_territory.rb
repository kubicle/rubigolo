require_relative "./board_analyser"

class PotentialTerritory

  def initialize(goban)
    @goban = goban
    @size = goban.size
    @boan = BoardAnalyser.new
    @real_grid = @goban.scoring_grid # we can reuse the already allocated grid
    @real_yx = @real_grid.yx # simple shortcut to real yx
    # grids below are used in the evaluation process
    @grids = [Grid.new(goban.size), Grid.new(goban.size)]
    @reduced_grid = Grid.new(goban.size)
    @territory = Grid.new(goban.size) # result of evaluation
  end

  # Returns the matrix of potential territory.
  # +1: definitely white, -1: definitely black
  # Values in between are possible too.
  def guess_territories
    # update real grid to current goban
    @real_grid.convert(@goban.grid)
    # evaluate 2 "scenarios" - each player plays everywhere *first*
    2.times {|first| foresee(@grids[first], first, 1-first)}
    $log.debug("\nBLACK first:\n#{@grids[0]}WHITE first:\n#{@grids[1]}") if $debug

    # now merge the result
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        owner = 0
        2.times do |first|
          terr_color = @grids[first].yx[j][i] - Grid::TERRITORY_COLOR
          owner += 1 if terr_color == WHITE
          owner -= 1 if terr_color == BLACK
        end
        @territory.yx[j][i] = owner / 2.0
      end
    end
    $log.debug("\n+1=white, -1=black, 0=no one\n"+@territory.to_text{|v| v==0 ? "    0" : sprintf("%+.1f",v)}) if $debug
    return @territory.yx
  end

  def potential
    return @territory
  end

  # For unit tests
  def _grid(first)
    return @grids[first]
  end

private

  # TODO: add live/dead groups? Maybe not here
  def foresee(grid, first, second)
    @tmp = @territory # safe to use it as temp grid here
    @reduced_yx = nil
    @move_num_before_enlarge = @goban.move_number?

    # enlarging starts with real grid
    enlarge(@real_grid, @tmp.copy(@real_grid), first, second)
    enlarge(@tmp, grid.copy(@tmp), second, first)
    connect_to_borders(grid.yx)
    $log.debug("after 1st enlarge:\n#{@grid}") if $debug

    # for reducing we start from the enlarged grid
    reduce(@reduced_grid.copy(grid))
    @reduced_yx = @reduced_grid.yx
    $log.debug("after reduce:\n#{grid}") if $debug

    # now we have the reduced goban, play the enlarge moves again minus the extra
    enlarge(@real_grid, @tmp.copy(@real_grid), first, second)
    enlarge(@tmp, grid.copy(@tmp), second, first)
    connect_to_borders(grid.yx)
    $log.debug("after 2nd enlarge:") if $debug
    @goban.debug_display if $debug

    # passed grid will receive the result (scoring grid)
    @boan.count_score(@goban, grid.convert(@goban.grid))

    # restore goban
    (@goban.move_number? - @move_num_before_enlarge).times { Stone.undo(@goban) }
  end

  def enlarge(in_grid, out_grid, first, second)
    $log.debug("enlarge #{first},#{second}") if $debug
    in_yx = in_grid.yx
    out_yx = out_grid.yx
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        next if in_yx[j][i] != EMPTY
        enlarge_at(in_yx, out_yx, i, j, first, second)
      end
    end
  end

  # Reduces given grid using the real grid as reference.
  def reduce(grid)
    yx = grid.yx
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        next if @real_yx[j][i] != EMPTY # cannot reduce a real stone
        color = yx[j][i]
        next if color == EMPTY # we did not enlarge here, no need to reduce
        enemies = in_contact?(yx, i, j, 1-color)
        # we can safely reduce if no enemy was around at the end of the enlarging steps
        yx[j][i] = EMPTY if enemies == 0
      end
    end
  end

  # "enlarge" around a given spot
  # Note we read and write on separate grids
  def enlarge_at(in_yx, out_yx, i, j, first, second)
    ss = in_contact?(in_yx, i, j, first)
    if ss > 0
      return if ss >= 3 # if 3 or 4 no need to fill the void
    else
      return if !diagonal_move_ok?(in_yx, i, j, first, second)
    end
    add_stone(out_yx, i, j, first)
  end

  # Add a stone on given grid.
  # When the reduced grid is known, use it and play moves on goban too.
  def add_stone(yx, i, j, color)
    if @reduced_yx
      # skip if useless move (it was reduced)
      return if @reduced_yx[j][i]==EMPTY
      # we check only against sucicide (e.g. no need to check against ko or non empty)
      stone = @goban.stone_at?(i,j)
      return if stone.move_is_suicide?(color)
      Stone.play_at(@goban, i, j, color)
    end
    yx[j][i] = color
  end

  # Returns the number of times we find "color" in contact with i,j
  def in_contact?(yx, i, j, color)
    num = 0
    Stone::XY_AROUND.each { |vect| num += 1 if yx[j+vect[1]][i+vect[0]] == color }
    return num
  end

  # Authorises a diagonal move if first color is on a diagonal stone from i,j
  # AND if second color is not next to this diagonal stone
  def diagonal_move_ok?(yx, i, j, first, second)
    Stone::XY_DIAGONAL.each do |vect|
      next if yx[j+vect[1]][i+vect[0]] != first
      next if yx[j+vect[1]][i] == second or yx[j][i+vect[0]] == second
      $log.debug("diagonal_move_ok: #{i},#{j} for #{first}") if $debug and i==1 and j==9
      return true
    end
    return false
  end

  AROUND = [[1,0,0,1],[0,1,1,0],[1,0,-1,0],[-1,0,1,0]] #TODO replace this by pre-computed coords

  # connect stones close to borders to the border
  def connect_to_borders(yx)
    2.upto(@size-1) do |n|
      AROUND.each do |c|
        i = (c[0]<0 ? @size   : c[0]*n)     + c[1] # n,1,n,size
        j = (c[2]<0 ? @size   : c[2]*n)     + c[3] # 1,n,size,n
        if yx[j][i]==EMPTY
          i2= (c[0]<0 ? @size-1 : c[0]*n)     + c[1]*2  # n,2,n,size-1
          j2= (c[2]<0 ? @size-1 : c[2]*n)     + c[3]*2  # 2,n,size-1,n
          i3= (c[0]<0 ? @size   : c[0]*(n+1)) + c[1]  # n+1,1,n+1,size
          j3= (c[2]<0 ? @size   : c[2]*(n+1)) + c[3]  # 1,n+1,size,n+1
          i4= (c[0]<0 ? @size   : c[0]*(n-1)) + c[1]  # n-1,1,n-1,size
          j4= (c[2]<0 ? @size   : c[2]*(n-1)) + c[3]  # 1,n-1,size,n-1
          next2border = yx[j2][i2]
          if next2border!=EMPTY and yx[j3][i3]==EMPTY and yx[j4][i4]==EMPTY
            add_stone(yx, i, j, next2border)
          end
        end
      end
      # if @goban.empty?(i,1)
      #   next2border = @goban.stone_at?(i,2).color
      #   if next2border != EMPTY and @goban.empty?(i+1,1) and @goban.empty?(i-1,1)
      #     Stone.play_at(@goban,i,1,next2border)
      #   end
      # end
      # if @goban.empty?(1,i)
      #   next2border = @goban.stone_at?(2,i).color
      #   if next2border != EMPTY and @goban.empty?(1,i+1) and @goban.empty?(1,i-1)
      #     Stone.play_at(@goban,1,i,next2border)
      #   end
      # end
      # if @goban.empty?(i,@size)
      #   next2border = @goban.stone_at?(i,@size-1).color
      #   if next2border != EMPTY and @goban.empty?(i+1,@size) and @goban.empty?(i-1,@size)
      #     Stone.play_at(@goban,i,@size,next2border)
      #   end
      # end
      # if @goban.empty?(@size,i)
      #   next2border = @goban.stone_at?(@size-1,i).color
      #   if next2border != EMPTY and @goban.empty?(@size,i+1) and @goban.empty?(@size,i-1)
      #     Stone.play_at(@goban,@size,i,next2border)
      #   end
      # end
    end
  end

end


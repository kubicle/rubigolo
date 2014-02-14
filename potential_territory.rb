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
    @terr = Grid.new(goban.size) # result of evaluation
  end

  def guess_territories
    # update real grid to current goban
    @real_grid.convert(@goban.grid)
    # evaluate 2 "scenarios" - each player plays everywhere *first*
    2.times {|first| foresee(@grids[first], first, 1-first)}
    $log.debug("#{@grids[0]}\n#{@grids[1]}") if $debug

    # now merge the result
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        #TODO rewrite this
        owner = 0
        2.times do |first|
          terr_color = @grids[first].yx[j][i] - Grid::TERRITORY_COLOR
          owner += 1 if terr_color == WHITE
          owner -= 1 if terr_color == BLACK
        end
        @terr.yx[j][i] = owner / 2.0
      end
    end
    $log.debug("\n+1=white, -1=black, 0=no one\n"+@terr.to_text(5){|v| v}) if $debug
  end

private

  def foresee(grid, first, second)
    # TODO: add live/dead groups? Maybe not here
    @move_num_before_enlarge = @goban.move_number?

    # for enlarging we compare with real grid
    @yx = @real_yx
    enlarge(first, second)
    enlarge(second, first)
    connect_to_borders
    $log.debug("enlarge, after:") if $debug
    @goban.debug_display if $debug

    # for reducing we start from the enlarged goban
    @yx = grid.convert(@goban.grid).yx
    $log.debug("before reduce:\n#{grid}") if $debug
    reduce
    $log.debug("after reduce:\n#{grid}") if $debug

    # passed grid will receive the result (scoring grid)
    @boan.count_score(@goban, grid)

    # restore goban
    num_undo = @goban.move_number? - @move_num_before_enlarge
    num_undo.times { Stone.undo(@goban) }
  end

  def reduce
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        color = @yx[j][i]
        next if @real_yx[j][i] != EMPTY or (color != BLACK and color != WHITE)
        enemies = in_contact?(i, j, 1-color)
        @yx[j][i] = EMPTY if enemies == 0
      end
    end
  end

  def enlarge(first, second)
    $log.debug("enlarge #{first},#{second}") if $debug
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        next if ! @goban.empty?(i, j)
        enlarge_at(i, j, first, second)
      end
    end
  end

  # "enlarge" around a given spot
  def enlarge_at(i, j, first, second)
    ss = in_contact?(i, j, first)
    if ss > 0
      return if ss >= 3 # if 3 or 4 no need to fill the void
    else
      return if !diagonal_move_ok?(i, j, first, second)
    end
    Stone.play_at(@goban, i, j, first)
  end

  # Returns the number of times we find "color" in contact with i,j
  def in_contact?(i,j,color)
    num = 0
    Stone::XY_AROUND.each { |xy| num += 1 if @yx[j+xy[1]][i+xy[0]] == color }
    return num
  end

  # Authorises a diagonal move if first color is on a diagonal stone from i,j
  # AND if second color is not next to this diagonal stone
  def diagonal_move_ok?(i, j, first, second)
    Stone::XY_DIAGONAL.each do |xy|
      next if @yx[j+xy[1]][i+xy[0]] != first
      next if @yx[j+xy[1]][i] == second or @yx[j][i+xy[0]] == second
      return true
    end
    return false
  end

  # connect stones close to borders to the border
  def connect_to_borders
    2.upto(@size-1) do |i|
      if @goban.empty?(i,1)
        next2border = @goban.stone_at?(i,2).color
        if next2border != EMPTY and @goban.empty?(i+1,1) and @goban.empty?(i-1,1)
          Stone.play_at(@goban,i,1,next2border)
        end
      end
      if @goban.empty?(1,i)
        next2border = @goban.stone_at?(2,i).color
        if next2border != EMPTY and @goban.empty?(1,i+1) and @goban.empty?(1,i-1)
          Stone.play_at(@goban,1,i,next2border)
        end
      end
      if @goban.empty?(i,@size)
        next2border = @goban.stone_at?(i,@size-1).color
        if next2border != EMPTY and @goban.empty?(i+1,@size) and @goban.empty?(i-1,@size)
          Stone.play_at(@goban,i,@size,next2border)
        end
      end
      if @goban.empty?(@size,i)
        next2border = @goban.stone_at?(@size-1,i).color
        if next2border != EMPTY and @goban.empty?(@size,i+1) and @goban.empty?(@size,i-1)
          Stone.play_at(@goban,@size,i,next2border)
        end
      end
    end
  end

end


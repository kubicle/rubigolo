

class ZoneFiller

  attr_reader :grid

  # if a grid is given, it is used as starting point; 
  # otherwise, the goban scoring_grid is used.
  def initialize(goban, grid=nil)
    grid = goban.scoring_grid.convert(goban.grid) if !grid
    # $log.debug("ZoneFiller.new \n"+grid.to_s) if $debug
    @goban = goban
    @grid = grid
    @yx = grid.yx
    @groups = nil
  end

  # "Color" a goban zone.
  # to_replace can be EMPTY or a zone code (but cannot be a real color like BLACK)
  # neighbors, if given should be an array of n arrays, with n == number of colors
  # if neighbors are not given, we do simple "coloring"
  def fill_with_color(start_i, start_j, to_replace, color, neighbors=nil)
    # $log.debug("fill #{start_i} #{start_j}; replace #{to_replace} with #{color}") if $debug
    return 0 if @yx[start_j][start_i] != to_replace
    size = 0
    @to_replace = to_replace
    @groups = neighbors
    gaps = [[start_i, start_j, start_j]]
    while (gap = gaps.pop)
      # $log.debug("About to do gap: #{gap} (left #{gaps.size})") if $debug
      i,j0,j1 = gap
      next if @yx[j0][i] != to_replace # gap already done by another path
      while _check(i,j0-1) do j0 -= 1 end
      while _check(i,j1+1) do j1 += 1 end
      size += j1-j0+1
      # $log.debug("Doing column #{i} from #{j0}-#{j1}") if $debug
      (i-1).step(i+1,2) do |ix|
        curgap = nil
        j0.upto(j1) do |j|
          # $log.debug("=>coloring #{i},#{j}") if $debug and ix<i
          @yx[j][i] = color if ix<i
          # $log.debug("checking neighbor #{ix},#{j}") if $debug
          if _check(ix,j)
            if ! curgap
              # $log.debug("New gap in #{ix} starts at #{j}") if $debug
              curgap = j # gap start
            end
          else
            if curgap
              # $log.debug("--- pushing gap [#{ix},#{curgap},#{j-1}]") if $debug
              gaps.push([ix,curgap,j-1])
              curgap = nil
            end
          end
        end # upto j
        # $log.debug("--- pushing gap [#{ix},#{curgap},#{j1}]") if $debug and curgap
        gaps.push([ix,curgap,j1]) if curgap # last gap
      end # each ix
    end # while gap
    return size
  end

private

  # Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
  def _check(i,j)
    color = @yx[j][i]
    return false if color == BORDER
    return true if color == @to_replace
    if @groups and color < 2
      group = @goban.stone_at?(i,j).group
      @groups[color].push(group) if group and ! @groups[color].find_index(group)
    end
    return false
  end

end


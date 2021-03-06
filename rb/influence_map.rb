
class InfluenceMap

  attr_reader :map

  def initialize(goban)
    @goban = goban
    @gsize = goban.gsize
    @map = Array.new(@gsize+1) {Array.new(@gsize+1) {[0,0]}}
  end
  
  def clear
    1.upto(@gsize) do |j|
      1.upto(@gsize) do |i|
        2.times { |c| @map[j][i][c] = 0 }
      end
    end
  end
  
  def build_map
    clear
    influence = [4,2,1]
    # First we get stones' direct influence
    1.upto(@gsize) do |j|
      1.upto(@gsize) do |i|
        stone = @goban.stone_at?(i,j)
        color = stone.color
        if color != EMPTY
          @map[j][i][color] += influence[0]
          # Then we propagate it decreasingly with distance
          stone.neighbors.each do |n1|
            next if n1.color != EMPTY
            @map[n1.j][n1.i][color] += influence[1]
            # Second level
            n1.neighbors.each do |n2|
              next if n2.color != EMPTY
              next if n2 == stone
              @map[n2.j][n2.i][color] += influence[2]
              # 3rd level
              # n2.neighbors.each do |n3|
              #   next if n3 == n1
              #   @map[n3.j][n3.i][color] += influence[3]
              # end
            end
          end
        end
      end
    end
    debug_dump if $debug
  end
  
  def debug_dump
    2.times do |c|
      puts "Influence map for #{Grid::COLOR_NAMES[c]}:"
      @gsize.downto(1) do |j|
        print "#{'%2d' % j}"
        1.upto(@gsize) do |i|
          print "#{'%2d' % @map[j][i][c]}|"
        end
        print "\n"
      end
      print "  "
      1.upto(@gsize) { |i| print " #{Grid.x_label(i)} " }
      print "\n"
    end
  end

end


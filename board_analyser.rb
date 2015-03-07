require "set"
require_relative "goban"
require_relative "zone_filler"


# Class used by BoardAnalyser class.
# A void in an empty zone surrounded by (and including) various groups.
# NB: when a void has a single color around; we call this an eye. Can be discussed...
class Void
  attr_reader :code, :i, :j, :size, :groups, :eye_color, :owner
  
  # code is the void code (like a color but higher index)
  # neighbors is an array of n arrays, with n == number of colors
  def initialize(analyser,code,i,j,size,neighbors)
    @analyzer = analyser
    @goban = analyser.goban
    @code = code
    @i = i
    @j = j
    @size = size
    @groups = neighbors # neighboring groups (array of arrays; 1st index is color)
    @eye_color = nil # stays nil if not an eye
    @owner = nil
  end
  
  # Call it once. Populates @eye_color
  # @eye_color stays nil if there is more than 1 color around (not an eye) or full board empty
  def eye_check!
    one_color = nil
    @groups.size.times do |c|
      # is there 1 or more groups of this color?
      if @groups[c].size >= 1
        if one_color # we already had groups in another color
          one_color = nil
          break
        end
        one_color = c
      end
    end
    @eye_color = one_color
    # Now tell the groups about this void
    if one_color
      set_owner(one_color)
      @groups.each { |n| n.each { |g| g.add_void(self,true) } }
      $log.debug("Color #{one_color} surrounds #{self} (eye)") if $debug
    else
      @groups.each { |n| n.each { |g| g.add_void(self) } }
      $log.debug("#{self} has to be sorted out...") if $debug
    end
  end
  
  def set_owner(color)
    @owner = color
  end
  
  def to_s
    s = "void #{@code} (#{Grid.color_to_char(@code)}/#{@i},#{@j}), size #{@size}"
    @groups.size.times do |color|
      s << ", #{@groups[color].size} #{Grid::COLOR_NAMES[color]} neighbors"
    end
    return s
  end

  def debug_dump
    puts to_s
    @groups.size.times do |color|
      print "    Color #{color} (#{Grid.color_to_char(color)}):"
      @groups[color].each do |neighbor|
        print " ##{neighbor.ndx}"
      end
    end
    print "\n"
  end
  
end



class BoardAnalyser

  attr_reader :goban, :scores, :prisoners

  def initialize
    @goban = nil
    @voids = []
    @all_groups = Set.new
  end

  # Calling this method updates the goban to show the detected result.
  def count_score(goban, grid=nil)
    $log.debug("Counting score...") if $debug
    @goban = goban
    @scores = [0,0]
    @prisoners = Group.prisoners?(@goban)
    @filler = ZoneFiller.new(@goban, grid)

    find_voids
    find_eyes
    find_stronger_owners
    find_dying_groups
    find_dame_voids
    color_voids

    @voids.each do |v|
      @scores[v.owner] += v.size if v.owner
    end
    
    debug_dump if $debug
  end
  
  def image?
    return @filler.grid.image?
  end
  
  def debug_dump
    print @filler.grid.to_text { |c| Grid.color_to_char(c) }
    @voids.each { |v| v.debug_dump }

    if @scores
      print "\nGroups with 2 eyes or more: "
      @all_groups.each { |g| print "#{g.ndx}," if g.eyes.size >= 2 }
      print "\nGroups with 1 eye: "
      @all_groups.each { |g| print "#{g.ndx}," if g.eyes.size == 1 }
      print "\nGroups with no eye: "
      @all_groups.each { |g| print "#{g.ndx}," if g.eyes.size == 0 }
      print "\nScore:\n"
      @scores.size.times { |i| puts "Player #{i}: #{@scores[i]} points" }
    end
  end

private

  def find_voids
    $log.debug("Find voids...") if $debug
    void_code = Grid::ZONE_CODE
    @all_groups.each { |g| g.reset_analysis }
    @all_groups.clear
    @voids.clear
    
    neighbors = [[],[]]
    1.upto(@goban.size) do |j|
      1.upto(@goban.size) do |i|
        if (size = @filler.fill_with_color(i, j, EMPTY, void_code, neighbors)) > 0
          @voids.push(Void.new(self,void_code,i,j,size,neighbors))
          void_code += 1
          # keep all the groups
          neighbors.each { |n| n.each { |g| @all_groups.add(g) } }
          neighbors = [[],[]]
        end
      end
    end
  end

  # Find voids surrounded by a single color -> eyes
  def find_eyes
    @voids.each { |v| v.eye_check! }
  end
  
  # Decides who owns a void by comparing the "liveness" of each side
  def find_stronger_owners
    @voids.each do |v|
      next if v.eye_color
      lives = [0,0]
      2.times do |c|
        v.groups[c].each do |g|
          lives[c] += g.lives
        end
      end
      more_lives = lives.max
      if lives.count { |l| l == more_lives } == 1 # make sure we have a winner, not a tie
        c = lives.find_index(more_lives)
        v.set_owner(c)
        $log.debug("It looks like color #{c}, with #{more_lives} lives, owns #{v} (this might change once we identify dead groups)") if $debug
      end
    end
  end
  
  # Reviews the groups and declare "dead" the ones who do not own any void
  def find_dying_groups
    @all_groups.each do |g|
      next if g.eyes.size >= 2
      next if g.eyes.size == 1 and g.eyes[0].size + g.extra_lives >= 3 # actually not enough if gote but well...
      color = g.color
      next if g.eyes.size == 1 and g.eyes[0].groups[color].size > 1 # connected by eye
      
      # we need to look at voids around (fake eyes, etc.)
      owned_voids = size = 0
      one_owner = my_void = nil
      g.voids.each do |v|
        if v.owner
          one_owner = v.owner
          if v.owner == color then my_void=v; owned_voids+=1; size+=v.size end
        end
      end
      next if g.eyes.size == 1 and owned_voids >= 1 # TODO: this is too lenient
      next if owned_voids >= 2 # TODO later: here is the horror we read about on the web
      next if owned_voids == 1 and size + g.extra_lives >= 3
      next if owned_voids == 1 and my_void.groups[color].size > 1 # TODO: check also lives of ally
      # find if the only void around is owned (e.g. lost stones inside big territory)
      # if we don't know who owns the voids around g, leave g as alive (unfinished game)
      next if g.voids.size != 0 and !one_owner

      # g is dead!
      stone = g.stones.first
      taken = @filler.fill_with_color(stone.i, stone.j, color, Grid::DEAD_COLOR+color)
      @prisoners[color] += taken
      @scores[1 - color] += taken
      g.count_as_dead
      $log.debug("Hence #{g} is considered dead (#{taken} prisoners; 1st stone #{stone})") if $debug
      $log.debug("eyes:#{g.eyes.size} owned_voids:#{owned_voids} size-voids:#{size}") if $debug
    end
  end

  # Looks for "dame" = neutral voids (if alive groups from more than one color are around)
  def find_dame_voids
    @voids.each do |v|
      next if v.eye_color
      alive_colors = []
      2.times do |c|
        v.groups[c].each do |g|
          if group_liveliness?(g) >= 1 then alive_colors.push(c); break end
        end
      end
      if alive_colors.size >= 2
        v.set_owner(nil)
        $log.debug("Void #{v} is considered neutral (\"dame\")") if $debug
      end
    end
  end
  
  # Colors the voids with owner's color
  def color_voids
    @voids.each do |v|
      c = (v.owner ? Grid::TERRITORY_COLOR+v.owner : Grid::DAME_COLOR)
      @filler.fill_with_color(v.i, v.j, v.code, c)
    end
  end
  
  # Returns a number telling how "alive" a group is. TODO: review this
  # Really basic logic for now.
  # - eyes count a lot (proportionaly to their size; instead we should determine if an
  #   eye shape is right to make 2 eyes)
  # - owned voids count much less (1 point per void, no matter its size)
  # - non-owned voids (undetermined owner or enemy-owned void) count for 0
  # NB: for end-game counting, this logic is enough because undetermined situations
  # have usually all been resolved (or this means both players cannot see it...)
  def group_liveliness?(g)
    g.eyes.size + g.voids.count {|z| z.owner == g.color}
  end

end

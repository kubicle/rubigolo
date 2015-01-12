require_relative "stone_constants"
require_relative "grid"
require_relative "stone"
require_relative "group"

# Stores what we have on the board (namely, the stones and the empty spaces).
# - Giving coordinates, a Goban can return an existing stone.
# - It also remembers the list of stones played and can share this info for undo feature.
# - For console game and debug features, a goban can also "draw" its content as text.
# See Stone and Group classes for the layer above this.
class Goban

  attr_reader :size, :grid, :scoring_grid, :merged_groups, :killed_groups, :garbage_groups

  def initialize(size=19)
    @size = size
    @grid = Grid.new(size)
    @scoring_grid = Grid.new(size)
    @ban = @grid.yx
    1.upto(size) do |j|
      1.upto(size) { |i| @ban[j][i] = Stone.new(self,i,j,EMPTY) }
    end
    1.upto(size) do |j|
      1.upto(size) { |i| @ban[j][i].find_neighbors }
    end
    # sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    @@sentinel = Group.new(self, Stone.new(self,-50,-50,EMPTY), -100, 0)
    @killed_groups = [@@sentinel] # so that we can always do @killed_groups.last.color, etc.
    @merged_groups = [@@sentinel]
    @garbage_groups = []
    @num_groups = 0
    @history = []
  end
  
  # Prepares the goban for another game (same size, same number of players)
  def clear
    1.upto(@size) do |j|
      1.upto(@size) do |i|
        stone = @ban[j][i]
        stone.group.clear if stone.group
      end
    end
    # Collect all the groups and put them into @garbage_groups
    @killed_groups.shift # removes @@sentinel
    @merged_groups.shift # removes @@sentinel
    @garbage_groups.concat(@killed_groups)
    @garbage_groups.concat(@merged_groups)
    @killed_groups.clear
    @killed_groups.push(@@sentinel)
    @merged_groups.clear
    @merged_groups.push(@@sentinel)
    @num_groups = 0
    @history.clear
  end

  # Allocate a new group or recycles one from garbage list.
  # For efficiency, call this one, do not call the regular Group.new method.
  def new_group(stone,lives)
    group = @garbage_groups.pop
    if group
      return group.recycle!(stone,lives)
    else
      @num_groups += 1
      return Group.new(self,stone,lives,@num_groups)
    end
  end

  def image?
    return @grid.to_text(false,","){ |s| Grid::COLOR_CHARS[s.color] }.chop
  end

  # For debugging only
  def debug_display
    puts "Board:"
    print @grid.to_text { |s| Grid::COLOR_CHARS[s.color] }
    puts "Groups:"
    print @grid.to_text { |s| s.group ? "#{s.group.ndx}" : "." }
    puts "Full info on groups and stones:"
    groups={}
    @grid.yx.each {|row| row.each {|s| groups[s.group.ndx] = s.group if s and s.group}}
    1.upto(@num_groups) { |ndx| puts groups[ndx].debug_dump if groups[ndx] }
  end

  # This display is for debugging and text-only game
  def console_display
    print @grid.to_text { |s| Grid::COLOR_CHARS[s.color] }
  end

  # Basic validation only: coordinates and checks the intersection is empty
  # See Stone class for evolved version of this (calling this one)
  def valid_move?(i, j)
    return false if i < 1 or i > @size or j < 1 or j > @size
    return @ban[j][i].empty?
  end
  
  def stone_at?(i,j)
    return @ban[j][i]
  end
  
  def color?(i,j)
    stone = @ban[j][i]
    return stone.color if stone # works because BORDER == nil
    return BORDER
  end

  # No validity test here
  def empty?(i,j)
    return @ban[j][i].empty?
  end
  
  def move_number?
    return @history.size
  end

  # Plays a stone and stores it in history
  # Actually we simply return the existing stone and the caller will update it
  def play_at(i,j,color)
    stone=@ban[j][i]
    @history.push(stone)
    return stone
  end
  
  # Removes the last stone played from the board
  # Actually we simply return the existing stone and the caller will update it
  def undo()
    return @history.pop
  end
  
  def previous_stone
    return @history.last
  end
end

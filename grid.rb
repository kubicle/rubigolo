require_relative "stone_constants"

# A generic grid - a Goban owns a grid
class Grid

  COLOR_NAMES = ["black","white"]
  NOTATION_A = "a".ord # notation origin; could be A or a
  EMPTY_CHAR = "+"
  DAME_CHAR = "?"
  STONE_CHARS = "@O"
  DEAD_CHARS = "&#"
  TERRITORY_CHARS = "-:"
  COLOR_CHARS = STONE_CHARS+DEAD_CHARS+TERRITORY_CHARS+DAME_CHAR+EMPTY_CHAR
  EMPTY_COLOR = -1 # this is same as EMPTY, conveniently
  DAME_COLOR = -2 # index of ? in above string; 2 from the end of the string
  DEAD_COLOR = 2
  TERRITORY_COLOR = 4
  CIRCULAR_COLOR_CHARS = DAME_CHAR+EMPTY_CHAR+COLOR_CHARS
  ZONE_CODE = 100 # used for zones (100, 101, etc.); must be > COLOR_CHARS.size

  attr_reader :size, :yx

  def initialize(size=19)
    @size = size
    # TODO: use only 1 extra "nil" cell (0..size instead of 0..size+1)
    # Idea is to avoid to have to check i,j against size in many places.
    # In case of bug, e.g. for @yx[5][-1], Ruby returns you @yx[5][@yx.size] (looping back)
    # so having a real item (BORDER) on the way helps to detect a bug.
    @yx = Array.new(size+2) {Array.new(size+2,BORDER)}
  end

  def copy(source_grid)
    raise "Cannot copy between different sized grids" if source_grid.size != @size
    src_yx = source_grid.yx
    1.upto(@size) do |j|
      1.upto(@size) { |i| @yx[j][i] = src_yx[j][i] }
    end
    return self
  end

  # Converts from goban grid (stones) to simple grid (colors) REVIEWME
  def convert(source_grid)
    raise "Cannot copy between different sized grids" if source_grid.size != @size
    src_yx = source_grid.yx
    1.upto(@size) do |j|
      1.upto(@size) { |i| @yx[j][i] = src_yx[j][i].color }
    end
    return self
  end

  # Returns the "character" used to represent a stone in text style
  def self.color_to_char(color)
    return ("A".ord + color-ZONE_CODE).chr if color >= ZONE_CODE
    char = COLOR_CHARS[color]
    raise "Invalid color #{color}" if color<DAME_COLOR or color>=COLOR_CHARS.length
    return char
  end
  
  # Returns the name of the color/player (e.g. "black")
  def self.color_name(color) # TODO remove me or?
    return COLOR_NAMES[color]
  end

  def self.char_to_color(char)
    return CIRCULAR_COLOR_CHARS.index(char) + DAME_COLOR
  end

  # Receives a block of code and calls it for each vertex.
  # The block should return a string representation.
  # This method returns the concatenated string showing the grid.
  def to_text(with_labels=true, end_of_row="\n")
    yx = Grid.new(@size).yx
    maxlen = 1
    @size.downto(1) do |j|
      1.upto(@size) do |i|
        val = yield(@yx[j][i])
        val = "" if val == nil
        yx[j][i] = val
        maxlen = val.length if val.length > maxlen
      end
    end
    num_char = maxlen
    white = "          "
    s = ""
    @size.downto(1) do |j|
      s += "#{'%2d' % j} " if with_labels
      1.upto(@size) do |i|
        val = yx[j][i]
        val = white.slice(1, num_char-val.length) + val if val.length < num_char
        s += val
      end
      s += end_of_row
    end
    if with_labels
      s += "   "
      1.upto(@size) { |i| s += white.slice(1,num_char-1) + Grid.x_label(i) }
      s += "\n"
    end
    return s
  end

  def to_s
    s = ""
    @size.downto(1) do |j|
      1.upto(@size) { |i| s << Grid.color_to_char(@yx[j][i]) }
      s << "\n"
    end
    return s
  end

  # Returns a text "image" of the grid. See also copy? method.
  # Image is upside-down to help compare with a copy paste from console log.
  # So last row (j==size) comes first in image
  def image?
    if @yx[1][1].instance_of?(Stone) #FIXME
      return to_text(false, ",") { |s| Grid::color_to_char(s.color) } .chop
    else
      return to_text(false, ",") { |c| Grid::color_to_char(c) } .chop
    end
  end
  
  # Watch out our images are upside-down on purpose (to help copy paste from screen)
  # So last row (j==size) comes first in image
  def load_image(image)
    rows = image.split(/\"|,/)
    raise "Invalid image: #{rows.size} rows instead of #{@size}" if rows.size != @size
    @size.downto(1) do |j|
      row = rows[@size-j]
      raise "Invalid image: row #{row}" if row.length != @size
      1.upto(@size) do |i|
        @yx[j][i] = Grid.char_to_color(row[i-1])
      end
    end
  end

  # Parses a move like "c12" into 3,12
  def self.parse_move(move)
    return move[0].ord-NOTATION_A+1, move[1,2].to_i
  end
  
  # Builds a string representation of a move (3,12->"c12")  
  def self.move_as_string(col, row)
    return "#{(col+NOTATION_A-1).chr}#{row}"
  end
  
  # Converts a numeric X coordinate in a letter (e.g 3->c)
  def self.x_label(i)
    return (i+NOTATION_A-1).chr
  end

end

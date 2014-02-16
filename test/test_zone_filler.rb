require 'test/unit'

require_relative "../game_logic"
require_relative "../logging"
require_relative "../zone_filler"

# NB: for debugging think of using analyser.debug_dump

# TODO: add tests for group detection while filling

class TestZoneFiller < Test::Unit::TestCase

  @@x = 123 # we use this color for replacements - should be rendered as "X"

  def init_board(size=5, handicap=0)
    @game = GameLogic.new
    @game.new_game(size, handicap)
    @goban = @game.goban
    @grid = Grid.new(size)
    @filler = ZoneFiller.new(@goban, @grid)
  end

  def initialize(test_name)
    super(test_name)
    init_board()
  end

  def test_fill1
    # 5 +O+++
    # 4 +@+O+
    # 3 +O+@+
    # 2 +@+O+
    # 1 +++@+
    #   abcde
    @grid.load_image("+O+++,+@+O+,+O+@+,+@+O+,+++@+")
    @filler.fill_with_color(3,1,EMPTY,@@x)
    assert_equal("XOXXX,X@XOX,XOX@X,X@XOX,XXX@X", @grid.image?);

    @grid.load_image("+O+++,+@+O+,+O+@+,+@+O+,+++@+")
    @filler.fill_with_color(1,3,EMPTY,@@x)
    assert_equal("XOXXX,X@XOX,XOX@X,X@XOX,XXX@X", @grid.image?);
  end

  def test_fill2
    # 5 +++++
    # 4 +OOO+
    # 3 +O+O+
    # 2 +++O+
    # 1 +OOO+
    #   abcde
    @grid.load_image("+++++,+OOO+,+O+O+,+++O+,+OOO+")
    @filler.fill_with_color(3,3,EMPTY,@@x)
    assert_equal("XXXXX,XOOOX,XOXOX,XXXOX,XOOOX", @grid.image?);

    @grid.load_image("+++++,+OOO+,+O+O+,+++O+,+OOO+")
    @filler.fill_with_color(1,1,EMPTY,@@x)
    assert_equal("XXXXX,XOOOX,XOXOX,XXXOX,XOOOX", @grid.image?);

    @grid.load_image("+++++,+OOO+,+O+O+,+++O+,+OOO+")
    @filler.fill_with_color(5,3,EMPTY,@@x)
    assert_equal("XXXXX,XOOOX,XOXOX,XXXOX,XOOOX", @grid.image?);
  end

  def test_fill3
    # 5 +++O+
    # 4 +++OO
    # 3 +O+++
    # 2 ++OO+
    # 1 +O+O+
    #   abcde
    @grid.load_image("+++O+,+++OO,+O+++,++OO+,+O+O+")
    @filler.fill_with_color(2,4,EMPTY,@@x)
    assert_equal("XXXO+,XXXOO,XOXXX,XXOOX,XO+OX", @grid.image?);

    @grid.load_image("+++O+,+++OO,+O+++,++OO+,+O+O+")
    @filler.fill_with_color(2,2,EMPTY,@@x)
    assert_equal("XXXO+,XXXOO,XOXXX,XXOOX,XO+OX", @grid.image?);

    @grid.load_image("+++O+,+++OO,+O+++,++OO+,+O+O+")
    @filler.fill_with_color(3,1,EMPTY,@@x)
    assert_equal("+++O+,+++OO,+O+++,++OO+,+OXO+", @grid.image?);

    @grid.load_image("+++O+,+++OO,+O+++,++OO+,+O+O+")
    @filler.fill_with_color(5,5,EMPTY,@@x)
    assert_equal("+++OX,+++OO,+O+++,++OO+,+O+O+", @grid.image?);
  end

end

require 'test/unit'

require_relative "../logging"
require_relative "../game_logic"
require_relative "../potential_territory"

# NB: for debugging think of using analyser.debug_dump


class TestPotentialTerritory < Test::Unit::TestCase

  POT2CHAR = "-'?.:"

  def init_board(size=5, handicap=0)
    @game = GameLogic.new
    @game.new_game(size, handicap)
    @goban = @game.goban
    @ter = PotentialTerritory.new(@goban)
  end

  def initialize(test_name)
    super(test_name)
  end

  def potential_to_s(grid)
    return grid.to_text(false,",") {|v| POT2CHAR[2+v*2]}.chop
  end

  def test_terr1
    init_board(9)
    # 9 +++++++++
    # 8 +++O@++++
    # 7 ++O+@+@++
    # 6 ++O++++++
    # 5 +O++O+@@+
    # 4 +O@++++O+
    # 3 +@@+@+O++
    # 2 +++@O++++
    # 1 +++++++++
    #   abcdefghi
    game = "c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3" # ,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,i5,i6,e4,i4,i3,h8,c8,d3,i5,f3,g2,i4,b5,b4,a5,i5"
    @game.load_moves(game)
    before = @goban.image?

    grid = @ter.guess_territories

    assert_equal(before, @goban.image?) # basic check - goban should have been restored
    black_first = ":::O@----,:::O@----,::O@@-@--,::O@@----,:O@@-@@@@,OO@-@-@OO,@@@-@@O::,---@OO:::,---@O::::"
    assert_equal(black_first, @ter._grid(BLACK).image?);
    white_first = ":::O@----,:::O@----,::OO@@@--,::O:OO@--,:OO:OO@@@,OO@OO:OOO,@@@?@OO::,---@O::::,---@O::::"
    assert_equal(white_first, @ter._grid(WHITE).image?);
    expected_potential = ":::??----,:::??----,::???'?--,::?.?''--,:??.'????,???'?????,???'???::,---??.:::,---??::::"
    assert_equal(grid, @ter.potential.yx)
    assert_equal(expected_potential, potential_to_s(@ter.potential))
  end

  # Test on a finished game
  def test_small_game_terr
    init_board(9)
    # 9 ++O@@++++
    # 8 +@OO@++@+
    # 7 OOOO@@@++
    # 6 ++OOOOO@@
    # 5 OO@@O@@@@
    # 4 @@@+OOOO@
    # 3 O@@@@@O+O
    # 2 +++@OOO++
    # 1 +++@@O+++
    #   abcdefghi
    game2 = "c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,i5,i6,e4,i4,i3,h8,c8,d3,i5,f3,g2,i4,b5,b4,a5,i5"
    @game.load_moves(game2)
    final_pos = "++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++"
    assert_equal(final_pos, @goban.image?);

    @ter.guess_territories

    black_first = "-&O@@----,&&OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@OOOOO@,#@@@@@O:O,#@-@OOO::,---@@O:::"
    assert_equal(black_first, @ter._grid(BLACK).image?);
    white_first = ":OO@@----,O:OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@OOOOO@,\#@@@@@O:O,\#@-@OOO::,---@@O:::"
    assert_equal(white_first, @ter._grid(WHITE).image?);
    expected_potential = "?????----,?.???--?-,???????--,::???????,?????????,?????????,???????:?,??-????::,---???:::"
    assert_equal(expected_potential, potential_to_s(@ter.potential))
  end

  # This test triggers the "if not suicide" in "add_stone" method
  def test_no_suicide_while_evaluating
    init_board(7)
    @game.load_moves("d4,d2,e3,b4,e1,c5,d6,d5,c3,e5,d3,b3,b2,c2,a2,e2,f1,f2,b6,c6,f6,e6,f4,d7,f5,f3");
    @ter.guess_territories
    
  end

end

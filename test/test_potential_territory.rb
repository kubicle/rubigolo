require 'test/unit'

require_relative "../logging"
require_relative "../game_logic"
require_relative "../potential_territory"

# NB: for debugging think of using analyser.debug_dump


class TestPotentialTerritory < Test::Unit::TestCase

  def init_board(size=5, handicap=0)
    @game = GameLogic.new
    @game.new_game(size, handicap)
    @goban = @game.goban
  end

  def initialize(test_name)
    super(test_name)
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
    image = @goban.image?

    @ter = PotentialTerritory.new(@goban)
    # @boan.debug_dump if $debug
    @ter.guess_territories

    assert_equal(image, @goban.image?)
    # @boan.debug_dump if $debug
    # 9 :::O@-@--
    # 8 ::OO@@@--
    # 7 OOOO@@@@@
    # 6 :OOO??@@-
    # 5 OOOOO?@@@
    # 4 OO@@??OOO
    # 3 @@@@@?OO:
    # 2 -@@@OOO::
    # 1 -@-@O:O::
    #   abcdefghi
#    @boan.count_score(@goban)
    # @boan.debug_dump if $debug
#    final_zones = ":::O@-@--,::OO@@@--,OOOO@@@@@,:OOO??@@-,OOOOO?@@@,OO@@??OOO,@@@@@?OO:,-@@@OOO::,-@-@O:O::"
#    assert_equal(final_zones, @goban.image?)
#    prisoners = Group.prisoners?(@goban)
#    assert_equal([0,0], prisoners)
#    assert_equal([0,0], @boan.prisoners)
#    assert_equal([9,12], @boan.scores)
  end

  # Idea is to verify we get the same score (the game is actually finished)
  def xtest_small_game_terr
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

    @boan = BoardAnalyser.new
    @boan.count_score(@goban)
    # we do not test private method anymore
    # tmp_zones = "FFO@@EEEE,F@OO@EE@E,OOOO@@@EE,DDOOOOO@@,OO@@O@@@@,@@@COOOO@,O@@@@@OBO,AAA@OOOBB,AAA@@OBBB"
    # assert_equal(tmp_zones, @boan.image?)
    final_zones = "::O@@----,:&OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@?OOOO@,#@@@@@O:O,---@OOO::,---@@O:::"
    # @boan.debug_dump if $debug
    assert_equal(final_zones, @goban.scoring_grid.image?)
    prisoners = Group.prisoners?(@goban)
    assert_equal([4,5], prisoners)
    assert_equal([4+1,5+1], @boan.prisoners)
    assert_equal([16,12], @boan.scores)
    
    assert_equal(final_pos, @goban.image?);
  end

end

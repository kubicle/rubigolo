require 'minitest/autorun'

require_relative "../logging"
require_relative "../game_logic"
require_relative "../score_analyser"


class TestScoreAnalyser < Minitest::Test

  def initialize(test_name)
    super(test_name)
  end

  def init_game(size=5)
    @game = GameLogic.new
    @game.new_game(size, 0)
    @goban = @game.goban
    @sa = ScoreAnalyser.new
    # when size is 7 we load an ending game to get real score situation
    if size==7
      # 7 +++++++
      # 6 +++@@@@
      # 5 @*+@OO@
      # 4 O@@@O+O
      # 3 OOOO+O+
      # 2 ++O+O++
      # 1 +++O+++
      #   abcdefg
      @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass")
    end
  end

  def test_compute_score
    init_game(7)
    who_resigned = nil
    s = @sa.compute_score(@goban, 1.5, who_resigned)
    assert_equal("white wins by 6.5 points", s.shift)
    assert_equal("black (@): 12 points (12 + 0 prisoners)", s.shift)
    assert_equal("white (O): 18.5 points (14 + 3 prisoners + 1.5 komi)", s.shift)
    assert_equal(nil, s.shift)
    
    # test message when someone resigns
    s = @sa.compute_score(@goban, 1.5, BLACK)
    assert_equal(["white won (since black resigned)"], s)
    s = @sa.compute_score(@goban, 1.5, WHITE)
    assert_equal(["black won (since white resigned)"], s)
  end

  def test_compute_score_diff
    init_game(7)
    assert_equal(-8.5, @sa.compute_score_diff(@goban, 3.5))
  end
  
  def test_start_scoring
    init_game(7)
    i = @sa.start_scoring(@goban, 0.5, nil)
    assert_equal([12, 17.5], i.shift)
    assert_equal([[12,0,0],[14,3,0.5]], i.shift)
  end
  
  def test_scoring_grid
    init_game(7)
    @sa.start_scoring(@goban, 1.5, nil)
    assert_equal(EMPTY, @goban.stone_at?(1,1).color) # score analyser leaves the goban untouched
    assert_equal(Grid::TERRITORY_COLOR + WHITE, @goban.scoring_grid.yx[1][1]) # a1
    assert_equal(Grid::TERRITORY_COLOR + BLACK, @goban.scoring_grid.yx[6][2]) # b6
  end

  def test_score_info_to_s
    init_game
    @sa.compute_score(@goban, 1.5, nil) # just to make the test succeed (these methods could be private, actually)
    info = [[10,12],[[1,2,3],[4,5,6]]]
    s = @sa.score_info_to_s(info)
    assert_equal("white wins by 2 points", s.shift)
    assert_equal("black (@): 10 points (1 + 2 prisoners + 3 komi)", s.shift)
    assert_equal("white (O): 12 points (4 + 5 prisoners + 6 komi)", s.shift)
    assert_equal(nil, s.shift)
  end
  
  def test_score_diff_to_s
    init_game
    @sa.compute_score(@goban, 1.5, nil) # just to make the test succeed (these methods could be private, actually)
    assert_equal("white wins by 3 points", @sa.score_diff_to_s(-3))
    assert_equal("black wins by 4 points", @sa.score_diff_to_s(4))
    assert_equal("Tie game", @sa.score_diff_to_s(0))
  end
  
end

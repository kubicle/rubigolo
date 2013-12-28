require 'test/unit'

require_relative "../logging"
require_relative "../controller"
require_relative "../score_analyser"


class TestScoreAnalyser < Test::Unit::TestCase

  def initialize(test_name)
    super(test_name)
  end

  def init_game(num_players, size=5)
    c = @controller = Controller.new
    c.new_game(size, num_players, 0)
    @goban = c.goban
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
      @controller.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass")
    end
  end

  def test_compute_score
    init_game(2,7)
    who_resigned = {}
    s = @sa.compute_score(@goban, 1.5, who_resigned)
    assert_equal("white wins by 6.5 points", s.shift)
    assert_equal("black (@): 12 points (12 + 0 prisoners)", s.shift)
    assert_equal("white (O): 18.5 points (14 + 3 prisoners + 1.5 komi)", s.shift)
    assert_equal(nil, s.shift)
    
    # test message when someone resigns
    s = @sa.compute_score(@goban, 1.5, {0 => true})
    assert_equal(["white won (since black resigned)"], s)
    s = @sa.compute_score(@goban, 1.5, {1 => true})
    assert_equal(["black won (since white resigned)"], s)
    init_game(3)
    s = @sa.compute_score(@goban, 1.5, {0 => true}) # nothing changes if only 1/3 resigns
    assert_equal("white wins with 1.5 points", s.shift)
    assert_equal("black resigned", s.shift)
    assert_equal("white (O): 1.5 points (0 + 0 prisoners + 1.5 komi)", s.shift)
    assert_equal("red (X): 0 points (0 + 0 prisoners)", s.shift)
    assert_equal(nil, s.shift)
    s = @sa.compute_score(@goban, 1.5, {0 => true, 1 => true})
    assert_equal(["red won (since others resigned)"], s)
  end

  def test_compute_score_diff
    init_game(2, 7)
    assert_equal(-8.5, @sa.compute_score_diff(@goban, 3.5))
  end
  
  def test_start_scoring
    init_game(2, 7)
    i = @sa.start_scoring(@goban, 0.5, {})
    assert_equal([12, 17.5], i.shift)
    assert_equal([[12,0,0],[14,3,0.5]], i.shift)
  end
  
  def test_end_scoring
    init_game(2,7)
    @sa.start_scoring(@goban, 1.5, {})
    assert_not_equal(EMPTY, @goban.stone_at?(1,1).color)
    @sa.end_scoring
    assert_equal(EMPTY, @goban.stone_at?(1,1).color)
  end

  def test_score_info_to_s
    init_game(2)
    @sa.compute_score(@goban, 1.5, {}) # just to make the test succeed (these methods could be private, actually)
    info = [[10,12],[[1,2,3],[4,5,6]]]
    s = @sa.score_info_to_s(info)
    assert_equal("white wins by 2 points", s.shift)
    assert_equal("black (@): 10 points (1 + 2 prisoners + 3 komi)", s.shift)
    assert_equal("white (O): 12 points (4 + 5 prisoners + 6 komi)", s.shift)
    assert_equal(nil, s.shift)
  end
  
  def test_score_diff_to_s
    init_game(2)
    @sa.compute_score(@goban, 1.5, {}) # just to make the test succeed (these methods could be private, actually)
    assert_equal("white wins by 3 points", @sa.score_diff_to_s(-3))
    assert_equal("black wins by 4 points", @sa.score_diff_to_s(4))
    assert_equal("Tie game", @sa.score_diff_to_s(0))
  end
  
  def test_score_winner_to_s
    init_game(4)
    @sa.compute_score(@goban, 1.5, {}) # just to make the test succeed (these methods could be private, actually)
    assert_equal("white wins by 2 points", @sa.score_winner_to_s([3,5]))
    assert_equal("black wins by 1 point", @sa.score_winner_to_s([3,2]))
    assert_equal("red wins with 7 points", @sa.score_winner_to_s([3,5,7]))
    # tie games
    assert_equal("Tie game", @sa.score_winner_to_s([3,3]))
    assert_equal("Tie between black & red, both with 3 points", @sa.score_winner_to_s([3,1,3]))
    assert_equal("Tie between black & white & red & blue, all with 4 points", @sa.score_winner_to_s([4,4,4,4]))
  end

end

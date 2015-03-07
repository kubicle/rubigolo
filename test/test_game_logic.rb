require 'test/unit'

require_relative "../logging"
require_relative "../game_logic"

# TODO: very incomplete test
class TestGameLogic < Test::Unit::TestCase

  def init_board(size=5, handicap=0)
    @game = GameLogic.new
    @game.new_game(size, handicap)
    @goban = @game.goban
  end

  def initialize(test_name)
    super(test_name)
    init_board()
  end

  # 3 ways to load the same game with handicap...
  def test_handicap
    game6 = "(;FF[4]KM[0.5]SZ[19]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq])"
    @game.load_moves(game6)
    img = @goban.image?
    @game.new_game(19,6)
    @game.load_moves("f3")
    assert_equal(img, @goban.image?)
    # @game.goban.console_display
    @game.new_game(19,0)
    @game.load_moves("hand:6,f3")
    assert_equal(img, @goban.image?)
  end
  
end
require 'test/unit'

require_relative "../logging"
require_relative "../game_logic"
require_relative "../ai1_player"

# NB: for debugging think of using @goban.debug_display


class TestAi < Test::Unit::TestCase

  def init_board(size=9, num_players=2, handicap=0)
    @game = GameLogic.new
    @game.new_game(size, num_players, handicap)
    @goban = @game.goban
    @players = [Ai1Player.new(@goban, BLACK), Ai1Player.new(@goban, WHITE)]
  end

  def initialize(test_name)
    super(test_name)
    init_board()
  end

  # old method; rather use play_and_check below
  def let_ai_play
    $log.debug("Letting AI play...") if $debug
    player = @players[@game.cur_color]
    move = player.get_move
    @game.play_one_move(move)
    return move
  end
  
  def check_eval(move,color,exp_eval)
    i,j = Goban.parse_move(move)
    assert_in_delta(@players[color].eval_move(i,j), exp_eval+0.5, 0.5)
  end

  def play_and_check(exp_move,exp_color,exp_eval=nil)
    $log.debug("Letting AI play...") if $debug
    player = @players[@game.cur_color]
    throw "Wrong player turn: #{@goban.color_name(player.color)} to play now" if exp_color!=player.color
    move = player.get_move
    assert_equal(exp_move, move)
    assert_in_delta(player.last_move_score, exp_eval+0.5, 0.5) if exp_eval
    @game.play_one_move(move)
  end

  def test_cornering
    # 9 ++++++++O
    # 8 ++++++++@
    # 7 +++@+++++
    # 6 +++++++++
    # 5 ++O++++++
    # 4 +++++++++
    #   abcdefghi
    @game.load_moves("i8,i9,d7,c5")
    play_and_check("h9",BLACK,1) # FIXME: h8 is better than killing in h9 (non trivial)
  end

  def test_pre_atari
    # 5 +++++++++
    # 4 +@@@@O+++
    # 3 ++O@O@O++
    # 2 ++O@O@+++
    # 1 +++OO++++
    #   abcdefghi
    # f3-f2 can be saved in g2
    # Hunter should not attack in c1 since c1 would be in atari
    @game.load_moves("d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1")
    check_eval("c1",BLACK,0)
    play_and_check("g2",BLACK,2)
  end

  def test_hunter_1
    # h7 is a wrong "good move"; white can escape with h8
    # 9 ++++++++O
    # 8 ++++++++@
    # 7 ++++++++O
    # 6 ++++++++O
    # 5 ++++++++@
    # 4 +++@++++@
    #   abcdefghi
    @game.load_moves("d4,i7,i8,i6,i5,i9,i4,pass,h8,pass")
    play_and_check("h6", BLACK, 2) # h7 ladder was OK too here but capturing same 2 stones in a ladder
    # the choice between h6 and h7 is decided by smaller differences like distance to corner, etc.
    @game.load_moves("h7")
    play_and_check("g7", BLACK, 3)
  end

  def test_ladder
    # 9 O+++++++@
    # 8 ++++++++@
    # 7 ++++++++O
    # 6 ++++++++O
    # 5 ++++++++@
    # 4 ++++++++@
    #   abcdefghi
    @game.load_moves("i9,i7,i8,i6,i5,a9,i4,pass")
    play_and_check("h7", BLACK, 2)
    @game.load_moves("h6")
    play_and_check("g6", BLACK, 3)
    @game.load_moves("h5")
    play_and_check("h4", BLACK, 6) # 6 because i4-i5 black group is now also threatened
    @game.load_moves("g5")
    play_and_check("f5", BLACK, 5)
  end

  def test_ladder_breaker1
    # 9 O++++++++
    # 8 O++++++++
    # 7 O+++O++++
    # 6 +++++++++
    # 5 @OO@+++++
    # 4 @@@@+++++
    #   abcdefghi
    # Ladder breaker a7 does not work since the whole group dies
    @game.load_moves("a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5")
    play_and_check("c6",BLACK,2)
  end

  def test_ladder_breaker2
    # 9 O++++++++
    # 8 OOO++++++
    # 7 O+++O++++
    # 6 +++++++++
    # 5 @OO@+++++
    # 4 @@@@+++++
    #   abcdefghi
    # Ladder breaker are a7 and e7
    # What is sure is that neither b6 nor c6 works. However b6 is boosted by pusher
    @game.load_moves("a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8")
    check_eval("c6",BLACK,0)
    play_and_check("b6",BLACK,0)
  end

  def test_see_dead_group
    # 9 +@++@@@@O
    # 8 +@@@@@@OO
    # 7 @@+@+@@O+
    # 6 +@+@++@O+
    # 5 +@+@@+@O+
    # 4 @@@+++@OO
    # 3 @OO@@@@O+
    # 2 OO+OOO@OO
    # 1 ++O@@@@O+
    #   abcdefghi
    # Interesting here: SW corner group O (white) is dead. Both sides should see it and play accordingly.
    @game.load_moves("d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,i3,h3,f1,i2,e1,i4,d1,a2,a4,h1,c8,i8,f8,i9,g9")
    play_and_check("pass", WHITE)
    play_and_check("c2", BLACK, 2) # TODO: optim here would be @ realizing O group is dead
    play_and_check("d2", WHITE, 1)
    play_and_check("e2", BLACK, 1)
    play_and_check("pass", WHITE)
    play_and_check("pass", BLACK)
    # @goban.debug_display
  end
  
  def test_border_defense
    init_board(7)
    # 7 +++++++
    # 6 +++@@@+
    # 5 @++@OO+
    # 4 O@@@O@+
    # 3 OOOO+O+
    # 2 ++O@O++
    # 1 +++++++
    #   abcdefg
    # Issue: after W:a3 we expect B:b5 or b6 but AI does not see attack in b5; 
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3")
    check_eval("g5",BLACK,0) #no stone to kill for black in g5
    #check_eval("b6",BLACK,1) #FIXME how? black to see he can save a5 in b6 too
    play_and_check("b5",BLACK,1)
  end

  def test_border_attack_and_invasion
    init_board(7)
    # 7 +++++++
    # 6 +++@@@@
    # 5 @*+@OO@
    # 4 O@@@O+O
    # 3 OOOO+O+
    # 2 ++O+O++
    # 1 +++O+++
    #   abcdefg
    # AI should see attack in b5 with territory invasion
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass")
    play_and_check("b5", WHITE, 1) # TODO: see gain is bigger because of invasion
  end

  def test_border_attack_and_invasion2
    init_board(7)
    # 7 +++++++
    # 6 +++@@@@
    # 5 @*+@OO+
    # 4 O@@@O@+
    # 3 OOOO+O+
    # 2 ++O@O++
    # 1 +++++++
    #   abcdefg
    # AI should see attack in b5 with territory invasion.
    # Actually O in g4 is chosen because pusher gives it 0.33 pts.
    # NB: g4 is actually a valid move for black
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6")
    play_and_check("g4", WHITE, 1) # FIXME white (O) move should be b5 here
  end

  def test_border_closing
    init_board(7)
    # 7 +++++++
    # 6 +@+@@@@
    # 5 @++@OO+
    # 4 O@@@O@+
    # 3 OOOO+O+
    # 2 ++O+O++
    # 1 +++O+++
    #   abcdefg
    # AI should see f4 is dead inside white territory if g5 is played (non trivial)
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g6")
    play_and_check("g4", WHITE, 1) # FIXME white (O) move should be g5 here
  end

  def test_savior_hunter
    init_board(7)
    # 7 +++++++
    # 6 +++@@@@
    # 5 @@+@OO+
    # 4 O+@@O@+
    # 3 OOOO+O+
    # 2 ++O@O++
    # 1 +++++++
    #   abcdefg
    # g4 is actually a valid move for black
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass")
    play_and_check("g4", BLACK, 1) # black (@) move should be g4 here
    # assert_equal("g3", let_ai_play) # FIXME: (O) move should be g3 here (since d2 is already dead)
  end

  def test_killing_saves_nearby_group_in_atari
    init_board(7)
    # 7 +++++++
    # 6 +@+@@@+
    # 5 @++@OO@
    # 4 O@@@O@+
    # 3 OOOO+O+
    # 2 ++O+O++
    # 1 +++O+++
    #   abcdefg
    @game.load_moves("d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5")
    check_eval("e3",WHITE,3)
    play_and_check("g4",WHITE,4)
    play_and_check("g6",BLACK,1)
    play_and_check("pass",WHITE)
    play_and_check("pass",BLACK)
  end
  
  def test_snapback
    init_board(5)
    # 5 O@+O+
    # 4 O@*@@
    # 3 OO@++
    # 2 ++@++
    # 1 +++++
    #   abcde
    # c4 expected for white, then if c5, c4 again (snapback)
    @game.load_moves("b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4")
    play_and_check("c4", WHITE, 1) # FIXME: it should be 2
    @game.play_one_move("c5")
    play_and_check("c4", WHITE, 4) # 3 taken & 1 saved = 4
  end

  def test_snapback2
    init_board(7)
    # 7 O@+OO++
    # 6 O@+@@++
    # 4 OO@@+++
    # 4 +@@++++
    # 3 ++++O++
    #   abcdefg
    # Snapback is bad idea since a2 can kill white group
    @game.load_moves("b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6")
    play_and_check("f7", WHITE, 2) # FIXME white should see d7-e7 are dead (territory detection)
    play_and_check("a4", BLACK, 4)
  end
  
  def test_snapback3
    init_board(5)
    # 5 O@+OO
    # 4 O@O@+
    # 3 OO@@+
    # 2 ++@++
    # 1 ++@++
    #   abcde
    # 
    @game.load_moves("b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4")
    # @goban.debug_display
    play_and_check("c5", BLACK, 0) # FIXME: should NOT be c5 (count should be -1)
  end

  def test_sees_attack_no_good
    init_board(5)
    # 5 O@@OO
    # 4 O@+@+
    # 3 OO@@+
    # 2 ++@++
    # 1 ++@++
    #   abcde
    # NB: we could use this game to check when AI can see dead groups
    @game.load_moves("b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5")
    play_and_check("c4", WHITE, 5) # kills 3 and saves 2
    check_eval("c5", BLACK, 0) # silly move
  end

end

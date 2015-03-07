require_relative "goban"
require_relative "sgf_reader"
require_relative "handicap_setter"

# GameLogic enforces the game logic.
class GameLogic
  attr_reader :goban, :komi, :cur_color, :game_ended, :game_ending, :who_resigned
  
  def initialize
    @console = false
    @history = []
    @errors = []
    @handicap = 0
    @who_resigned = nil
    @goban = nil
  end

  def new_game(size=nil, handicap=@handicap, komi=nil)
    @history.clear
    @errors.clear
    @num_pass = 0
    @cur_color = BLACK
    @game_ended = @game_ending = false
    @who_resigned = nil
    if ! @goban or ( size and size != @goban.size )
      @goban = Goban.new(size)
    else
      @goban.clear
    end
    @komi = (komi ? komi : (handicap == 0 ? 6.5 : 0.5))
    set_handicap(handicap)
  end
  
  # Initializes the handicap points
  # h can be a number or a string
  # string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
  def set_handicap(h)
    raise "Handicap cannot be changed during a game" if @history.size > 0
    @handicap = HandicapSetter.set_handicap(@goban, h)
    # White first when handicap
    @cur_color = WHITE if @handicap != 0
    return true
  end

  # game is a series of moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
  def load_moves(game)
    begin
      game = sgf_to_game(game)
      game.split(",").each do |move|
        if !play_one_move(move) then raise "Failed playing the loaded move: #{move}" end
      end
      return true
    rescue => err
      error_msg "Failed loading moves. Please double check the format of your input."
      error_msg "Error: #{err.message} (#{err.class.name})"
      $log.error("Error while loading moves:\n#{err}\n#{err.backtrace}")
      return false
    end
  end

  # Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
  # Returns false if a problem occured. In this case the error message is available.
  def play_one_move(move)
    if @game_ended then return error_msg("Game already ended") end
    # $log.debug("GameLogic playing #{Grid.color_name(@cur_color)}: #{move}") if $debug
    if /^[a-z][1-2]?[0-9]$/ === move
      return play_a_stone(move)
    elsif move == "undo"
      return request_undo
    elsif move.start_with?("resi")
      return resign
    elsif move == "pass"
      return pass_one_move
    elsif move.start_with?("hand")
      return set_handicap(move.split(":")[1])
    elsif move.start_with?("load:")
      return load_moves(move[5..-1])
    elsif move.start_with?("log")
      return set_log_level(move.split(":")[1])
    else
      return error_msg "Invalid command: #{move}"
    end
  end

  # Handles a new stone move (not special commands like "pass")
  def play_a_stone(move)
    i, j = Grid.parse_move(move)
    if !Stone.valid_move?(@goban, i, j, @cur_color) then return error_msg("Invalid move: #{move}") end
    Stone.play_at(@goban, i, j, @cur_color)
    store_move_in_history(move)
    next_player!
    @num_pass = 0
    return true
  end
  
  # One player resigns.
  def resign
    store_move_in_history("resign")
    @who_resigned = @cur_color
    @game_ended = true
    return true
  end

  # Call this when the current player wants to pass.
  # If all (remaining) players pass, we go into "ending mode".
  # Caller is responsible of checking the GameLogic#game_ending flag:
  # If the flag goes to true, the method accept_ending (below) should be called next.
  def pass_one_move
    store_move_in_history("pass")
    @num_pass += 1
    @game_ending = true if @num_pass >= 2
    next_player!
    return true
  end
  
  # Call this each time GameLogic#game_ending goes to true (ending mode).
  # The score should be counted and proposed to players.
  # "accept" parameter should be true if all players accept the proposed ending (score count).
  # Only after this call will the game be really finished.
  # If accept=false, this means a player refuses to end here
  # => the game should continue until the next time all players pass.
  def accept_ending(accept)
    return error_msg "The game is not ending yet" if !@game_ending
    if !accept
      @game_ending = false # exit ending mode; we will play some more...
    else
      @game_ended = true # ending accepted. Game is finished.
    end
    return true
  end

  # Returns how many moves have been played so far
  # (can be bigger than the stone count since "pass" or "resign" are also moves)
  def move_number?
    return @history.size
  end

  # Returns a text representation of the list of moves played so far
  def history_string
    return (@handicap>0 ? "handicap:#{@handicap}," : "") +
      @history.join(",") +
      " (#{@history.size} moves)"
  end

  # Returns an array with the prisoner count per color
  # e.g. [3,5] means 3 black stones are prisoners, 5 white stones
  def prisoners?
    return Group.prisoners?(@goban)
  end
  
  # If called with on=true, error messages will be directly displayed on the console.
  # If not called, the default behavior needs the caller to use get_errors method.
  def messages_to_console(on=true)
    @console = on
  end

  # Returns the error messages noticed until now and clears the list.
  def get_errors
    errors = @errors.clone
    @errors.clear
    return errors
  end
  
  def set_log_level(cmd)
    begin
      a = cmd.split("=")
      flag = a[1].to_i != 0
      raise 0 if ! flag and a[1]!="0"
      case a[0]
      when "group" then $debug_group = flag
      when "ai" then $debug_ai = flag
      when "all" then $debug = $debug_group = $debug_ai = flag
      else raise 1
      end
      return true
    rescue
      return error_msg "Invalid log command: #{cmd}"
    end
  end

#===============================================================================
private
#===============================================================================

  def next_player!
    @cur_color = (@cur_color+1) % 2
  end

  # Always returns false
  def error_msg(msg)
    if ! @console then @errors.push(msg) else puts msg end
    return false
  end

  def store_move_in_history(move)
    @history.push(move)
  end
  
  # undo one full game turn (e.g. one black move and one white)
  def request_undo
    if @history.size < 2
      return error_msg "Nothing to undo"
    end
    2.times do
      Stone.undo(@goban) if ! @history.last.end_with?("pass") # no stone to remove for a pass
      @history.pop
    end
    @num_pass = 0
    return true
  end

  # Converts a game (list of moves) from SGF format to our internal format.
  # Returns the game unchanged if it is not an SGF one.
  # Returns an empty move list if nothing should be played (a game is pending).
  def sgf_to_game(game)
    return game if ! game.start_with?("(;FF") # are they are always the 1st characters?
    reader = SgfReader.new(game)
    new_game(reader.board_size, reader.handicap)
    @komi = reader.komi
    return reader.to_move_list
  end
  
end

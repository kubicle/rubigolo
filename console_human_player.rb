require_relative "player"

class ConsoleHumanPlayer < Player

  def initialize(goban, color)
    super(true, goban)
    set_color(color)
    @debug_ai = nil
  end
  
  def get_move(color=@color)
    @goban.console_display
    puts "What is #{Grid::COLOR_NAMES[color]}/#{Grid::COLOR_CHARS[color]} move? (or 'help')"
    return get_answer
  end

  def attach_debug_ai(ai)
    @debug_ai = ai
  end

  def get_ai_eval(i,j)
    if @debug_ai
      @debug_ai.prepare_eval
      score = @debug_ai.eval_move(i,j)
      $log.debug("==> AI would rank this move (#{i},#{j}) as #{score}")
    end
  end

  def propose_score
    puts "Do you accept this score? (y/n)"
    return get_answer(["y","n"]) == "y"
  end

private

  def get_answer(valid_ones=nil)
    while true do
      answer = gets.downcase.strip
      next if answer == ""
      if valid_ones and ! valid_ones.find_index(answer)
        puts "Valid answers: "+valid_ones.join(",")
        next
      end
      return answer
    end
  end
  
end

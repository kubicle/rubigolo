require_relative "board_analyser"

class ScoreAnalyser

  def initialize
    @goban = nil
    @analyser = BoardAnalyser.new
  end

  # Compute simple score difference for a AI-AI game (score info not needed)
  def compute_score_diff(goban, komi)
    @analyser.count_score(goban)
    scores = @analyser.scores
    prisoners = @analyser.prisoners
    b = scores[BLACK] + prisoners[WHITE]
    w = scores[WHITE] + prisoners[BLACK] + komi
    return b - w
  end
  
  # Returns score info as an array of strings
  def compute_score(goban, komi, who_resigned)
    start_scoring(goban, komi, who_resigned)
    txt = score_info_to_s(@score_info)
    return txt
  end

  # Initialize scoring phase
  def start_scoring(goban, komi, who_resigned)
    @goban = goban
    if who_resigned
      winner = Grid::COLOR_NAMES[1-who_resigned]
      other = Grid::COLOR_NAMES[who_resigned]
      @score_info = "#{winner} won (since #{other} resigned)"
      return
    end
    @analyser.count_score(goban)
    scores = @analyser.scores
    prisoners = @analyser.prisoners
    totals = []
    details = []
    add_pris = true
    2.times do |c|
      kom = (c == WHITE ? komi : 0)
      pris = (add_pris ? prisoners[1 - c] : -prisoners[c])
      totals[c] = scores[c] + pris + kom
      details[c] = [scores[c], pris, kom]
    end
    @score_info = [totals, details]
  end
  
  def get_score
    return score_info_to_s(@score_info)
  end

  def score_info_to_s(info)
    return [info] if info.is_a?(String) # for games where all but 1 resigned
    raise "Invalid score info: #{info}" if !info or info.size!=2
    totals = info[0]
    details = info[1]
    raise "Invalid score info" if totals.size!=details.size
    s = []
    s.push(score_winner_to_s(totals))
    2.times do |c|
      detail = details[c]
      if detail == nil
        s.push("#{Grid.color_name(c)} resigned")
        next
      end
      raise "Invalid score details" if detail.size!=3
      score = detail[0]
      pris = detail[1]
      komi = detail[2]
      komi_str = (komi > 0 ? " + #{komi} komi" : "")
      s.push("#{Grid.color_name(c)} (#{Grid::COLOR_CHARS[c]}): "+
          "#{pts(totals[c])} (#{score} #{pris<0 ? '-' : '+'} #{pris.abs} prisoners#{komi_str})")
    end
    return s
  end
  
  def score_diff_to_s(diff)
    if diff != 0
      win = if diff > 0 then BLACK else WHITE end
      return "#{Grid.color_name(win)} wins by #{pts(diff.abs)}"
    else
      return "Tie game"
    end
  end
  
  def score_winner_to_s(totals)
    if totals.size == 2
      diff = totals[0] - totals[1]
      return score_diff_to_s(diff)
    else
      max = totals.max
      winners = []
      totals.size.times { |c| winners.push(c) if totals[c]==max }
      if winners.size == 1
        return "#{Grid.color_name(winners[0])} wins with #{pts(max)}"
      else
        return "Tie between " +
          winners.map{|w| "#{Grid.color_name(w)}"}.join(" & ") +
          ", #{winners.size==2 ? 'both' : 'all'} with #{pts(max)}"
      end
    end
  end

private
  
  def pts(n)
    return n!=1 ? "#{n} points" : "1 point"
  end

end

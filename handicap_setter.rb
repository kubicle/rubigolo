
class HandicapSetter

  # Initializes the handicap points
  # h can be a number or a string
  # string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
  # Returns the handicap actual count
  def HandicapSetter.set_handicap(goban, h)
    return 0 if h == 0 or h == "0"

    # Standard handicap?
    if h.is_a? String
      eq = h.index("=")
      h = h.to_i if h[0].between?("0","9") and ! eq
    end
    if h.is_a? Fixnum # e.g. 3
      return HandicapSetter.set_standard_handicap(goban, h)
    end

    # Could be standard or not but we are given the stones so use them   
    h = h[eq+1..-1] if eq # "3=d4-p16-p4" would become "d4-p16-p4"
    moves = h.split("-")
    moves.each do |move|
      i, j = Grid.parse_move(move)
      Stone.play_at(goban, i, j, BLACK)
    end
    return moves.size
  end
  
  # Places the standard (star points) handicap
  #   count: requested handicap
  # NB: a handicap of 1 stone does not make sense but we don't really need to care.
  # Returns the handicap actual count (if board is too small it can be smaller than count)
  def HandicapSetter.set_standard_handicap(goban, count)
    # we want middle points only if the board is big enough 
    # and has an odd number of intersections
    size = goban.size
    count = 4 if (size<9 or size.modulo(2)==0) and count > 4
    # Compute the distance from the handicap points to the border:
    # on boards smaller than 13, the handicap point is 2 points away from the border
    dist_to_border=(size<13 ? 2 : 3)
    short = 1 + dist_to_border
    middle = 1 + size/2
    long = size - dist_to_border
    
    count.times do |ndx|
      # Compute coordinates from the index.
      # Indexes correspond to this map (with Black playing on North on the board)
      # 2 7 1
      # 4 8 5
      # 0 6 3
      # special case: for odd numbers and more than 4 stones, the center is picked
      ndx=8 if count.modulo(2)==1 and count>4 and ndx==count-1
      case ndx
      	when 0 then x = short; y = short
      	when 1 then x = long; y = long
      	when 2 then x = short; y = long
      	when 3 then x = long; y = short
      	when 4 then x = short; y = middle
      	when 5 then x = long; y = middle
      	when 6 then x = middle; y = short
      	when 7 then x = middle; y = long
      	when 8 then x = middle; y = middle
      	else break # not more than 8
      end
      Stone.play_at(goban, x, y, BLACK)
    end
    return count
  end

end

# When creating a new heuristic, remember to add it here.

require_relative "spacer"
require_relative "executioner"
require_relative "savior"
require_relative "hunter"
require_relative "connector"
require_relative "pusher"
require_relative "no_easy_prisoner"

class Heuristic
  def Heuristic.all_heuristics
    return [Spacer, Executioner, Savior, Hunter, Connector, Pusher, NoEasyPrisoner]
  end
end

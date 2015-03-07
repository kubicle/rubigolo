#require "logger"

class Logger

  ERROR = 3
  WARNING = 2
  INFO = 1
  DEBUG = 0

  attr_reader(:level)
  attr_writer(:level)

  def initialize(stream)
    @level = INFO
  end

  def error(msg)
    puts "ERROR: " + msg
  end

  def warn(msg)
    puts "WARN: " + msg
  end

  def debug(msg)
    puts msg
  end
end

$log = Logger.new(STDOUT)


# change $log.level to Logger::DEBUG, etc. as you need
$log.level=Logger::DEBUG

# change $debug to true to see all the debug logs
# NB: note this slows down everything if $debug is true even if the log level is not DEBUG
$debug = true
$debug_group = false
